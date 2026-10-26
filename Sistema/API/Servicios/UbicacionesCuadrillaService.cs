using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.Entidades;
using ARJE.Api.Utilidades;
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
        var rows = await Project(_context.Cuadrillas.AsNoTracking()).ToListAsync(ct);
        foreach (var row in rows)
        {
            NormalizarFechas(row);
        }

        return rows;
    }

    public async Task<UltimaUbicacionCuadrillaDTO?> GetUltimaAsync(int idCuadrilla, CancellationToken ct)
    {
        var rows = await Project(_context.Cuadrillas.AsNoTracking().Where(c => c.Id == idCuadrilla))
            .ToListAsync(ct);
        var row = rows.SingleOrDefault();
        if (row != null)
        {
            NormalizarFechas(row);
        }

        return row;
    }

    private static void NormalizarFechas(UltimaUbicacionCuadrillaDTO fila)
    {
        if (fila.Posicion == null)
        {
            return;
        }

        fila.Posicion.FechaHora = FechaHoraUtc.Normalizar(fila.Posicion.FechaHora);
        fila.Posicion.FechaRecepcion = FechaHoraUtc.Normalizar(fila.Posicion.FechaRecepcion);
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
