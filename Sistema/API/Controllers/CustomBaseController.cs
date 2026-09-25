using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.Utilidades;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomBaseController<TEntidad, TCreacionDTO, TLecturaDTO> : ControllerBase
    where TEntidad : class, IId
    where TCreacionDTO : class
    where TLecturaDTO : class
{
    protected readonly ApplicationDbContext _context;
    protected readonly IMapper _mapper;
    protected readonly IOutputCacheStore _outputCacheStore;
    protected readonly string _cacheTag;

    public CustomBaseController(
        ApplicationDbContext context,
        IMapper mapper,
        IOutputCacheStore outputCacheStore,
        string cacheTag)
    {
        _context = context;
        _mapper = mapper;
        _outputCacheStore = outputCacheStore;
        _cacheTag = cacheTag;
    }

    [HttpGet]
    [OutputCache(Tags = new[] { "reportes", "cuadrillas", "evidencias", "ubicaciones" })]
    public virtual async Task<ActionResult<List<TLecturaDTO>>> Get([FromQuery] int pagina = 1, [FromQuery] int registrosPorPagina = 10)
    {
        var queryable = _context.Set<TEntidad>().AsQueryable();
        var totalRegistros = await queryable.CountAsync();
        HttpContext.AgregarHeaderCantidadTotalRegistros(totalRegistros);

        var entidades = await queryable.Paginar(pagina, registrosPorPagina).ToListAsync();
        var dtos = _mapper.Map<List<TLecturaDTO>>(entidades);
        return Ok(dtos);
    }

    [HttpGet("{id:int}", Name = "ObtenerPorId")]
    [OutputCache(Tags = new[] { "reportes", "cuadrillas", "evidencias", "ubicaciones" })]
    public virtual async Task<ActionResult<TLecturaDTO>> Get(int id)
    {
        var entidad = await _context.Set<TEntidad>().FindAsync(id);
        if (entidad == null)
        {
            return NotFound();
        }

        var dto = _mapper.Map<TLecturaDTO>(entidad);
        return Ok(dto);
    }

    [HttpPost]
    public virtual async Task<ActionResult> Post([FromBody] TCreacionDTO creacionDTO)
    {
        var entidad = _mapper.Map<TEntidad>(creacionDTO);
        _context.Add(entidad);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync(_cacheTag, default);

        var dto = _mapper.Map<TLecturaDTO>(entidad);
        return CreatedAtRoute("ObtenerPorId", new { id = entidad.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public virtual async Task<ActionResult> Put(int id, [FromBody] TCreacionDTO creacionDTO)
    {
        var entidad = await _context.Set<TEntidad>().FindAsync(id);
        if (entidad == null)
        {
            return NotFound();
        }

        _mapper.Map(creacionDTO, entidad);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync(_cacheTag, default);

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public virtual async Task<ActionResult> Delete(int id)
    {
        var entidad = await _context.Set<TEntidad>().FindAsync(id);
        if (entidad == null)
        {
            return NotFound();
        }

        _context.Remove(entidad);
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync(_cacheTag, default);

        return NoContent();
    }
}