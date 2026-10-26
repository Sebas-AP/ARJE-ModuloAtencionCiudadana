using System.Security.Claims;
using ARJE.Api.Controllers;
using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.DTOs.SeguimientoUbicacion;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Hubs;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace ARJE.Api.Tests;

public class UbicacionesRealtimeTests : IDisposable
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

    public UbicacionesRealtimeTests()
    {
        connection.Open();
        context = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options);
        context.Database.EnsureCreated();
        context.Cuadrillas.AddRange(
            new Cuadrilla { Id = 1, Nombre = "Norte", UsuarioApp = "norte" },
            new Cuadrilla { Id = 2, Nombre = "Sur", UsuarioApp = "sur" });
        context.Reportes.Add(new Reporte
        {
            Id = 1, Descripcion = "Fuga", TipoProblema = TipoProblema.Fuga,
            IdCuadrillaAsignada = 1, Estatus = EstatusReporte.EnProceso
        });
        context.SaveChanges();
        services = new ServiceCollection().AddLogging().AddOutputCache().BuildServiceProvider();
        cache = services.GetRequiredService<IOutputCacheStore>();
    }

    [Fact]
    public async Task El_publisher_se_invoca_despues_de_persistir_una_muestra()
    {
        var publicadoDespuesDeGuardar = false;
        var publisher = new Mock<IUbicacionesPublisher>();
        publisher
            .Setup(p => p.PublicarUltimaAsync(1, It.IsAny<CancellationToken>()))
            .Callback(() => publicadoDespuesDeGuardar = context.SeguimientosUbicacion.Any())
            .Returns(Task.CompletedTask);

        var result = await Controller(publisher.Object).Post(1, Batch());

        Assert.IsType<OkObjectResult>(result);
        Assert.True(publicadoDespuesDeGuardar);
        publisher.Verify(p => p.PublicarUltimaAsync(1, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task No_publica_ante_rechazo_de_autorizacion_o_payload_invalido()
    {
        var publisher = new Mock<IUbicacionesPublisher>();

        Assert.IsType<ForbidResult>(await Controller(publisher.Object, subject: "2").Post(1, Batch()));
        Assert.IsType<BadRequestObjectResult>(await Controller(publisher.Object)
            .Post(1, new SeguimientoUbicacionBatchDTO { Ubicaciones = [Muestra(latitud: 91)] }));

        publisher.Verify(p => p.PublicarUltimaAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Empty(await context.SeguimientosUbicacion.ToListAsync());
    }

    [Fact]
    public async Task No_publica_si_la_base_de_datos_falla()
    {
        var publisher = new Mock<IUbicacionesPublisher>();
        await using var falla = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .AddInterceptors(new FailingSaveInterceptor())
            .Options);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Controller(publisher.Object, context: falla).Post(1, Batch()));

        publisher.Verify(p => p.PublicarUltimaAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Un_fallo_de_emision_no_convierte_un_post_persistido_en_error()
    {
        var publisher = new Mock<IUbicacionesPublisher>();
        publisher
            .Setup(p => p.PublicarUltimaAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("hub caído"));

        var result = await Controller(publisher.Object).Post(1, Batch());

        Assert.IsType<OkObjectResult>(result);
        Assert.Single(await context.SeguimientosUbicacion.ToListAsync());
    }

    [Fact]
    public async Task Una_muestra_atrasada_emite_la_posicion_realmente_mas_reciente()
    {
        context.SeguimientosUbicacion.AddRange(
            new SeguimientoUbicacion
            {
                Id = 10, IdReporte = 1, IdCuadrilla = 1,
                Latitud = 21.80m, Longitud = -102.20m,
                FechaHora = Ahora.AddMinutes(-5), FechaRecepcion = Ahora.AddMinutes(-4)
            },
            new SeguimientoUbicacion
            {
                Id = 11, IdReporte = 1, IdCuadrilla = 1,
                Latitud = 21.81m, Longitud = -102.21m,
                FechaHora = Ahora.AddMinutes(-1), FechaRecepcion = Ahora
            },
            new SeguimientoUbicacion
            {
                Id = 12, IdReporte = 1, IdCuadrilla = 1,
                Latitud = 21.70m, Longitud = -102.10m,
                FechaHora = Ahora.AddMinutes(-30), FechaRecepcion = Ahora
            });
        await context.SaveChangesAsync();

        var clientProxy = new Mock<IClientProxy>();
        object?[]? argumentos = null;
        string? metodo = null;
        clientProxy
            .Setup(c => c.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(), It.IsAny<CancellationToken>()))
            .Callback<string, object?[], CancellationToken>((name, args, _) =>
            {
                metodo = name;
                argumentos = args;
            })
            .Returns(Task.CompletedTask);
        var clients = new Mock<IHubClients>();
        clients.SetupGet(c => c.All).Returns(clientProxy.Object);
        var hub = new Mock<IHubContext<UbicacionesHub>>();
        hub.SetupGet(h => h.Clients).Returns(clients.Object);

        var publisher = new UbicacionesPublisher(
            new UbicacionesCuadrillaService(context),
            hub.Object,
            NullLogger<UbicacionesPublisher>.Instance);

        await publisher.PublicarUltimaAsync(1, CancellationToken.None);

        Assert.Equal(UbicacionesPublisher.EventoUbicacionActualizada, metodo);
        Assert.NotNull(argumentos);
        var dto = Assert.IsType<UltimaUbicacionCuadrillaDTO>(argumentos![0]);
        Assert.Equal(11, dto.Posicion!.IdSeguimiento);
    }

    private SeguimientosUbicacionController Controller(
        IUbicacionesPublisher publisher,
        string subject = "1",
        ApplicationDbContext? context = null)
    {
        var controller = new SeguimientosUbicacionController(
            context ?? this.context,
            mapper,
            cache,
            timeProvider,
            publisher);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, subject),
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

    private static SeguimientoUbicacionBatchDTO Batch() => new()
    {
        Ubicaciones = [Muestra()]
    };

    private static SeguimientoUbicacionCreacionDTO Muestra(decimal latitud = 21.88m) => new()
    {
        Latitud = latitud,
        Longitud = -102.29m,
        IdMuestra = Guid.NewGuid().ToString("N"),
        FechaCaptura = Ahora
    };

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

    private sealed class FailingSaveInterceptor : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("fallo de base de datos");
    }
}
