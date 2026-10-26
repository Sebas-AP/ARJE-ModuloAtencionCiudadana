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
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace ARJE.Api.Tests;

public class LocationCaptureMetadataTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly ApplicationDbContext context;
    private readonly IMapper mapper = new MapperConfiguration(
        c => c.AddProfile<AutoMapperProfiles>(),
        NullLoggerFactory.Instance).CreateMapper();
    private readonly ServiceProvider services;
    private readonly IOutputCacheStore cache;
    private static readonly DateTime Ahora = new(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc);
    private readonly FixedTimeProvider timeProvider = new(Ahora);

    public LocationCaptureMetadataTests()
    {
        connection.Open();
        context = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options);
        context.Database.EnsureCreated();
        context.Cuadrillas.AddRange(
            new Cuadrilla { Id = 1, Nombre = "Norte", UsuarioApp = "norte" },
            new Cuadrilla { Id = 2, Nombre = "Sur", UsuarioApp = "sur" });
        context.Reportes.AddRange(
            new Reporte
            {
                Id = 1, Descripcion = "Fuga", TipoProblema = TipoProblema.Fuga,
                IdCuadrillaAsignada = 1, Estatus = EstatusReporte.EnProceso
            },
            new Reporte
            {
                Id = 2, Descripcion = "Fuga dos", TipoProblema = TipoProblema.Fuga,
                IdCuadrillaAsignada = 1, Estatus = EstatusReporte.EnProceso
            });
        context.SaveChanges();
        services = new ServiceCollection().AddLogging().AddOutputCache().BuildServiceProvider();
        cache = services.GetRequiredService<IOutputCacheStore>();
    }

    [Fact]
    public async Task Rechaza_lote_vacio_mas_de_200_o_fuera_de_rango()
    {
        var controller = Controller();

        Assert.IsType<BadRequestObjectResult>(await controller.Post(1, new SeguimientoUbicacionBatchDTO()));
        Assert.IsType<BadRequestObjectResult>(await controller.Post(1, Batch(201)));
        Assert.IsType<BadRequestObjectResult>(await controller.Post(1,
            new SeguimientoUbicacionBatchDTO { Ubicaciones = [Muestra(latitud: 91)] }));
        Assert.IsType<BadRequestObjectResult>(await controller.Post(1,
            new SeguimientoUbicacionBatchDTO { Ubicaciones = [Muestra(longitud: -181)] }));
        Assert.IsType<BadRequestObjectResult>(await controller.Post(1,
            new SeguimientoUbicacionBatchDTO { Ubicaciones = [Muestra(precision: -1)] }));
        Assert.Empty(await context.SeguimientosUbicacion.ToListAsync());
    }

    [Fact]
    public async Task Conserva_la_hora_de_captura_antigua_y_registra_la_recepcion_actual()
    {
        var captura = Ahora.AddMinutes(-10);
        var controller = Controller();

        var result = await controller.Post(1, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(captura: captura, idMuestra: "muestra-1", precision: 8.5)]
        });

        Assert.IsType<OkObjectResult>(result);
        context.ChangeTracker.Clear();
        var point = Assert.Single(await context.SeguimientosUbicacion.ToListAsync());
        Assert.Equal(captura, point.FechaHora);
        Assert.Equal(Ahora, point.FechaRecepcion);
        Assert.Equal("muestra-1", point.IdMuestra);
        Assert.Equal(8.5, point.PrecisionMetros);
        Assert.Equal(1, point.IdCuadrilla);
        Assert.Equal(1, point.IdReporte);
    }

    [Fact]
    public async Task Rechaza_capturas_no_utc_o_fuera_de_la_tolerancia_de_reloj()
    {
        var controller = Controller();

        var noUtc = await controller.Post(1, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(captura: DateTime.SpecifyKind(Ahora, DateTimeKind.Unspecified), idMuestra: "no-utc")]
        });
        var futuro = await controller.Post(1, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(captura: Ahora.AddSeconds(121), idMuestra: "futuro")]
        });
        var anteriorAlEpoch = await controller.Post(1, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(captura: DateTime.UnixEpoch.AddSeconds(-1), idMuestra: "epoch")]
        });

        Assert.IsType<BadRequestObjectResult>(noUtc);
        Assert.IsType<BadRequestObjectResult>(futuro);
        Assert.IsType<BadRequestObjectResult>(anteriorAlEpoch);
        Assert.Empty(await context.SeguimientosUbicacion.ToListAsync());
    }

    [Fact]
    public async Task Conserva_una_captura_futura_dentro_de_la_tolerancia()
    {
        var captura = Ahora.AddSeconds(60);
        var controller = Controller();

        Assert.IsType<OkObjectResult>(await controller.Post(1, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(captura: captura, idMuestra: "futura-tolerada")]
        }));

        context.ChangeTracker.Clear();
        var point = Assert.Single(await context.SeguimientosUbicacion.ToListAsync());
        Assert.Equal(captura, point.FechaHora);
    }

    [Fact]
    public async Task Un_reintento_identificado_identico_no_duplica_incluso_con_captura_futura_tolerada()
    {
        var captura = Ahora.AddSeconds(60);
        var controller = Controller();
        var batch = new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(captura: captura, idMuestra: "retry-1", precision: 4)]
        };

        Assert.IsType<OkObjectResult>(await controller.Post(1, batch));
        Assert.IsType<OkObjectResult>(await controller.Post(1, batch));

        context.ChangeTracker.Clear();
        var point = Assert.Single(await context.SeguimientosUbicacion.ToListAsync());
        Assert.Equal("retry-1", point.IdMuestra);
    }

    [Fact]
    public async Task Reutilizar_idMuestra_con_otro_contenido_u_otro_reporte_devuelve_conflicto()
    {
        var controller = Controller();
        var original = new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(idMuestra: "estable", captura: Ahora, latitud: 21.88m, longitud: -102.29m)]
        };

        Assert.IsType<OkObjectResult>(await controller.Post(1, original));
        Assert.IsType<ConflictObjectResult>(await controller.Post(1, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(idMuestra: "estable", captura: Ahora, latitud: 21.90m, longitud: -102.29m)]
        }));
        Assert.IsType<ConflictObjectResult>(await controller.Post(2, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(idMuestra: "estable", captura: Ahora, latitud: 21.88m, longitud: -102.29m)]
        }));

        context.ChangeTracker.Clear();
        var point = Assert.Single(await context.SeguimientosUbicacion.ToListAsync());
        Assert.Equal(1, point.IdReporte);
    }

    [Fact]
    public async Task Rechaza_idMuestra_y_fechaCaptura_enviados_por_separado()
    {
        var controller = Controller();

        Assert.IsType<BadRequestObjectResult>(await controller.Post(1, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [new SeguimientoUbicacionCreacionDTO { Latitud = 21.88m, Longitud = -102.29m, IdMuestra = "solo-id" }]
        }));
        Assert.IsType<BadRequestObjectResult>(await controller.Post(1, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [new SeguimientoUbicacionCreacionDTO { Latitud = 21.88m, Longitud = -102.29m, FechaCaptura = Ahora }]
        }));
        Assert.Empty(await context.SeguimientosUbicacion.ToListAsync());
    }

    [Fact]
    public async Task El_post_legado_sin_metadatos_usa_el_reloj_del_servidor_y_no_deduplica()
    {
        var controller = Controller();
        var legacy = new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [new SeguimientoUbicacionCreacionDTO { Latitud = 21.88m, Longitud = -102.29m }]
        };

        Assert.IsType<OkObjectResult>(await controller.Post(1, legacy));
        Assert.IsType<OkObjectResult>(await controller.Post(1, legacy));

        context.ChangeTracker.Clear();
        var points = await context.SeguimientosUbicacion.OrderBy(p => p.Id).ToListAsync();
        Assert.Equal(2, points.Count);
        Assert.All(points, point =>
        {
            Assert.Null(point.IdMuestra);
            Assert.Equal(Ahora, point.FechaHora);
            Assert.Equal(Ahora, point.FechaRecepcion);
        });
    }

    [Fact]
    public async Task Cuadrilla_ajena_no_puede_escribir_muestras()
    {
        var controller = Controller(subject: "2");
        Assert.IsType<ForbidResult>(await controller.Post(1, new SeguimientoUbicacionBatchDTO
        {
            Ubicaciones = [Muestra(idMuestra: "ajena", captura: Ahora)]
        }));
        Assert.Empty(await context.SeguimientosUbicacion.ToListAsync());
    }

    private SeguimientosUbicacionController Controller(string? subject = "1")
    {
        var controller = new SeguimientosUbicacionController(context, mapper, cache, timeProvider);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, subject!),
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

    private static SeguimientoUbicacionBatchDTO Batch(int count) => new()
    {
        Ubicaciones = Enumerable.Range(0, count)
            .Select(i => new SeguimientoUbicacionCreacionDTO { Latitud = 21.8m, Longitud = -102.3m, IdMuestra = $"m-{i}", FechaCaptura = Ahora })
            .ToList()
    };

    private static SeguimientoUbicacionCreacionDTO Muestra(
        decimal latitud = 21.88m,
        decimal longitud = -102.29m,
        string? idMuestra = null,
        DateTime? captura = null,
        double? precision = null)
    {
        if (idMuestra == null && captura == null)
        {
            return new SeguimientoUbicacionCreacionDTO
            {
                Latitud = latitud,
                Longitud = longitud,
                PrecisionMetros = precision
            };
        }

        return new SeguimientoUbicacionCreacionDTO
        {
            Latitud = latitud,
            Longitud = longitud,
            IdMuestra = idMuestra,
            FechaCaptura = captura ?? Ahora,
            PrecisionMetros = precision
        };
    }

    public void Dispose()
    {
        context.Dispose();
        connection.Dispose();
        services.Dispose();
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;
        public FixedTimeProvider(DateTime now) => _now = new DateTimeOffset(now, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => _now;
    }
}
