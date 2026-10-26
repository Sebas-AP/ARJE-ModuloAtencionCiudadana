using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;
using ARJE.Api.Entidades;

namespace ARJE.Api.Tests;

public sealed class ReporteSchemaMigrationTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");

    public ReporteSchemaMigrationTests() => connection.Open();

    [Fact]
    public async Task Migrations_create_all_classification_columns_used_by_report_queries()
    {
        await using var context = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(connection)
                .Options);

        await context.Database.MigrateAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA table_info('Reportes');";
        await using var reader = await command.ExecuteReaderAsync();
        var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (await reader.ReadAsync())
        {
            columns.Add(reader.GetString(reader.GetOrdinal("name")));
        }

        Assert.Contains("Categoria", columns);
        Assert.Contains("ConfianzaIA", columns);
        Assert.Contains("RazonamientoIA", columns);
        Assert.Contains("ComentariosResolucion", columns);
        Assert.Contains("FechaSupervision", columns);
        Assert.Contains("NotasSupervision", columns);

        await using var locationCommand = connection.CreateCommand();
        locationCommand.CommandText = "PRAGMA table_info('SeguimientosUbicacion');";
        await using var locationReader = await locationCommand.ExecuteReaderAsync();
        var locationColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (await locationReader.ReadAsync())
        {
            locationColumns.Add(locationReader.GetString(locationReader.GetOrdinal("name")));
        }

        Assert.Contains("IdMuestra", locationColumns);
        Assert.Contains("FechaRecepcion", locationColumns);
        Assert.Contains("PrecisionMetros", locationColumns);

        await using var indexCommand = connection.CreateCommand();
        indexCommand.CommandText = "PRAGMA index_list('SeguimientosUbicacion');";
        await using var indexReader = await indexCommand.ExecuteReaderAsync();
        var indexes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (await indexReader.ReadAsync())
        {
            indexes.Add(indexReader.GetString(indexReader.GetOrdinal("name")));
        }

        Assert.Contains("IX_SeguimientosUbicacion_IdCuadrilla_IdMuestra", indexes);
        Assert.Contains("IX_SeguimientosUbicacion_IdCuadrilla_FechaHora_Id", indexes);
    }

    public void Dispose() => connection.Dispose();
}
