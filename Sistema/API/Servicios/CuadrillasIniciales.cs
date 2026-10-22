using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using Microsoft.EntityFrameworkCore;

namespace ARJE.Api.Servicios;

/// <summary>
/// Registra cuadrillas operativas mínimas para instalaciones nuevas y existentes.
/// Se identifica cada una por su usuario de aplicación, por lo que nunca reemplaza
/// una cuadrilla creada o modificada por un administrador.
/// </summary>
public static class CuadrillasIniciales
{
    private sealed record Definicion(string Nombre, string Integrantes, string UsuarioApp, string Password);

    private static readonly Definicion[] Definiciones =
    {
        new("Cuadrilla Norte", "Ana Torres, Carlos Rivas", "cuadrilla_norte", "Norte2026!"),
        new("Cuadrilla Centro", "María López, Diego Herrera", "cuadrilla_centro", "Centro2026!"),
        new("Cuadrilla Sur", "Lucía García, Roberto Méndez", "cuadrilla_sur", "Sur2026!")
    };

    public static async Task AsegurarRegistradasAsync(ApplicationDbContext context)
    {
        var usuariosExistentes = (await context.Cuadrillas
            .Select(c => c.UsuarioApp)
            .ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var faltantes = Definiciones
            .Where(definicion => !usuariosExistentes.Contains(definicion.UsuarioApp))
            .Select(definicion => new Cuadrilla
            {
                Nombre = definicion.Nombre,
                Integrantes = definicion.Integrantes,
                UsuarioApp = definicion.UsuarioApp,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(definicion.Password),
                EstatusDisponibilidad = EstatusCuadrilla.Disponible
            })
            .ToList();

        if (faltantes.Count == 0)
        {
            return;
        }

        context.Cuadrillas.AddRange(faltantes);
        await context.SaveChangesAsync();
    }
}
