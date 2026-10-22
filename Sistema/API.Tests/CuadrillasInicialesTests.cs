using ARJE.Api.Entidades;
using ARJE.Api.Servicios;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ARJE.Api.Tests;

public class CuadrillasInicialesTests
{
    [Fact]
    public async Task Seeder_registers_missing_crews_once_without_replacing_existing_records()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlite(connection).Options;
        await using var context = new ApplicationDbContext(options);
        await context.Database.EnsureCreatedAsync();
        context.Cuadrillas.Add(new Cuadrilla
        {
            Nombre = "Cuadrilla test existente",
            UsuarioApp = "cuadrilla_norte",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("ContraseñaPropia123!")
        });
        await context.SaveChangesAsync();

        await CuadrillasIniciales.AsegurarRegistradasAsync(context);
        await CuadrillasIniciales.AsegurarRegistradasAsync(context);

        var cuadrillas = await context.Cuadrillas.OrderBy(c => c.UsuarioApp).ToListAsync();
        Assert.Equal(3, cuadrillas.Count);
        var existente = Assert.Single(cuadrillas, c => c.UsuarioApp == "cuadrilla_norte");
        Assert.Equal("Cuadrilla test existente", existente.Nombre);
        var centro = Assert.Single(cuadrillas, c => c.UsuarioApp == "cuadrilla_centro");
        Assert.True(BCrypt.Net.BCrypt.Verify("Centro2026!", centro.PasswordHash));
    }
}
