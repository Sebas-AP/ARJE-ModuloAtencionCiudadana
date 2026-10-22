using System.Security.Claims;
using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.DTOs.Reporte;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/cuadrillas")]
[Authorize]
public class CuadrillasController : CustomBaseController<Cuadrilla, CuadrillaCreacionDTO, CuadrillaDTO>
{
    private readonly IJwtService _jwtService;
    private readonly FieldOperationPolicy _fieldOperationPolicy = new();

    public CuadrillasController(
        ApplicationDbContext context,
        IMapper mapper,
        IOutputCacheStore outputCacheStore,
        IJwtService jwtService)
        : base(context, mapper, outputCacheStore, "cuadrillas")
    {
        _jwtService = jwtService;
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    public override Task<ActionResult<List<CuadrillaDTO>>> Get(int pagina = 1, int registrosPorPagina = 10) =>
        base.Get(pagina, registrosPorPagina);

    [HttpGet("{id:int}", Name = "ObtenerPorId")]
    [Authorize(Roles = "Administrador")]
    public override Task<ActionResult<CuadrillaDTO>> Get(int id) => base.Get(id);

    [HttpPost]
    [Authorize(Roles = "Administrador")]
    public override Task<ActionResult> Post([FromBody] CuadrillaCreacionDTO creacionDTO) => base.Post(creacionDTO);

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Administrador")]
    public override Task<ActionResult> Put(int id, [FromBody] CuadrillaCreacionDTO creacionDTO) => base.Put(id, creacionDTO);

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Administrador")]
    public override Task<ActionResult> Delete(int id) => base.Delete(id);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<CuadrillaLoginResponseDTO>> Login([FromBody] CuadrillaLoginDTO loginDTO)
    {
        var cuadrilla = await _context.Cuadrillas
            .FirstOrDefaultAsync(c => c.UsuarioApp == loginDTO.Usuario);

        if (cuadrilla == null || !BCrypt.Net.BCrypt.Verify(loginDTO.Password, cuadrilla.PasswordHash))
        {
            return Unauthorized(new { mensaje = "Usuario o contraseña de cuadrilla incorrectos" });
        }

        var token = _jwtService.GenerarTokenCuadrilla(cuadrilla);
        var cuadrillaDTO = _mapper.Map<CuadrillaDTO>(cuadrilla);

        return Ok(new CuadrillaLoginResponseDTO
        {
            Token = token,
            Cuadrilla = cuadrillaDTO
        });
    }

    [HttpGet("me")]
    public async Task<ActionResult<CuadrillaDTO>> GetMe()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(idStr) || !int.TryParse(idStr, out var id))
        {
            return Unauthorized();
        }

        var cuadrilla = await _context.Cuadrillas
            .Include(c => c.ReportesAsignados)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cuadrilla == null)
        {
            return NotFound();
        }

        return Ok(_mapper.Map<CuadrillaDTO>(cuadrilla));
    }

    [HttpGet("me/reportes")]
    [Authorize(Roles = "Cuadrilla")]
    public async Task<ActionResult<List<ReporteDTO>>> GetMisReportes()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(idStr) || !int.TryParse(idStr, out var id))
        {
            return Unauthorized();
        }

        var reportes = await _context.Reportes
            .Include(r => r.CuadrillaAsignada)
            .Include(r => r.Evidencias)
            .Where(r => r.IdCuadrillaAsignada == id)
            .OrderByDescending(r => r.FechaRecibido)
            .ToListAsync();

        return Ok(_mapper.Map<List<ReporteDTO>>(reportes));
    }

    [HttpGet("disponibles")]
    [Authorize(Roles = "Administrador")]
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
        if (_fieldOperationPolicy.IsCuadrilla(User) &&
            (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var authenticatedId) || authenticatedId != id))
        {
            return Forbid();
        }

        // The active-report query and availability update must be one serializable
        // unit.  Besides keeping the read consistent, SQL Server's serializable
        // range locks on Reportes.IdCuadrillaAsignada prevent an assignment from
        // being committed between this check and the availability update.
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var cuadrilla = await _context.Cuadrillas.FindAsync(id);
        if (cuadrilla == null)
        {
            return NotFound();
        }

        var estatusReportes = await _context.Reportes
            .Where(r => r.IdCuadrillaAsignada == id)
            .Select(r => r.Estatus)
            .ToListAsync();
        cuadrilla.EstatusDisponibilidad = _fieldOperationPolicy.ResolveAvailability(
            disponibilidadDTO.EstatusDisponibilidad, estatusReportes);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        await _outputCacheStore.EvictByTagAsync("cuadrillas", default);

        return NoContent();
    }
}
