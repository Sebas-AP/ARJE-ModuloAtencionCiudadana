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
    private const string ContenedorEvidencias = "evidencias";

    public ReportesController(
        ApplicationDbContext context,
        IMapper mapper,
        IOutputCacheStore outputCacheStore,
        IAlmacenadorArchivos almacenadorArchivos)
    {
        _context = context;
        _mapper = mapper;
        _outputCacheStore = outputCacheStore;
        _almacenadorArchivos = almacenadorArchivos;
    }

    [HttpGet]
    [OutputCache(Tags = new[] { "reportes" })]
    public async Task<ActionResult<List<ReporteDTO>>> Get(
        [FromQuery] int pagina = 1,
        [FromQuery] int registrosPorPagina = 10,
        [FromQuery] EstatusReporte? estatus = null,
        [FromQuery] TipoProblema? tipoProblema = null,
        [FromQuery] int? idCuadrillaAsignada = null,
        [FromQuery] DateTime? fechaDesde = null,
        [FromQuery] DateTime? fechaHasta = null)
    {
        var queryable = _context.Reportes
            .Include(r => r.CuadrillaAsignada)
            .Include(r => r.Evidencias)
            .AsQueryable();

        if (estatus.HasValue)
            queryable = queryable.Where(r => r.Estatus == estatus.Value);

        if (tipoProblema.HasValue)
            queryable = queryable.Where(r => r.TipoProblema == tipoProblema.Value);

        if (idCuadrillaAsignada.HasValue)
            queryable = queryable.Where(r => r.IdCuadrillaAsignada == idCuadrillaAsignada.Value);

        if (fechaDesde.HasValue)
            queryable = queryable.Where(r => r.FechaRecibido >= fechaDesde.Value);

        if (fechaHasta.HasValue)
            queryable = queryable.Where(r => r.FechaRecibido <= fechaHasta.Value);

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