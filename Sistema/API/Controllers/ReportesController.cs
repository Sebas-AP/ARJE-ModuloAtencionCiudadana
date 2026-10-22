using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using System.Security.Claims;
using ARJE.Api.Entidades;
using ARJE.Api.DTOs.Reporte;
using ARJE.Api.DTOs.Evidencia;
using ARJE.Api.Servicios;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Utilidades;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/reportes")]
[Authorize]
public class ReportesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IOutputCacheStore _outputCacheStore;
    private readonly IAlmacenadorArchivos _almacenadorArchivos;
    private readonly IClasificadorService _clasificador;
    private readonly IJwtService _jwtService;
    private readonly FieldOperationPolicy _fieldOperationPolicy = new();
    private const string ContenedorEvidencias = "evidencias";

    public ReportesController(
        ApplicationDbContext context,
        IMapper mapper,
        IOutputCacheStore outputCacheStore,
        IAlmacenadorArchivos almacenadorArchivos,
        IClasificadorService clasificador,
        IJwtService jwtService)
    {
        _context = context;
        _mapper = mapper;
        _outputCacheStore = outputCacheStore;
        _almacenadorArchivos = almacenadorArchivos;
        _clasificador = clasificador;
        _jwtService = jwtService;
    }

    [HttpGet]
    [OutputCache(Tags = new[] { "reportes" })]
    public async Task<ActionResult<List<ReporteDTO>>> Get(
        [FromQuery] int pagina = 1,
        [FromQuery] int registrosPorPagina = 10,
        [FromQuery] EstatusReporte? estatus = null,
        [FromQuery] TipoProblema? tipoProblema = null,
        [FromQuery] string? categoria = null,
        [FromQuery] PrioridadReporte? prioridad = null,
        [FromQuery] bool ordenarPorPrioridad = false,
        [FromQuery] int? idCuadrillaAsignada = null,
        [FromQuery] int? idCuadrillaSupervisora = null,
        [FromQuery] DateTime? fechaDesde = null,
        [FromQuery] DateTime? fechaHasta = null,
        [FromQuery] string? numeroContrato = null)
    {
        var queryable = _context.Reportes
            .Include(r => r.CuadrillaAsignada)
            .Include(r => r.Evidencias)
            .AsQueryable();

        if (_fieldOperationPolicy.IsCuadrilla(User))
        {
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var authenticatedId);
            if (authenticatedId > 0)
            {
                queryable = queryable.Where(r => r.IdCuadrillaAsignada == authenticatedId);
            }
            else
            {
                return Forbid();
            }
        }

        if (estatus.HasValue)
            queryable = queryable.Where(r => r.Estatus == estatus.Value);

        if (tipoProblema.HasValue)
            queryable = queryable.Where(r => r.TipoProblema == tipoProblema.Value);

        if (prioridad.HasValue)
            queryable = queryable.Where(r => r.Prioridad == prioridad.Value);

        if (!string.IsNullOrWhiteSpace(categoria))
        {
            var cat = categoria.Trim();
            queryable = queryable.Where(r => r.Categoria != null && EF.Functions.Like(r.Categoria, $"%{cat}%"));
        }

        if (idCuadrillaAsignada.HasValue)
        {
            if (!_fieldOperationPolicy.IsCuadrilla(User))
            {
                queryable = queryable.Where(r => r.IdCuadrillaAsignada == idCuadrillaAsignada.Value);
            }
        }

        if (idCuadrillaSupervisora.HasValue)
            queryable = queryable.Where(r => r.IdCuadrillaSupervisora == idCuadrillaSupervisora.Value);

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

        if (ordenarPorPrioridad)
            queryable = queryable.OrderByDescending(r => r.Prioridad).ThenByDescending(r => r.FechaRecibido);
        else
            queryable = queryable.OrderByDescending(r => r.FechaRecibido);

        var totalRegistros = await queryable.CountAsync();
        HttpContext.AgregarHeaderCantidadTotalRegistros(totalRegistros);

        var reportes = await queryable.Paginar(pagina, registrosPorPagina).ToListAsync();
        var dtos = _mapper.Map<List<ReporteDTO>>(reportes);
        return Ok(dtos);
    }

    [HttpGet("landing")]
    [AllowAnonymous]
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

    [HttpGet("consulta")]
    [AllowAnonymous]
    [OutputCache(Tags = new[] { "reportes" }, VaryByQueryKeys = new[] { "numeroContrato", "pagina", "registrosPorPagina" })]
    public async Task<ActionResult<ReporteConsultaPaginadoDTO>> ConsultaPublica(
        [FromQuery] string numeroContrato,
        [FromQuery] int pagina = 1,
        [FromQuery] int registrosPorPagina = 10)
    {
        if (string.IsNullOrWhiteSpace(numeroContrato))
        {
            return BadRequest(new { mensaje = "El número de contrato es obligatorio" });
        }

        var contratoNormalizado = numeroContrato.Trim();

        var queryable = _context.Reportes
            .Include(r => r.CuadrillaAsignada)
            .Include(r => r.Evidencias)
            .Where(r => r.NumeroContrato != null && r.NumeroContrato == contratoNormalizado)
            .OrderByDescending(r => r.FechaRecibido);

        var totalRegistros = await queryable.CountAsync();

        var reportes = await queryable
            .Paginar(pagina, registrosPorPagina)
            .ToListAsync();

        var dtos = _mapper.Map<List<ReportePublicoDTO>>(reportes);

        var resultado = new ReporteConsultaPaginadoDTO
        {
            Data = dtos,
            TotalRegistros = totalRegistros,
            Pagina = pagina,
            RegistrosPorPagina = registrosPorPagina,
            TotalPaginas = (int)Math.Ceiling((double)totalRegistros / registrosPorPagina)
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

    [HttpGet("{id:int}/publico")]
    [AllowAnonymous]
    [OutputCache(Tags = new[] { "reportes" }, VaryByQueryKeys = new[] { "numeroContrato" })]
    public async Task<ActionResult<ReportePublicoDTO>> GetPublico(int id, [FromQuery] string numeroContrato)
    {
        if (string.IsNullOrWhiteSpace(numeroContrato))
        {
            return BadRequest(new { mensaje = "El número de contrato es obligatorio" });
        }

        var contratoNormalizado = numeroContrato.Trim();

        var reporte = await _context.Reportes
            .Include(r => r.CuadrillaAsignada)
            .Include(r => r.Evidencias)
            .FirstOrDefaultAsync(r => r.Id == id && r.NumeroContrato != null && r.NumeroContrato == contratoNormalizado);

        if (reporte == null)
        {
            return NotFound();
        }

        var dto = _mapper.Map<ReportePublicoDTO>(reporte);
        return Ok(dto);
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult> Post([FromBody] ReporteCreacionDTO creacionDTO)
    {
        var reporte = _mapper.Map<Reporte>(creacionDTO);
        reporte.FechaRecibido = DateTime.UtcNow;
        reporte.Estatus = EstatusReporte.Nuevo;

        // Clasificar y priorizar automáticamente mediante Agente de IA
        try
        {
            var clasif = await _clasificador.ClasificarReporteAsync(reporte.Descripcion);
            if (string.IsNullOrWhiteSpace(reporte.Categoria))
            {
                reporte.Categoria = clasif.Categoria;
            }
            reporte.ConfianzaIA = clasif.Confianza;
            reporte.RazonamientoIA = clasif.Razonamiento;
            reporte.Prioridad = clasif.Prioridad;
            reporte.ScorePrioridad = clasif.ScorePrioridad;
            reporte.JustificacionPrioridad = clasif.JustificacionPrioridad;

            if (reporte.TipoProblema == TipoProblema.Otro && Enum.TryParse<TipoProblema>(clasif.TipoProblema, out var tipoEnum))
            {
                reporte.TipoProblema = tipoEnum;
            }
        }
        catch
        {
            if (string.IsNullOrWhiteSpace(reporte.Categoria))
                reporte.Categoria = reporte.TipoProblema.ToString();
            reporte.Prioridad = PrioridadReporte.Media;
            reporte.ScorePrioridad = 0.50;
            reporte.JustificacionPrioridad = "Prioridad asignada automáticamente por seguridad";
        }

        _context.Add(reporte);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        var uploadToken = _jwtService.GenerarTokenSubidaEvidencia(reporte.Id, 60);

        var dto = new ReporteCiudadanoRespuestaDTO
        {
            Id = reporte.Id,
            TipoProblema = reporte.TipoProblema,
            Categoria = reporte.Categoria,
            Descripcion = reporte.Descripcion,
            Latitud = reporte.Latitud,
            Longitud = reporte.Longitud,
            FechaRecibido = reporte.FechaRecibido,
            Estatus = reporte.Estatus,
            NumeroContrato = reporte.NumeroContrato,
            NombreCiudadano = reporte.NombreCiudadano,
            UploadToken = uploadToken,
            UploadTokenExpiraEnMinutos = 60
        };
        return CreatedAtRoute("ObtenerReporte", new { id = reporte.Id }, dto);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Administrador")]
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
    [Authorize(Roles = "Administrador")]
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

    [HttpPut("{id:int}/prioridad")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult> PutPrioridad(int id, [FromBody] ActualizarPrioridadDTO dto)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        reporte.Prioridad = dto.Prioridad;
        if (!string.IsNullOrWhiteSpace(dto.Justificacion))
        {
            reporte.JustificacionPrioridad = dto.Justificacion.Trim();
        }

        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        return NoContent();
    }

    [HttpPost("{id:int}/revaluar-prioridad")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult<ReporteDetalleDTO>> RevaluarPrioridad(int id)
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

        var clasif = await _clasificador.ClasificarReporteAsync(reporte.Descripcion);
        reporte.Prioridad = clasif.Prioridad;
        reporte.ScorePrioridad = clasif.ScorePrioridad;
        reporte.JustificacionPrioridad = clasif.JustificacionPrioridad;
        reporte.ConfianzaIA = clasif.Confianza;
        reporte.RazonamientoIA = clasif.Razonamiento;

        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        var dto = _mapper.Map<ReporteDetalleDTO>(reporte);
        return Ok(dto);
    }

    [HttpPut("{id:int}/asignar")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult> AsignarCuadrilla(int id, [FromBody] AsignarCuadrillaDTO dto)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        var cuadrilla = await _context.Cuadrillas.FindAsync(dto.IdCuadrilla);
        if (cuadrilla == null)
        {
            return BadRequest(new { mensaje = "La cuadrilla seleccionada no existe." });
        }

        reporte.IdCuadrillaAsignada = dto.IdCuadrilla;
        reporte.Estatus = EstatusReporte.Asignado;

        if (dto.TiempoEstimado.HasValue)
        {
            reporte.TiempoEstimado = dto.TiempoEstimado.Value;
        }

        cuadrilla.EstatusDisponibilidad = EstatusCuadrilla.Ocupada;

        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);
        await _outputCacheStore.EvictByTagAsync("cuadrillas", default);

        return NoContent();
    }

    [HttpPut("{id:int}/supervision")]
    [Authorize(Roles = "Administrador")]
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
        reporte.FechaSupervision = dto.FechaSupervision;
        reporte.NotasSupervision = string.IsNullOrWhiteSpace(dto.NotasSupervision)
            ? null
            : dto.NotasSupervision.Trim();
        reporte.Estatus = EstatusReporte.EnSupervision;

        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);
        await _outputCacheStore.EvictByTagAsync("cuadrillas", default);

        return NoContent();
    }

    [HttpPut("{id:int}/tiempo-estimado")]
    public async Task<ActionResult> PutTiempoEstimado(int id, [FromBody] ActualizarTiempoEstimadoDTO dto)
    {
        if (dto.TiempoEstimado is < 1 or > 1440)
        {
            return BadRequest(new { mensaje = "El tiempo estimado debe estar entre 1 y 1440 minutos." });
        }

        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        if (_fieldOperationPolicy.IsCuadrilla(User) && !_fieldOperationPolicy.CanAccessAssignedReport(reporte, User))
        {
            return Forbid();
        }

        reporte.TiempoEstimado = dto.TiempoEstimado;
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        return NoContent();
    }

    [HttpPut("{id:int}/comentarios-resolucion")]
    public async Task<ActionResult> PutComentariosResolucion(int id, [FromBody] ActualizarComentariosResolucionDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ComentariosResolucion) || dto.ComentariosResolucion.Length > 2000)
        {
            return BadRequest(new { mensaje = "Los comentarios de resolución deben contener entre 1 y 2000 caracteres." });
        }

        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        if (_fieldOperationPolicy.IsCuadrilla(User) && !_fieldOperationPolicy.CanAccessAssignedReport(reporte, User))
        {
            return Forbid();
        }

        reporte.ComentariosResolucion = dto.ComentariosResolucion.Trim();
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        return NoContent();
    }

    [HttpPut("{id:int}/supervision/resultado")]
    public async Task<ActionResult> PutResultadoSupervision(int id, [FromBody] ResolverSupervisionDTO dto)
    {
        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        if (_fieldOperationPolicy.IsCuadrilla(User) && !_fieldOperationPolicy.CanAccessSupervisedReport(reporte, User))
        {
            return Forbid();
        }

        if (reporte.Estatus != EstatusReporte.EnSupervision)
        {
            return BadRequest(new { mensaje = "El reporte no está pendiente de supervisión." });
        }

        reporte.NotasSupervision = string.IsNullOrWhiteSpace(dto.Observaciones)
            ? reporte.NotasSupervision
            : dto.Observaciones.Trim();
        reporte.Estatus = dto.ConfirmaReparacion ? EstatusReporte.Cerrado : EstatusReporte.EnProceso;

        if (!dto.ConfirmaReparacion && reporte.IdCuadrillaAsignada.HasValue)
        {
            var cuadrilla = await _context.Cuadrillas.FindAsync(reporte.IdCuadrillaAsignada.Value);
            if (cuadrilla != null && cuadrilla.EstatusDisponibilidad != EstatusCuadrilla.FueraServicio)
            {
                cuadrilla.EstatusDisponibilidad = EstatusCuadrilla.Ocupada;
            }
        }

        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("reportes", default);
        await _outputCacheStore.EvictByTagAsync("cuadrillas", default);

        return NoContent();
    }

    [HttpPut("{id:int}/estatus")]
    public async Task<ActionResult> PutEstatus(int id, [FromBody] EstatusReporte nuevoEstatus)
    {
        var reporte = await _context.Reportes
            .Include(r => r.Evidencias)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (reporte == null)
        {
            return NotFound();
        }

        if (_fieldOperationPolicy.IsCuadrilla(User))
        {
            if (!_fieldOperationPolicy.CanAccessAssignedReport(reporte, User))
            {
                return Forbid();
            }

            if (reporte.Estatus != nuevoEstatus && !_fieldOperationPolicy.IsAllowedTransition(reporte.Estatus, nuevoEstatus))
            {
                return BadRequest(new { mensaje = "La transición de estatus solicitada no está permitida." });
            }
        }

        if (nuevoEstatus == EstatusReporte.Completado && !_fieldOperationPolicy.EnsureCanComplete(reporte).IsAllowed)
        {
            return BadRequest(new { mensaje = "Se requiere evidencia de resolución para completar el reporte." });
        }

        if (reporte.Estatus == nuevoEstatus)
        {
            return NoContent();
        }

        reporte.Estatus = nuevoEstatus;

        // Establecer fecha de resolución al completar
        if (nuevoEstatus == EstatusReporte.Completado)
        {
            reporte.FechaResolucion = DateTime.UtcNow;
        }

        if (reporte.IdCuadrillaAsignada.HasValue)
        {
            var cuadrilla = await _context.Cuadrillas.FindAsync(reporte.IdCuadrillaAsignada.Value);
            if (cuadrilla != null)
            {
                var otrosEstatus = await _context.Reportes
                    .Where(r => r.IdCuadrillaAsignada == reporte.IdCuadrillaAsignada && r.Id != id)
                    .Select(r => r.Estatus)
                    .ToListAsync();
                cuadrilla.EstatusDisponibilidad = _fieldOperationPolicy.ResolveAvailability(
                    cuadrilla.EstatusDisponibilidad == EstatusCuadrilla.FueraServicio
                        ? EstatusCuadrilla.FueraServicio
                        : EstatusCuadrilla.Disponible,
                    otrosEstatus.Append(nuevoEstatus));
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

        if (_fieldOperationPolicy.IsCuadrilla(User) && !_fieldOperationPolicy.CanAccessAssignedReport(reporte, User))
        {
            return Forbid();
        }

        // Validar archivo antes de guardar
        var validacion = await _almacenadorArchivos.ValidarArchivo(creacionDTO.Archivo);
        if (!validacion.EsValido)
        {
            return BadRequest(new { mensaje = validacion.ErrorMessage });
        }

        var resultadoGuardado = await _almacenadorArchivos.GuardarArchivo(ContenedorEvidencias, creacionDTO.Archivo);
        if (!resultadoGuardado.Exitoso)
        {
            return BadRequest(new { mensaje = resultadoGuardado.ErrorMessage });
        }

        var evidencia = new Evidencia
        {
            IdReporte = id,
            Tipo = creacionDTO.Tipo,
            Archivo = resultadoGuardado.Url!,
            FechaCaptura = DateTime.UtcNow
        };

        try
        {
            _context.Add(evidencia);
            await _context.SaveChangesAsync();
            await _outputCacheStore.EvictByTagAsync("reportes", default);

            var dto = _mapper.Map<EvidenciaDTO>(evidencia);
            dto.ArchivoUrl = resultadoGuardado.Url!;

            return CreatedAtRoute("ObtenerReporte", new { id = reporte.Id }, dto);
        }
        catch
        {
            // Rollback: borrar archivo si falla la BD
            await _almacenadorArchivos.BorrarArchivo(ContenedorEvidencias, resultadoGuardado.Url!);
            throw;
        }
    }

    [HttpPost("{id:int}/evidencias/ciudadano")]
    [AllowAnonymous]
    public async Task<ActionResult<EvidenciaPublicoDTO>> PostEvidenciaCiudadano(int id, [FromForm] EvidenciaCreacionDTO creacionDTO, [FromQuery] string uploadToken)
    {
        if (string.IsNullOrWhiteSpace(uploadToken))
        {
            return BadRequest(new { mensaje = "Token de subida requerido" });
        }

        var (esValido, reporteIdToken) = _jwtService.ValidarTokenSubidaEvidencia(uploadToken);
        if (!esValido || reporteIdToken != id)
        {
            return Unauthorized(new { mensaje = "Token de subida inválido o expirado" });
        }

        var reporte = await _context.Reportes.FindAsync(id);
        if (reporte == null)
        {
            return NotFound();
        }

        if (creacionDTO.Tipo != TipoEvidencia.Inicial)
        {
            return BadRequest(new { mensaje = "Solo se permite evidencia inicial para ciudadano" });
        }

        // Validar archivo antes de guardar
        var validacion = await _almacenadorArchivos.ValidarArchivo(creacionDTO.Archivo);
        if (!validacion.EsValido)
        {
            return BadRequest(new { mensaje = validacion.ErrorMessage });
        }

        var resultadoGuardado = await _almacenadorArchivos.GuardarArchivo(ContenedorEvidencias, creacionDTO.Archivo);
        if (!resultadoGuardado.Exitoso)
        {
            return BadRequest(new { mensaje = resultadoGuardado.ErrorMessage });
        }

        var evidencia = new Evidencia
        {
            IdReporte = id,
            Tipo = creacionDTO.Tipo,
            Archivo = resultadoGuardado.Url!,
            FechaCaptura = DateTime.UtcNow
        };

        try
        {
            _context.Add(evidencia);
            await _context.SaveChangesAsync();
            await _outputCacheStore.EvictByTagAsync("reportes", default);

            var dto = _mapper.Map<EvidenciaPublicoDTO>(evidencia);
            return CreatedAtRoute("ObtenerReporte", new { id = reporte.Id }, dto);
        }
        catch
        {
            // Rollback: borrar archivo si falla la BD
            await _almacenadorArchivos.BorrarArchivo(ContenedorEvidencias, resultadoGuardado.Url!);
            throw;
        }
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

        if (_fieldOperationPolicy.IsCuadrilla(User) && !_fieldOperationPolicy.CanAccessAssignedReport(reporte, User))
        {
            return Forbid();
        }

        var evidencias = await _context.Evidencias
            .Where(e => e.IdReporte == id)
            .ToListAsync();

        var dtos = _mapper.Map<List<EvidenciaDTO>>(evidencias);
        return Ok(dtos);
    }

    [HttpGet("{id:int}/evidencias/publico")]
    [AllowAnonymous]
    [OutputCache(Tags = new[] { "reportes" }, VaryByQueryKeys = new[] { "numeroContrato" })]
    public async Task<ActionResult<List<EvidenciaPublicoDTO>>> GetEvidenciasPublico(int id, [FromQuery] string numeroContrato)
    {
        if (string.IsNullOrWhiteSpace(numeroContrato))
        {
            return BadRequest(new { mensaje = "El número de contrato es obligatorio" });
        }

        var contratoNormalizado = numeroContrato.Trim();

        var reporte = await _context.Reportes
            .FirstOrDefaultAsync(r => r.Id == id && r.NumeroContrato != null && r.NumeroContrato == contratoNormalizado);

        if (reporte == null)
        {
            return NotFound();
        }

        var evidencias = await _context.Evidencias
            .Where(e => e.IdReporte == id)
            .ToListAsync();

        var dtos = _mapper.Map<List<EvidenciaPublicoDTO>>(evidencias);
        return Ok(dtos);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Administrador")]
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

public class ActualizarTiempoEstimadoDTO
{
    public decimal TiempoEstimado { get; set; }
}

public class ActualizarComentariosResolucionDTO
{
    public string ComentariosResolucion { get; set; } = string.Empty;
}

public class ResolverSupervisionDTO
{
    public bool ConfirmaReparacion { get; set; }
    public string? Observaciones { get; set; }
}
