using System.Data.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using ARJE.Api.Controllers;
using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace ARJE.Api.Tests;

public class UltimasUbicacionesCuadrillaTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly ApplicationDbContext context;
    private static readonly DateTime Base = new(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc);

    public UltimasUbicacionesCuadrillaTests()
    {
        connection.Open();
        context = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options);
        context.Database.EnsureCreated();
    }

    [Fact]
    public async Task Devuelve_una_fila_por_cuadrilla_con_la_muestra_mas_reciente_y_sin_gps()
    {
        await SeedAsync();
        var service = new UbicacionesCuadrillaService(context);

        var rows = await service.GetUltimasAsync(CancellationToken.None);

        Assert.Equal(new[] { 1, 2, 3, 4 }, rows.Select(r => r.IdCuadrilla).ToArray());
        var norte = rows.Single(r => r.IdCuadrilla == 1);
        Assert.NotNull(norte.Posicion);
        Assert.Equal(11, norte.Posicion!.IdSeguimiento);
        Assert.Equal(2, norte.Posicion.IdReporte);
        Assert.Equal("FOL-2", norte.Posicion.FolioReporte);
        Assert.Equal(Base.AddMinutes(20), norte.Posicion.FechaHora);

        var sur = rows.Single(r => r.IdCuadrilla == 2);
        Assert.Equal(12, sur.Posicion!.IdSeguimiento);

        var sinGps = rows.Single(r => r.IdCuadrilla == 3);
        Assert.Null(sinGps.Posicion);

        var empate = rows.Single(r => r.IdCuadrilla == 4);
        Assert.Equal(14, empate.Posicion!.IdSeguimiento);
    }

    [Fact]
    public async Task Una_intervencion_cerrada_sigue_siendo_la_ultima_posicion_conocida()
    {
        await SeedAsync();
        context.Reportes.Add(new Reporte
        {
            Id = 5, Descripcion = "Cerrado", TipoProblema = TipoProblema.Fuga,
            IdCuadrillaAsignada = 1, Estatus = EstatusReporte.Cerrado
        });
        context.SeguimientosUbicacion.Add(new SeguimientoUbicacion
        {
            Id = 20, IdReporte = 5, IdCuadrilla = 1,
            Latitud = 21.85m, Longitud = -102.31m,
            FechaHora = Base.AddMinutes(40), FechaRecepcion = Base.AddMinutes(41)
        });
        await context.SaveChangesAsync();

        var norte = await new UbicacionesCuadrillaService(context).GetUltimaAsync(1, CancellationToken.None);

        Assert.NotNull(norte?.Posicion);
        Assert.Equal(20, norte!.Posicion!.IdSeguimiento);
        Assert.Equal(EstatusReporte.Cerrado, (await context.Reportes.FindAsync(5))!.Estatus);
    }

    [Fact]
    public async Task Reasignar_el_reporte_no_cambia_la_cuadrilla_historica_de_la_muestra()
    {
        await SeedAsync();
        var reporte = await context.Reportes.FindAsync(1);
        reporte!.IdCuadrillaAsignada = 2;
        await context.SaveChangesAsync();

        var service = new UbicacionesCuadrillaService(context);
        var norte = await service.GetUltimaAsync(1, CancellationToken.None);
        var sur = await service.GetUltimaAsync(2, CancellationToken.None);

        Assert.Contains(norte!.Posicion!.IdSeguimiento, new[] { 10, 11 });
        Assert.Equal(12, sur!.Posicion!.IdSeguimiento);
    }

    [Fact]
    public async Task El_agregado_se_resuelve_en_una_sola_consulta_sql()
    {
        await SeedAsync();
        var counter = new CommandCounter();
        await using var counted = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .AddInterceptors(counter)
            .Options);

        var rows = await new UbicacionesCuadrillaService(counted).GetUltimasAsync(CancellationToken.None);

        Assert.Equal(4, rows.Count);
        Assert.Equal(1, counter.SelectCount);
    }

    private async Task SeedAsync()
    {
        context.Cuadrillas.AddRange(
            new Cuadrilla { Id = 1, Nombre = "Norte", UsuarioApp = "norte" },
            new Cuadrilla { Id = 2, Nombre = "Sur", UsuarioApp = "sur" },
            new Cuadrilla { Id = 3, Nombre = "Sin GPS", UsuarioApp = "sin" },
            new Cuadrilla { Id = 4, Nombre = "Empate", UsuarioApp = "empate" });
        context.Reportes.AddRange(
            new Reporte { Id = 1, Descripcion = "Uno", TipoProblema = TipoProblema.Fuga, IdCuadrillaAsignada = 1, Estatus = EstatusReporte.Completado },
            new Reporte { Id = 2, Descripcion = "Dos", TipoProblema = TipoProblema.Fuga, IdCuadrillaAsignada = 1, Estatus = EstatusReporte.EnProceso },
            new Reporte { Id = 3, Descripcion = "Tres", TipoProblema = TipoProblema.Fuga, IdCuadrillaAsignada = 2, Estatus = EstatusReporte.Cerrado },
            new Reporte { Id = 4, Descripcion = "Cuatro", TipoProblema = TipoProblema.Fuga, IdCuadrillaAsignada = 4, Estatus = EstatusReporte.EnProceso });
        context.SeguimientosUbicacion.AddRange(
            new SeguimientoUbicacion
            {
                Id = 10, IdReporte = 1, IdCuadrilla = 1,
                Latitud = 21.80m, Longitud = -102.20m,
                FechaHora = Base, FechaRecepcion = Base.AddMinutes(1)
            },
            new SeguimientoUbicacion
            {
                Id = 11, IdReporte = 2, IdCuadrilla = 1,
                Latitud = 21.81m, Longitud = -102.21m,
                FechaHora = Base.AddMinutes(20), FechaRecepcion = Base.AddMinutes(21),
                IdMuestra = "norte-11", PrecisionMetros = 5
            },
            new SeguimientoUbicacion
            {
                Id = 12, IdReporte = 3, IdCuadrilla = 2,
                Latitud = 21.70m, Longitud = -102.10m,
                FechaHora = Base.AddMinutes(5), FechaRecepcion = Base.AddMinutes(6)
            },
            new SeguimientoUbicacion
            {
                Id = 13, IdReporte = 4, IdCuadrilla = 4,
                Latitud = 21.60m, Longitud = -102.00m,
                FechaHora = Base.AddMinutes(30), FechaRecepcion = Base.AddMinutes(31)
            },
            new SeguimientoUbicacion
            {
                Id = 14, IdReporte = 4, IdCuadrilla = 4,
                Latitud = 21.61m, Longitud = -102.01m,
                FechaHora = Base.AddMinutes(30), FechaRecepcion = Base.AddMinutes(31)
            });
        await context.SaveChangesAsync();
    }

    public void Dispose()
    {
        context.Dispose();
        connection.Dispose();
    }

    private sealed class CommandCounter : DbCommandInterceptor
    {
        public int SelectCount { get; private set; }

        public override InterceptionResult<DbDataReader> ReaderExecuting(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result)
        {
            Count(command);
            return base.ReaderExecuting(command, eventData, result);
        }

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default)
        {
            Count(command);
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }

        private void Count(DbCommand command)
        {
            if (command.CommandText.Contains("SELECT", StringComparison.OrdinalIgnoreCase))
            {
                SelectCount++;
            }
        }
    }
}

