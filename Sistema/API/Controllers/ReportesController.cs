using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.DTOs.Reporte;
using ARJE.Api.DTOs.Evidencia;
using ARJE.Api.Servicios;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Utilidades;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/reportes")]
public class ReportesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IOutputCacheStore _outputCacheStore;
    private readonly IAlmacenadorArchivos _almacenadorArchivos;
    private readonly IClasificadorService _clasificador;
    private const string ContenedorEvidencias = "evidencias";

    public ReportesController(
        ApplicationDbContext context,
        IMapper mapper,
        IOutputCacheStore outputCacheStore,
        IAlmacenadorArchivos almacenadorArchivos,
        IClasificadorService clasificador)
    {
        _context = context;
        _mapper = mapper;
        _outputCacheStore = outputCacheStore;
        _almacenadorArchivos = almacenadorArchivos;
        _clasificador = clasificador;
    }

    [HttpGet]
    [OutputCache(Tags = new[] { "reportes" })]
    public async Task<ActionResult<List<ReporteDTO>>> Get(
        [FromQuery] int pagina = 1,
        [FromQuery] int registrosPorPagina = 10,
        [FromQuery] EstatusReporte? estatus = null,
        [FromQuery] TipoProblema? tipoProblema = null,
        [FromQuery] string? categoria = null,
        [FromQuery] int? idCuadrillaAsignada = null,
        [FromQuery] DateTime? fechaDesde = null,
        [FromQuery] DateTime? fechaHasta = null,
        [FromQuery] string? numeroContrato = null)
    {
        var queryable = _context.Reportes
            .Include(r => r.CuadrillaAsignada)
            .Include(r => r.Evidencias)
            .AsQueryable();

        if (estatus.HasValue)
            queryable = queryable.Where(r => r.Estatus == estatus.Value);

        if (tipoProblema.HasValue)
            queryable = queryable.Where(r => r.TipoProblema == tipoProblema.Value);

        if (!string.IsNullOrWhiteSpace(categoria))
        {
            var cat = categoria.Trim();
            queryable = queryable.Where(r => r.Categoria != null && EF.Functions.Like(r.Categoria, $"%{cat}%"));
        }

        if (idCuadrillaAsignada.HasValue)
            queryable = queryable.Where(r => r.IdCuadrillaAsignada == idCuadrillaAsignada.Value);

        if (fechaDesde.HasValue)
            queryable = queryable.Where(r => r.FechaRecibido >= fechaDesde.Value);

        if (fechaHasta.HasValue)
            queryable = queryable.Where(r => r.FechaRecibido <= fechaHasta.Value);

        if (!string.IsNullOrWhiteSpace(numeroContrato))
        {
            var nc = numeroContrato.Trim();
            queryable = queryable.Where(r => r.NumeroContrato != null &&
                EF.Functions.Like(r.NumeroContrato, $"%{nc}%"));
        }

        queryable = queryable.OrderByDescending(r => r.FechaRecibido);

        var totalRegistros = await queryable.CountAsync();
        HttpContext.AgregarHeaderCantidadTotalRegistros(totalRegistros);

        var reportes = await queryable.Paginar(pagina, registrosPorPagina).ToListAsync();
        var dtos = _mapper.Map<List<ReporteDTO>>(reportes);
        return Ok(dtos);
    }

    [HttpGet("landing")]
    [OutputCache(Tags = new[] { "reportes" })]
    public async Task<ActionResult<LandingPageDTO>> GetLanding()
    {
        var enProceso = await _context.Reportes
            .Include(r => r.CuadrillaAsignada)
            .Include(r => r.Evidencias)
            .Where(r => r.Estatus == EstatusReporte.EnProceso || r.Estatus == EstatusReporte.LevantandoInformacion)
            .OrderByDescending(r => r.FechaRecibido)
            .Take(6)
            .ToListAsync();

        var nuevos = await _context.Reportes
            .Include(r => r.CuadrillaAsignada)
            .Include(r => r.Evidencias)
            .Where(r => r.Estatus == EstatusReporte.Nuevo || r.Estatus == EstatusReporte.Asignado)
            .OrderByDescending(r => r.FechaRecibido)
            .Take(6)
            .ToListAsync();

        var resultado = new LandingPageDTO
        {
            EnProceso = _mapper.Map<List<ReporteDTO>>(enProceso),
            Nuevos = _mapper.Map<List<ReporteDTO>>(nuevos)
        };

        return Ok(resultado);
    }

    [HttpGet("{id:int}", Name = "ObtenerReporte")]
    [OutputCache(Tags = new[] { "reportes" })]
    public async Task<ActionResult<ReporteDetalleDTO>> Get(int id)
    {
        var reporte = await _context.Reportes
            .Include(r => r.CuadrillaAsignada)
            .Include(r => r.CuadrillaSupervisora)
            .Include(r => r.Evidencias)
            .Include(r => r.SeguimientosUbicacion)
                .ThenInclude(s => s.Cuadrilla)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (reporte == null)
        {
            return NotFound();
        }

        var dto = _mapper.Map<ReporteDetalleDTO>(reporte);
        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult> Post([FromBody] ReporteCreacionDTO creacionDTO)
    {
        var reporte = _mapper.Map<Reporte>(creacionDTO);
        reporte.FechaRecibido = DateTime.UtcNow;
        reporte.Estatus = EstatusReporte.Nuevo;

        // Si no se proporcionó categoría, clasificar automáticamente mediante agente de IA
        if (string.IsNullOrWhiteSpace(reporte.Categoria))
        {
            try
            {
                var clasif = await _clasificador.ClasificarReporteAsync(reporte.Descripcion);
                reporte.Categoria = clasif.Categoria;
                reporte.ConfianzaIA = clasif.Confianza;
                reporte.RazonamientoIA = clasif.Razonamiento;

                if (reporte.TipoProblema == TipoProblema.Otro && Enum.TryParse<TipoProblema>(clasif.TipoProblema, out var tipoEnum))
                {
                    reporte.TipoProblema = tipoEnum;
                }
            }
            catch
            {
                reporte.Categoria = reporte.TipoProblema.ToString();
            }
        }

        _context.Add(reporte);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        var dto = _mapper.Map<ReporteDTO>(reporte);
        return CreatedAtRoute("ObtenerReporte", new { id = reporte.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Put(int id, [FromBody] ReporteCreacionDTO creacionDTO)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        _mapper.Map(creacionDTO, reporte);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        return NoContent();
    }

    [HttpPut("{id:int}/categoria")]
    public async Task<ActionResult> PutCategoria(int id, [FromBody] ActualizarCategoriaDTO dto)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(dto.Categoria))
        {
            reporte.Categoria = dto.Categoria.Trim();
        }

        if (dto.TipoProblema.HasValue)
        {
            reporte.TipoProblema = dto.TipoProblema.Value;
        }

        if (!string.IsNullOrWhiteSpace(dto.Razonamiento))
        {
            reporte.RazonamientoIA = dto.Razonamiento.Trim();
        }

        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        return NoContent();
    }

    [HttpPut("{id:int}/asignar")]
    public async Task<ActionResult> AsignarCuadrilla(int id, [FromBody] AsignarCuadrillaDTO dto)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        reporte.IdCuadrillaAsignada = dto.IdCuadrilla;
        reporte.Estatus = EstatusReporte.Asignado;

        if (dto.TiempoEstimado.HasValue)
        {
            reporte.TiempoEstimado = dto.TiempoEstimado.Value;
        }

        var cuadrilla = await _context.Cuadrillas.FindAsync(dto.IdCuadrilla);
        if (cuadrilla != null)
        {
            cuadrilla.EstatusDisponibilidad = EstatusCuadrilla.Ocupada;
        }

        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);
        await _outputCacheStore.EvictByTagAsync("cuadrillas", default);

        return NoContent();
    }

    [HttpPut("{id:int}/supervision")]
    public async Task<ActionResult> ProgramarSupervision(int id, [FromBody] ProgramarSupervisionDTO dto)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        if (reporte.IdCuadrillaAsignada.HasValue && reporte.IdCuadrillaAsignada == dto.IdCuadrillaSupervisora)
        {
            return BadRequest(new { mensaje = "La visita de supervisión debe asignarse a una cuadrilla distinta a la que atendió el reporte (RF-13)." });
        }

        reporte.IdCuadrillaSupervisora = dto.IdCuadrillaSupervisora;
        reporte.Estatus = EstatusReporte.EnSupervision;

        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);
        await _outputCacheStore.EvictByTagAsync("cuadrillas", default);

        return NoContent();
    }

    [HttpPut("{id:int}/estatus")]
    public async Task<ActionResult> PutEstatus(int id, [FromBody] EstatusReporte nuevoEstatus)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        var estatusAnterior = reporte.Estatus;
        reporte.Estatus = nuevoEstatus;

        if (nuevoEstatus == EstatusReporte.Asignado && reporte.IdCuadrillaAsignada.HasValue)
        {
            var cuadrilla = await _context.Cuadrillas.FindAsync(reporte.IdCuadrillaAsignada.Value);
            if (cuadrilla != null)
            {
                cuadrilla.EstatusDisponibilidad = EstatusCuadrilla.Ocupada;
            }
        }

        if (estatusAnterior == EstatusReporte.Asignado && nuevoEstatus != EstatusReporte.Asignado && reporte.IdCuadrillaAsignada.HasValue)
        {
            var cuadrilla = await _context.Cuadrillas.FindAsync(reporte.IdCuadrillaAsignada.Value);
            if (cuadrilla != null)
            {
                var tieneOtrosAsignados = await _context.Reportes
                    .AnyAsync(r => r.IdCuadrillaAsignada == reporte.IdCuadrillaAsignada && r.Estatus == EstatusReporte.Asignado && r.Id != id);
                if (!tieneOtrosAsignados)
                {
                    cuadrilla.EstatusDisponibilidad = EstatusCuadrilla.Disponible;
                }
            }
        }

        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);
        await _outputCacheStore.EvictByTagAsync("cuadrillas", default);

        return NoContent();
    }

    [HttpPost("{id:int}/evidencias")]
    public async Task<ActionResult<EvidenciaDTO>> PostEvidencia(int id, [FromForm] EvidenciaCreacionDTO creacionDTO)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        var urlArchivo = await _almacenadorArchivos.GuardarArchivo(ContenedorEvidencias, creacionDTO.Archivo);

        var evidencia = new Evidencia
        {
            IdReporte = id,
            Tipo = creacionDTO.Tipo,
            Archivo = urlArchivo,
            FechaCaptura = DateTime.UtcNow
        };

        _context.Add(evidencia);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        var dto = _mapper.Map<EvidenciaDTO>(evidencia);
        dto.ArchivoUrl = urlArchivo;

        return CreatedAtRoute("ObtenerReporte", new { id = reporte.Id }, dto);
    }

    [HttpGet("{id:int}/evidencias")]
    [OutputCache(Tags = new[] { "reportes" })]
    public async Task<ActionResult<List<EvidenciaDTO>>> GetEvidencias(int id)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        var evidencias = await _context.Evidencias
            .Where(e => e.IdReporte == id)
            .ToListAsync();

        var dtos = _mapper.Map<List<EvidenciaDTO>>(evidencias);
        return Ok(dtos);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var reporte = await _context.Reportes
            .Include(r => r.Evidencias)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (reporte == null)
        {
            return NotFound();
        }

        foreach (var evidencia in reporte.Evidencias)
        {
            await _almacenadorArchivos.BorrarArchivo(ContenedorEvidencias, evidencia.Archivo);
        }

        _context.Remove(reporte);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        return NoContent();
    }
}

public class LandingPageDTO
{
    public List<ReporteDTO> EnProceso { get; set; } = new();
    public List<ReporteDTO> Nuevos { get; set; } = new();
}

public class ActualizarCategoriaDTO
{
    public string? Categoria { get; set; }
    public TipoProblema? TipoProblema { get; set; }
    public string? Razonamiento { get; set; }
}

public class AsignarCuadrillaDTO
{
    public int IdCuadrilla { get; set; }
    public decimal? TiempoEstimado { get; set; }
}

public class ProgramarSupervisionDTO
{
    public int IdCuadrillaSupervisora { get; set; }
    public DateTime? FechaSupervision { get; set; }
    public string? NotasSupervision { get; set; }
}