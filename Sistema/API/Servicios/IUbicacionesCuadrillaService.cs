using ARJE.Api.DTOs.Cuadrilla;

namespace ARJE.Api.Servicios;

public interface IUbicacionesCuadrillaService
{
    Task<List<UltimaUbicacionCuadrillaDTO>> GetUltimasAsync(CancellationToken ct);
    Task<UltimaUbicacionCuadrillaDTO?> GetUltimaAsync(int idCuadrilla, CancellationToken ct);
}
