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

    public string GenerarTokenSubidaEvidencia(int reporteId, int expiracionMinutos = 60)
    {
        var claims = new List<Claim>
        {
            new("tipo", "EvidenciaUpload"),
            new("reporteId", reporteId.ToString())
        };

        return CrearToken(claims, expiracionMinutos);
    }

    public (bool EsValido, int? ReporteId) ValidarTokenSubidaEvidencia(string token)
    {
        try
        {
            var secretKey = _configuration["Jwt:Key"] ?? "ARJE_Clave_Secreta_JWT_Super_Segura_2026_Agua_Potable_Token_Key_Length_32+";
            var issuer = _configuration["Jwt:Issuer"] ?? "ARJE.Api";
            var audience = _configuration["Jwt:Audience"] ?? "ARJE.Apps";

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var tokenHandler = new JwtSecurityTokenHandler();

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = issuer,
                ValidAudience = audience,
                IssuerSigningKey = key,
                ClockSkew = TimeSpan.Zero
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            
            var tipoClaim = principal.FindFirst("tipo");
            var reporteIdClaim = principal.FindFirst("reporteId");

            if (tipoClaim?.Value != "EvidenciaUpload" || reporteIdClaim == null)
            {
                return (false, null);
            }

            if (int.TryParse(reporteIdClaim.Value, out var reporteId))
            {
                return (true, reporteId);
            }

            return (false, null);
        }
        catch
        {
            return (false, null);
        }
    }

    private string CrearToken(IEnumerable<Claim> claims, int? expiracionMinutos = null)
    {
        var secretKey = _configuration["Jwt:Key"] ?? "ARJE_Clave_Secreta_JWT_Super_Segura_2026_Agua_Potable_Token_Key_Length_32+";
        var issuer = _configuration["Jwt:Issuer"] ?? "ARJE.Api";
        var audience = _configuration["Jwt:Audience"] ?? "ARJE.Apps";
        var expiresMinutes = expiracionMinutos ?? 1440;

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
