using ARJE.Api.Entidades;

namespace ARJE.Api.Servicios;

public interface IJwtService
{
    string GenerarTokenUsuario(UsuarioSistema usuario);
    string GenerarTokenCuadrilla(Cuadrilla cuadrilla);
    string GenerarTokenSubidaEvidencia(int reporteId, int expiracionMinutos = 60);
    (bool EsValido, int? ReporteId) ValidarTokenSubidaEvidencia(string token);
}
