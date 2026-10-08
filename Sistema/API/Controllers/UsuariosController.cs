using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.DTOs.Usuario;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize]
public class UsuariosController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IJwtService _jwtService;

    public UsuariosController(ApplicationDbContext context, IMapper mapper, IJwtService jwtService)
    {
        _context = context;
        _mapper = mapper;
        _jwtService = jwtService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDTO>> Login([FromBody] LoginDTO loginDTO)
    {
        // 1. Buscar en Usuarios del Sistema (Admin, Operador, etc.)
        var usuario = await _context.UsuariosSistema
            .FirstOrDefaultAsync(u => u.Usuario == loginDTO.Usuario && u.Activo);

        if (usuario != null && BCrypt.Net.BCrypt.Verify(loginDTO.Password, usuario.PasswordHash))
        {
            var usuarioDTO = _mapper.Map<UsuarioDTO>(usuario);
            var token = _jwtService.GenerarTokenUsuario(usuario);

            return Ok(new LoginResponseDTO
            {
                Token = token,
                Usuario = usuarioDTO
            });
        }

        // 2. Si no es usuario de sistema, verificar si es una cuadrilla
        var cuadrilla = await _context.Cuadrillas
            .FirstOrDefaultAsync(c => c.UsuarioApp == loginDTO.Usuario);

        if (cuadrilla != null && BCrypt.Net.BCrypt.Verify(loginDTO.Password, cuadrilla.PasswordHash))
        {
            var usuarioDTO = new UsuarioDTO
            {
                Id = cuadrilla.Id,
                Nombre = cuadrilla.Nombre,
                Usuario = cuadrilla.UsuarioApp,
                Rol = "Cuadrilla"
            };
            var token = _jwtService.GenerarTokenCuadrilla(cuadrilla);

            return Ok(new LoginResponseDTO
            {
                Token = token,
                Usuario = usuarioDTO
            });
        }

        return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos" });
    }

    [HttpPost("registrar")]
    [AllowAnonymous]
    public async Task<ActionResult<UsuarioDTO>> Registrar([FromBody] LoginDTO loginDTO)
    {
        var existe = await _context.UsuariosSistema.AnyAsync(u => u.Usuario == loginDTO.Usuario);
        if (existe)
        {
            return BadRequest(new { mensaje = "El usuario ya existe" });
        }

        var usuario = new UsuarioSistema
        {
            Nombre = loginDTO.Usuario,
            Usuario = loginDTO.Usuario,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(loginDTO.Password),
            Rol = ARJE.Api.Entidades.Enums.RolUsuario.Administrador
        };

        _context.Add(usuario);
        await _context.SaveChangesAsync();

        var dto = _mapper.Map<UsuarioDTO>(usuario);
        return CreatedAtAction(nameof(Get), new { id = usuario.Id }, dto);
    }

    [HttpGet("me")]
    public async Task<ActionResult<UsuarioDTO>> GetMe()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var tipo = User.FindFirstValue("tipo");

        if (string.IsNullOrEmpty(idStr) || !int.TryParse(idStr, out var id))
        {
            return Unauthorized();
        }

        if (tipo == "Cuadrilla")
        {
            var cuadrilla = await _context.Cuadrillas.FindAsync(id);
            if (cuadrilla == null) return NotFound();

            return Ok(new UsuarioDTO
            {
                Id = cuadrilla.Id,
                Nombre = cuadrilla.Nombre,
                Usuario = cuadrilla.UsuarioApp,
                Rol = "Cuadrilla"
            });
        }

        var usuario = await _context.UsuariosSistema.FindAsync(id);
        if (usuario == null)
        {
            return NotFound();
        }

        return Ok(_mapper.Map<UsuarioDTO>(usuario));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsuarioDTO>> Get(int id)
    {
        var usuario = await _context.UsuariosSistema.FindAsync(id);
        if (usuario == null)
        {
            return NotFound();
        }

        var dto = _mapper.Map<UsuarioDTO>(usuario);
        return Ok(dto);
    }
}