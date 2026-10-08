using ARJE.Api.Entidades;

namespace ARJE.Api.Servicios;

public interface IJwtService
{
    string GenerarTokenUsuario(UsuarioSistema usuario);
    string GenerarTokenCuadrilla(Cuadrilla cuadrilla);
}
