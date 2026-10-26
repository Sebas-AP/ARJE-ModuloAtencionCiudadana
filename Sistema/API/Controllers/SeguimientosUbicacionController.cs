using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.DTOs.SeguimientoUbicacion;
using ARJE.Api.Utilidades;
using ARJE.Api.Servicios;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/reportes/{idReporte:int}/ubicaciones")]
[Authorize]
public class SeguimientosUbicacionController : ControllerBase
{
    private const int MaximoMuestrasPorLote = 200;
    private static readonly TimeSpan ToleranciaReloj = TimeSpan.FromSeconds(120);

    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IOutputCacheStore _outputCacheStore;
    private readonly FieldOperationPolicy _fieldOperationPolicy = new();
    private readonly TimeProvider _timeProvider;
    private readonly IUbicacionesPublisher? _ubicacionesPublisher;

    public SeguimientosUbicacionController(
        ApplicationDbContext context,
        IMapper mapper,
        IOutputCacheStore outputCacheStore,
        TimeProvider? timeProvider = null,
        IUbicacionesPublisher? ubicacionesPublisher = null)
    {
        _context = context;
        _mapper = mapper;
        _outputCacheStore = outputCacheStore;
        _timeProvider = timeProvider ?? TimeProvider.System;
        _ubicacionesPublisher = ubicacionesPublisher;
    }

    [HttpPost]
    public async Task<ActionResult> Post(int idReporte, [FromBody] SeguimientoUbicacionBatchDTO batchDTO)
    {
        var reporte = await _context.Reportes.FindAsync(idReporte);
        if (reporte == null)
        {
            return NotFound("Reporte no encontrado");
        }

        if (_fieldOperationPolicy.IsCuadrilla(User) && !_fieldOperationPolicy.CanAccessAssignedReport(reporte, User))
        {
            return Forbid();
        }

        if (reporte.Estatus != EstatusReporte.LevantandoInformacion && reporte.Estatus != EstatusReporte.EnProceso)
        {
            return BadRequest("Solo se puede registrar ubicación cuando el reporte está en proceso");
        }

        if (!reporte.IdCuadrillaAsignada.HasValue)
        {
            return BadRequest("El reporte no tiene cuadrilla asignada");
        }

        var ahora = _timeProvider.GetUtcNow().UtcDateTime;
        var error = ValidarLote(batchDTO, ahora);
        if (error != null)
        {
            return BadRequest(new { mensaje = error });
        }

        var idCuadrilla = reporte.IdCuadrillaAsignada.Value;
        var pendientes = ConstruirMuestras(batchDTO.Ubicaciones, idReporte, idCuadrilla, ahora);

        var duplicadoEnLote = BuscarDuplicadoEnLote(pendientes);
        if (duplicadoEnLote != null)
        {
            return Conflict(new { mensaje = duplicadoEnLote });
        }

        var insertadas = new List<SeguimientoUbicacion>();
        for (var intento = 0; intento < 2; intento++)
        {
            var existentes = await CargarExistentesAsync(idCuadrilla, pendientes);
            var conflicto = pendientes
                .Select(muestra => new { muestra, existente = BuscarPorIdMuestra(existentes, muestra.IdMuestra) })
                .FirstOrDefault(x => x.existente != null && !MismoContenido(x.existente, x.muestra));
            if (conflicto != null)
            {
                return Conflict(new { mensaje = "El idMuestra ya fue utilizado con otro contenido o reporte" });
            }

            var nuevas = pendientes
                .Where(muestra => muestra.IdMuestra == null || BuscarPorIdMuestra(existentes, muestra.IdMuestra) == null)
                .ToList();

            if (nuevas.Count == 0)
            {
                return Ok(new { mensaje = $"{pendientes.Count} ubicaciones registradas" });
            }

            insertadas = nuevas;
            _context.SeguimientosUbicacion.AddRange(nuevas);
            try
            {
                await _context.SaveChangesAsync();
                break;
            }
            catch (DbUpdateException ex) when (EsViolacionUnica(ex))
            {
                foreach (var muestra in nuevas)
                {
                    _context.Entry(muestra).State = EntityState.Detached;
                }

                if (intento == 1)
                {
                    var persistidas = await CargarExistentesAsync(idCuadrilla, pendientes);
                    var todasConfirmadas = pendientes.All(muestra =>
                        MismoContenido(BuscarPorIdMuestra(persistidas, muestra.IdMuestra), muestra));
                    if (!todasConfirmadas)
                    {
                        return Conflict(new { mensaje = "No se pudo confirmar el reintento de ubicaciones" });
                    }
                }
            }
        }

        await _outputCacheStore.EvictByTagAsync("ubicaciones", default);

        if (_ubicacionesPublisher != null)
        {
            try
            {
                await _ubicacionesPublisher.PublicarUltimaAsync(idCuadrilla, HttpContext.RequestAborted);
            }
            catch (OperationCanceledException) when (HttpContext.RequestAborted.IsCancellationRequested)
            {
            }
            catch
            {
                // La persistencia ya se confirmó; REST permite recuperar una emisión perdida.
            }
        }

        return Ok(new { mensaje = $"{pendientes.Count} ubicaciones registradas" });
    }

