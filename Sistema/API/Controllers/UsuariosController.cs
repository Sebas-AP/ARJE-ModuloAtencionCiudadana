using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.DTOs.Usuario;
using ARJE.Api.Utilidades;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/usuarios")]
public class UsuariosController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public UsuariosController(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDTO>> Login([FromBody] LoginDTO loginDTO)
    {
        var usuario = await _context.UsuariosSistema
            .FirstOrDefaultAsync(u => u.Usuario == loginDTO.Usuario && u.Activo);

        if (usuario == null || !BCrypt.Net.BCrypt.Verify(loginDTO.Password, usuario.PasswordHash))
        {
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos" });
        }

        var usuarioDTO = _mapper.Map<UsuarioDTO>(usuario);

        // En producción, generar JWT real
        var token = $"mock-jwt-token-{usuario.Id}-{Guid.NewGuid()}";

        return Ok(new LoginResponseDTO
        {
            Token = token,
            Usuario = usuarioDTO
        });
    }

    [HttpPost("registrar")]
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
        return CreatedAtAction(nameof(Login), new { usuario = usuario.Usuario }, dto);
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