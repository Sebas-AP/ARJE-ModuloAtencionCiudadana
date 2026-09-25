using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.DTOs.SeguimientoUbicacion;
using ARJE.Api.Utilidades;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/reportes/{idReporte:int}/ubicaciones")]
public class SeguimientosUbicacionController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IOutputCacheStore _outputCacheStore;

    public SeguimientosUbicacionController(
        ApplicationDbContext context,
        IMapper mapper,
        IOutputCacheStore outputCacheStore)
    {
        _context = context;
        _mapper = mapper;
        _outputCacheStore = outputCacheStore;
    }

    [HttpPost]
    public async Task<ActionResult> Post(int idReporte, [FromBody] SeguimientoUbicacionBatchDTO batchDTO)
    {
        var reporte = await _context.Reportes.FindAsync(idReporte);
        if (reporte == null)
        {
            return NotFound("Reporte no encontrado");
        }

        if (reporte.Estatus != EstatusReporte.LevantandoInformacion && reporte.Estatus != EstatusReporte.EnProceso)
        {
            return BadRequest("Solo se puede registrar ubicación cuando el reporte está en proceso");
        }

        if (!reporte.IdCuadrillaAsignada.HasValue)
        {
            return BadRequest("El reporte no tiene cuadrilla asignada");
        }

        var seguimientos = _mapper.Map<List<SeguimientoUbicacion>>(batchDTO.Ubicaciones);
        foreach (var s in seguimientos)
        {
            s.IdReporte = idReporte;
            s.IdCuadrilla = reporte.IdCuadrillaAsignada.Value;
        }

        _context.AddRange(seguimientos);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("ubicaciones", default);

        return Ok(new { mensaje = $"{seguimientos.Count} ubicaciones registradas" });
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

        var queryable = _context.SeguimientosUbicacion
            .Include(s => s.Cuadrilla)
            .Where(s => s.IdReporte == idReporte)
            .OrderByDescending(s => s.FechaHora);

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

        var ultima = await _context.SeguimientosUbicacion
            .Include(s => s.Cuadrilla)
            .Where(s => s.IdReporte == idReporte)
            .OrderByDescending(s => s.FechaHora)
            .FirstOrDefaultAsync();

        if (ultima == null)
        {
            return NotFound();
        }

        var dto = _mapper.Map<SeguimientoUbicacionDTO>(ultima);
        return Ok(dto);
    }
}