public class UltimasUbicacionesEndpointTests : IAsyncLifetime
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private WebApplication app = null!;
    private HttpClient client = null!;
    private JwtService jwt = null!;
    private const string TestKey = "test-only-ultimas-ubicaciones-signing-key-123456789";

    public async Task InitializeAsync()
    {
        await connection.OpenAsync();
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = TestKey,
            ["Jwt:Issuer"] = "UltimasUbicacionesTests",
            ["Jwt:Audience"] = "UltimasUbicacionesTests"
        });
        jwt = new JwtService(builder.Configuration);
        builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connection));
        builder.Services.AddAutoMapper(_ => { }, typeof(AutoMapperProfiles));
        builder.Services.AddOutputCache();
        builder.Services.AddScoped<IUbicacionesCuadrillaService, UbicacionesCuadrillaService>();
        builder.Services.AddSingleton<IJwtService>(jwt);
        builder.Services.AddControllers().AddApplicationPart(typeof(CuadrillasController).Assembly);
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = "UltimasUbicacionesTests",
                ValidAudience = "UltimasUbicacionesTests",
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestKey)),
                ClockSkew = TimeSpan.Zero
            };
        });
        builder.Services.AddAuthorization();
        app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.Cuadrillas.AddRange(
                new Cuadrilla { Id = 1, Nombre = "Norte", UsuarioApp = "norte" },
                new Cuadrilla { Id = 2, Nombre = "Sin GPS", UsuarioApp = "sin" });
            db.Reportes.Add(new Reporte
            {
                Id = 1, Descripcion = "Fuga", TipoProblema = TipoProblema.Fuga,
                IdCuadrillaAsignada = 1, Estatus = EstatusReporte.EnProceso
            });
            db.SeguimientosUbicacion.Add(new SeguimientoUbicacion
            {
                Id = 1, IdReporte = 1, IdCuadrilla = 1,
                Latitud = 21.88m, Longitud = -102.29m,
                FechaHora = DateTime.UtcNow, FechaRecepcion = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        await app.StartAsync();
        var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        client = new HttpClient { BaseAddress = new Uri(address) };
    }

    [Fact]
    public async Task El_endpoint_exige_administrador_y_devuelve_el_snapshot_sin_cache()
    {
        using var anonymous = await client.GetAsync("api/cuadrillas/ubicaciones/ultimas");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            jwt.GenerarTokenCuadrilla(new Cuadrilla { Id = 1, Nombre = "Norte", UsuarioApp = "norte" }));
        using var forbidden = await client.GetAsync("api/cuadrillas/ubicaciones/ultimas");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            jwt.GenerarTokenUsuario(new UsuarioSistema { Id = 7, Usuario = "admin", Rol = RolUsuario.Administrador }));
        using var response = await client.GetAsync("api/cuadrillas/ubicaciones/ultimas");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        var rows = await response.Content.ReadFromJsonAsync<List<UltimaUbicacionCuadrillaDTO>>();
        Assert.NotNull(rows);
        Assert.Equal(2, rows!.Count);
        Assert.NotNull(rows.Single(r => r.IdCuadrilla == 1).Posicion);
        Assert.Null(rows.Single(r => r.IdCuadrilla == 2).Posicion);
    }

    public async Task DisposeAsync()
    {
        client?.Dispose();
        if (app != null) await app.DisposeAsync();
        await connection.DisposeAsync();
    }
}
