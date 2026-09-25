using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.Utilidades;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/cuadrillas")]
public class CuadrillasController : CustomBaseController<Cuadrilla, CuadrillaCreacionDTO, CuadrillaDTO>
{
    public CuadrillasController(ApplicationDbContext context, IMapper mapper, IOutputCacheStore outputCacheStore)
        : base(context, mapper, outputCacheStore, "cuadrillas") { }

    [HttpGet("disponibles")]
    [OutputCache(Tags = new[] { "cuadrillas" })]
    public async Task<ActionResult<List<CuadrillaDTO>>> GetDisponibles()
    {
        var cuadrillas = await _context.Cuadrillas
            .Where(c => c.EstatusDisponibilidad == EstatusCuadrilla.Disponible)
            .ToListAsync();

        var dtos = _mapper.Map<List<CuadrillaDTO>>(cuadrillas);
        return Ok(dtos);
    }

    [HttpPut("{id:int}/disponibilidad")]
    public async Task<ActionResult> PutDisponibilidad(int id, [FromBody] CuadrillaDisponibilidadDTO disponibilidadDTO)
    {
        var cuadrilla = await _context.Cuadrillas.FindAsync(id);
        if (cuadrilla == null)
        {
            return NotFound();
        }

        cuadrilla.EstatusDisponibilidad = disponibilidadDTO.EstatusDisponibilidad;
        await _context.SaveChangesAsync();
        await _outputCacheStore.EvictByTagAsync("cuadrillas", default);

        return NoContent();
    }
}