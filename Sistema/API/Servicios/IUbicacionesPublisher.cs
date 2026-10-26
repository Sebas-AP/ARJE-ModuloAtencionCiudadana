namespace ARJE.Api.Servicios;

public interface IUbicacionesPublisher
{
    Task PublicarUltimaAsync(int idCuadrilla, CancellationToken ct);
}
