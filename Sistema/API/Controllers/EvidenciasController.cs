using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.DTOs.Evidencia;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/evidencias")]
public class EvidenciasController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IOutputCacheStore _outputCacheStore;
    private readonly IAlmacenadorArchivos _almacenadorArchivos;
    private const string ContenedorEvidencias = "evidencias";

    public EvidenciasController(
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

    [HttpGet("{id:int}")]
    [OutputCache(Tags = new[] { "evidencias" })]
    public async Task<ActionResult<EvidenciaDTO>> Get(int id)
    {
        var evidencia = await _context.Evidencias.FindAsync(id);
        if (evidencia == null)
        {
            return NotFound();
        }

        var dto = _mapper.Map<EvidenciaDTO>(evidencia);
        dto.ArchivoUrl = evidencia.Archivo;
        return Ok(dto);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var evidencia = await _context.Evidencias
            .Include(e => e.Reporte)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (evidencia == null)
        {
            return NotFound();
        }

        await _almacenadorArchivos.BorrarArchivo(ContenedorEvidencias, evidencia.Archivo);
        _context.Remove(evidencia);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("evidencias", default);
        await _outputCacheStore.EvictByTagAsync("reportes", default);

        return NoContent();
    }
}