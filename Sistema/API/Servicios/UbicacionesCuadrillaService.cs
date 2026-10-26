using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.Entidades;
using Microsoft.EntityFrameworkCore;

namespace ARJE.Api.Servicios;

public class UbicacionesCuadrillaService : IUbicacionesCuadrillaService
{
    private readonly ApplicationDbContext _context;

    public UbicacionesCuadrillaService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<UltimaUbicacionCuadrillaDTO>> GetUltimasAsync(CancellationToken ct)
    {
        return await Project(_context.Cuadrillas.AsNoTracking()).ToListAsync(ct);
    }

    public async Task<UltimaUbicacionCuadrillaDTO?> GetUltimaAsync(int idCuadrilla, CancellationToken ct)
    {
        var rows = await Project(_context.Cuadrillas.AsNoTracking().Where(c => c.Id == idCuadrilla))
            .ToListAsync(ct);
        return rows.SingleOrDefault();
    }

    private static IQueryable<UltimaUbicacionCuadrillaDTO> Project(IQueryable<Cuadrilla> cuadrillas) =>
        cuadrillas
            .OrderBy(c => c.Id)
            .Select(c => new UltimaUbicacionCuadrillaDTO
            {
                IdCuadrilla = c.Id,
                CuadrillaNombre = c.Nombre,
                Posicion = c.SeguimientosUbicacion
                    .OrderByDescending(s => s.FechaHora)
                    .ThenByDescending(s => s.Id)
                    .Select(s => new UltimaPosicionCuadrillaDTO
                    {
                        IdSeguimiento = s.Id,
                        IdReporte = s.IdReporte,
                        FolioReporte = "FOL-" + s.IdReporte,
                        Latitud = s.Latitud,
                        Longitud = s.Longitud,
                        FechaHora = s.FechaHora,
                        FechaRecepcion = s.FechaRecepcion,
                        PrecisionMetros = s.PrecisionMetros
                    })
                    .FirstOrDefault()
            });
}
