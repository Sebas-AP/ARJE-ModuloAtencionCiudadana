using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ARJE.Api.Entidades;

namespace ARJE.Api.Servicios;

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerarTokenUsuario(UsuarioSistema usuario)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name, usuario.Usuario),
            new(ClaimTypes.Role, usuario.Rol.ToString()),
            new("tipo", "Usuario"),
            new("nombreCompleto", usuario.Nombre ?? usuario.Usuario)
        };

        return CrearToken(claims);
    }

    public string GenerarTokenCuadrilla(Cuadrilla cuadrilla)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, cuadrilla.Id.ToString()),
            new(ClaimTypes.Name, cuadrilla.UsuarioApp),
            new(ClaimTypes.Role, "Cuadrilla"),
            new("tipo", "Cuadrilla"),
            new("idCuadrilla", cuadrilla.Id.ToString()),
            new("nombreCuadrilla", cuadrilla.Nombre)
        };

        return CrearToken(claims);
    }

    private string CrearToken(IEnumerable<Claim> claims)
    {
        var secretKey = _configuration["Jwt:Key"] ?? "ARJE_Clave_Secreta_JWT_Super_Segura_2026_Agua_Potable_Token_Key_Length_32+";
        var issuer = _configuration["Jwt:Issuer"] ?? "ARJE.Api";
        var audience = _configuration["Jwt:Audience"] ?? "ARJE.Apps";
        var expiresMinutesStr = _configuration["Jwt:ExpiresInMinutes"] ?? "1440"; // 24 horas por defecto

        if (!double.TryParse(expiresMinutesStr, out var expiresMinutes))
        {
            expiresMinutes = 1440;
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(expiresMinutes),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