    [HttpGet]
    [OutputCache(Tags = new[] { "ubicaciones" })]
    public async Task<ActionResult<List<SeguimientoUbicacionDTO>>> Get(int idReporte, [FromQuery] int pagina = 1, [FromQuery] int registrosPorPagina = 50)
    {
        var reporte = await _context.Reportes.FindAsync(idReporte);
        if (reporte == null)
        {
            return NotFound();
        }

        if (_fieldOperationPolicy.IsCuadrilla(User) && !_fieldOperationPolicy.CanAccessAssignedReport(reporte, User))
        {
            return Forbid();
        }

        var queryable = _context.SeguimientosUbicacion
            .Include(s => s.Cuadrilla)
            .Where(s => s.IdReporte == idReporte)
            .OrderByDescending(s => s.FechaHora)
            .ThenByDescending(s => s.Id);

        var totalRegistros = await queryable.CountAsync();
        HttpContext.AgregarHeaderCantidadTotalRegistros(totalRegistros);

        var seguimientos = await queryable.Paginar(pagina, registrosPorPagina).ToListAsync();
        var dtos = _mapper.Map<List<SeguimientoUbicacionDTO>>(seguimientos);
        return Ok(dtos);
    }

    [HttpGet("ultima")]
    [OutputCache(Tags = new[] { "ubicaciones" })]
    public async Task<ActionResult<SeguimientoUbicacionDTO>> GetUltima(int idReporte)
    {
        var reporte = await _context.Reportes.FindAsync(idReporte);
        if (reporte == null)
        {
            return NotFound();
        }

        if (_fieldOperationPolicy.IsCuadrilla(User) && !_fieldOperationPolicy.CanAccessAssignedReport(reporte, User))
        {
            return Forbid();
        }

        var ultima = await _context.SeguimientosUbicacion
            .Include(s => s.Cuadrilla)
            .Where(s => s.IdReporte == idReporte)
            .OrderByDescending(s => s.FechaHora)
            .ThenByDescending(s => s.Id)
            .FirstOrDefaultAsync();

        if (ultima == null)
        {
            return NotFound();
        }

        var dto = _mapper.Map<SeguimientoUbicacionDTO>(ultima);
        return Ok(dto);
    }

    private static string? ValidarLote(SeguimientoUbicacionBatchDTO batch, DateTime ahora)
    {
        if (batch?.Ubicaciones == null || batch.Ubicaciones.Count == 0)
        {
            return "El lote debe contener al menos una ubicación";
        }

        if (batch.Ubicaciones.Count > MaximoMuestrasPorLote)
        {
            return $"El lote no puede contener más de {MaximoMuestrasPorLote} ubicaciones";
        }

        for (var i = 0; i < batch.Ubicaciones.Count; i++)
        {
            var muestra = batch.Ubicaciones[i];
            if (muestra == null)
            {
                return $"La ubicación {i + 1} es inválida";
            }

            if (muestra.Latitud < -90 || muestra.Latitud > 90)
            {
                return $"La latitud de la ubicación {i + 1} está fuera de rango";
            }

            if (muestra.Longitud < -180 || muestra.Longitud > 180)
            {
                return $"La longitud de la ubicación {i + 1} está fuera de rango";
            }

            if (muestra.PrecisionMetros.HasValue &&
                (!double.IsFinite(muestra.PrecisionMetros.Value) || muestra.PrecisionMetros.Value < 0))
            {
                return $"La precisión de la ubicación {i + 1} es inválida";
            }

            var tieneId = muestra.IdMuestra != null;
            var tieneFecha = muestra.FechaCaptura.HasValue;
            if (tieneId != tieneFecha)
            {
                return "idMuestra y fechaCaptura deben enviarse juntos o ambos omitirse";
            }

            if (!tieneId)
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(muestra.IdMuestra))
            {
                return $"El idMuestra de la ubicación {i + 1} es inválido";
            }

            if (muestra.IdMuestra.Trim().Length > 100)
            {
                return $"El idMuestra de la ubicación {i + 1} excede 100 caracteres";
            }

            var fecha = muestra.FechaCaptura!.Value;
            if (fecha.Kind != DateTimeKind.Utc)
            {
                return $"La fechaCaptura de la ubicación {i + 1} debe estar en UTC";
            }

            if (fecha < DateTime.UnixEpoch)
            {
                return $"La fechaCaptura de la ubicación {i + 1} es anterior al epoch";
            }

            if (fecha > ahora.Add(ToleranciaReloj))
            {
                return $"La fechaCaptura de la ubicación {i + 1} excede la tolerancia de reloj";
            }
        }

