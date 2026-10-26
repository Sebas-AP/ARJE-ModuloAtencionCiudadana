using System.Security.Claims;
using ARJE.Api.Controllers;
using ARJE.Api.DTOs.SeguimientoUbicacion;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace ARJE.Api.Tests;

public class LocationConcurrencyTests : IAsyncLifetime
{
    private readonly string databasePath = Path.Combine(Path.GetTempPath(), $"arje-location-{Guid.NewGuid():N}.db");
    private readonly IMapper mapper = new MapperConfiguration(
        c => c.AddProfile<AutoMapperProfiles>(),
        NullLoggerFactory.Instance).CreateMapper();
    private readonly IOutputCacheStore cache;
    private readonly FixedTimeProvider timeProvider = new(new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc));

    public LocationConcurrencyTests()
    {
        var services = new ServiceCollection().AddLogging().AddOutputCache().BuildServiceProvider();
        cache = services.GetRequiredService<IOutputCacheStore>();
    }

    [Fact]
    public async Task Dos_reintentos_concurrentes_con_el_mismo_id_y_contenido_guardan_una_sola_fila()
    {
        await SeedAsync();
        var first = CreateContext();
        var second = CreateContext();

        var results = await Task.WhenAll(
            Controller(first).Post(1, Batch(latitud: 21.88m)),
            Controller(second).Post(1, Batch(latitud: 21.88m)));

        Assert.All(results, result => Assert.IsType<OkObjectResult>(result));
        await using var verify = CreateContext();
        Assert.Single(await verify.SeguimientosUbicacion.ToListAsync());
    }

    [Fact]
    public async Task Dos_solicitudes_concurrentes_con_el_mismo_id_y_distinto_contenido_dejan_una_fila_y_un_conflicto()
    {
        await SeedAsync();
        var first = CreateContext();
        var second = CreateContext();

        var results = await Task.WhenAll(
            Controller(first).Post(1, Batch(latitud: 21.88m)),
            Controller(second).Post(1, Batch(latitud: 21.90m)));

        Assert.Contains(results, result => result is OkObjectResult);
        Assert.Contains(results, result => result is ConflictObjectResult);
        await using var verify = CreateContext();
        Assert.Single(await verify.SeguimientosUbicacion.ToListAsync());
    }

    private ApplicationDbContext CreateContext() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite($"Data Source={databasePath};Default Timeout=10")
            .Options);

    private async Task SeedAsync()
    {
        await using var context = CreateContext();
        await context.Database.EnsureDeletedAsync();
        await context.Database.EnsureCreatedAsync();
        context.Cuadrillas.Add(new Cuadrilla { Id = 1, Nombre = "Norte", UsuarioApp = "norte" });
        context.Reportes.Add(new Reporte
        {
            Id = 1, Descripcion = "Fuga", TipoProblema = TipoProblema.Fuga,
            IdCuadrillaAsignada = 1, Estatus = EstatusReporte.EnProceso
        });
        await context.SaveChangesAsync();
    }

    private SeguimientosUbicacionController Controller(ApplicationDbContext context)
    {
        var controller = new SeguimientosUbicacionController(context, mapper, cache, timeProvider);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "1"),
            new(ClaimTypes.Role, "Cuadrilla"),
            new("tipo", "Cuadrilla")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"))
            }
        };
        return controller;
    }

    private static SeguimientoUbicacionBatchDTO Batch(decimal latitud) => new()
    {
        Ubicaciones =
        [
            new SeguimientoUbicacionCreacionDTO
            {
                IdMuestra = "concurrente",
                FechaCaptura = new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc),
                Latitud = latitud,
                Longitud = -102.29m,
                PrecisionMetros = 5
            }
        ]
    };

    public Task InitializeAsync() => Task.CompletedTask;

    public Task DisposeAsync()
    {
        try
        {
            if (File.Exists(databasePath)) File.Delete(databasePath);
        }
        catch
        {
        }

        return Task.CompletedTask;
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;
        public FixedTimeProvider(DateTime now) => _now = new DateTimeOffset(now, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => _now;
    }
}