        return null;
    }

    private static List<SeguimientoUbicacion> ConstruirMuestras(
        List<SeguimientoUbicacionCreacionDTO> ubicaciones,
        int idReporte,
        int idCuadrilla,
        DateTime ahora)
    {
        var muestras = new List<SeguimientoUbicacion>(ubicaciones.Count);
        foreach (var muestra in ubicaciones)
        {
            var fechaCaptura = muestra.FechaCaptura?.ToUniversalTime() ?? ahora;
            muestras.Add(new SeguimientoUbicacion
            {
                IdReporte = idReporte,
                IdCuadrilla = idCuadrilla,
                Latitud = muestra.Latitud,
                Longitud = muestra.Longitud,
                FechaHora = fechaCaptura,
                FechaRecepcion = ahora,
                IdMuestra = muestra.IdMuestra?.Trim(),
                PrecisionMetros = muestra.PrecisionMetros
            });
        }

        return muestras;
    }

    private static string? BuscarDuplicadoEnLote(List<SeguimientoUbicacion> muestras)
    {
        var vistos = new Dictionary<string, SeguimientoUbicacion>(StringComparer.Ordinal);
        foreach (var muestra in muestras.Where(m => m.IdMuestra != null))
        {
            var id = muestra.IdMuestra!;
            if (vistos.TryGetValue(id, out var anterior))
            {
                if (!MismoContenido(anterior, muestra))
                {
                    return "El lote contiene el mismo idMuestra con contenido distinto";
                }

                continue;
            }

            vistos[id] = muestra;
        }

        return null;
    }

    private async Task<List<SeguimientoUbicacion>> CargarExistentesAsync(
        int idCuadrilla,
        List<SeguimientoUbicacion> muestras)
    {
        var ids = muestras
            .Where(m => m.IdMuestra != null)
            .Select(m => m.IdMuestra!)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (ids.Count == 0)
        {
            return new List<SeguimientoUbicacion>();
        }

        return await _context.SeguimientosUbicacion
            .AsNoTracking()
            .Where(s => s.IdCuadrilla == idCuadrilla && s.IdMuestra != null && ids.Contains(s.IdMuestra))
            .ToListAsync();
    }

    private static SeguimientoUbicacion? BuscarPorIdMuestra(
        List<SeguimientoUbicacion> existentes,
        string? idMuestra)
    {
        return idMuestra == null
            ? null
            : existentes.FirstOrDefault(s => string.Equals(s.IdMuestra, idMuestra, StringComparison.Ordinal));
    }

    private static bool MismoContenido(SeguimientoUbicacion? existente, SeguimientoUbicacion muestra)
    {
        return existente != null &&
               existente.IdReporte == muestra.IdReporte &&
               existente.Latitud == muestra.Latitud &&
               existente.Longitud == muestra.Longitud &&
               existente.FechaHora == muestra.FechaHora &&
               existente.PrecisionMetros == muestra.PrecisionMetros;
    }

    private static bool EsViolacionUnica(DbUpdateException ex)
    {
        if (ex.InnerException is SqliteException sqlite)
        {
            return sqlite.SqliteErrorCode == 19 &&
                   sqlite.SqliteExtendedErrorCode is 2067 or 1555;
        }

        if (ex.InnerException is Microsoft.Data.SqlClient.SqlException sqlServer)
        {
            return sqlServer.Number is 2601 or 2627;
        }

        return false;
    }
}
