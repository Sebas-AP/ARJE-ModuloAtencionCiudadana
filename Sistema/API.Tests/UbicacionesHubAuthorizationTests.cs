using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using ARJE.Api.Controllers;
using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Hubs;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace ARJE.Api.Tests;

public class UbicacionesHubAuthorizationTests : IAsyncLifetime
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private WebApplication app = null!;
    private TestServer server = null!;
    private HttpClient client = null!;
    private JwtService jwt = null!;
    private const string TestKey = "test-only-hub-authorization-signing-key-123456789";
    private const string Issuer = "HubAuthorizationTests";
    private const string Audience = "HubAuthorizationTests";

    public async Task InitializeAsync()
    {
        await connection.OpenAsync();
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = TestKey,
            ["Jwt:Issuer"] = Issuer,
            ["Jwt:Audience"] = Audience
        });
        jwt = new JwtService(builder.Configuration);
        builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connection));
        builder.Services.AddAutoMapper(_ => { }, typeof(AutoMapperProfiles));
        builder.Services.AddOutputCache();
        builder.Services.AddScoped<IUbicacionesCuadrillaService, UbicacionesCuadrillaService>();
        builder.Services.AddScoped<IUbicacionesPublisher, UbicacionesPublisher>();
        builder.Services.AddSingleton<IJwtService>(jwt);
        builder.Services.AddSignalR();
        builder.Services.AddControllers().AddApplicationPart(typeof(CuadrillasController).Assembly);
        builder.Services.AddArjeJwtAuthentication(builder.Configuration);
        builder.Services.AddAuthorization();

        app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        app.MapGet("/api/protegido", () => Results.Ok(new { ok = true })).RequireAuthorization();
        app.MapHub<UbicacionesHub>(ArjeAuthenticationConfiguration.HubPath, options =>
        {
            options.CloseOnAuthenticationExpiration = true;
        });

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.Cuadrillas.Add(new Cuadrilla { Id = 1, Nombre = "Norte", UsuarioApp = "norte" });
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
        server = app.GetTestServer();
        client = server.CreateClient();
    }

    [Fact]
    public async Task El_hub_rechaza_handshake_anonimo_y_de_cuadrilla_y_acepta_administrador()
    {
        await Assert.ThrowsAsync<HttpRequestException>(() => StartConnectionAsync(null));

        var crewToken = jwt.GenerarTokenCuadrilla(new Cuadrilla { Id = 1, Nombre = "Norte", UsuarioApp = "norte" });
        await Assert.ThrowsAsync<HttpRequestException>(() => StartConnectionAsync(crewToken));

        var adminToken = AdminToken();
        await using var connection = CreateConnection(adminToken);
        await connection.StartAsync();
        Assert.Equal(HubConnectionState.Connected, connection.State);
    }

    [Fact]
    public async Task Un_token_vencido_no_abre_el_hub()
    {
        var expired = CreateExpiredToken();

        await Assert.ThrowsAsync<HttpRequestException>(() => StartConnectionAsync(expired));
    }

    [Fact]
    public async Task El_access_token_por_query_solo_autentica_la_ruta_del_hub()
    {
        var token = AdminToken();

        using var queryOnly = await client.GetAsync($"/api/protegido?access_token={token}");
        Assert.Equal(HttpStatusCode.Unauthorized, queryOnly.StatusCode);

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/protegido");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var authorized = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, authorized.StatusCode);
    }

    [Fact]
    public async Task El_administrador_conectado_recibe_la_ultima_ubicacion_publicada()
    {
        await using var connection = CreateConnection(AdminToken());
        var recibida = new TaskCompletionSource<UltimaUbicacionCuadrillaDTO>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<UltimaUbicacionCuadrillaDTO>(
            UbicacionesPublisher.EventoUbicacionActualizada,
            dto => recibida.TrySetResult(dto));
        await connection.StartAsync();

        using (var scope = app.Services.CreateScope())
        {
            var publisher = scope.ServiceProvider.GetRequiredService<IUbicacionesPublisher>();
            await publisher.PublicarUltimaAsync(1, CancellationToken.None);
        }

        var completada = await Task.WhenAny(recibida.Task, Task.Delay(TimeSpan.FromSeconds(5)));
        Assert.Same(recibida.Task, completada);
        var dto = await recibida.Task;
        Assert.Equal(1, dto.IdCuadrilla);
        Assert.NotNull(dto.Posicion);
        Assert.Equal(21.88m, dto.Posicion!.Latitud);
    }

    private HubConnection CreateConnection(string? token) =>
        new HubConnectionBuilder()
            .WithUrl(new Uri(server.BaseAddress, "hubs/ubicaciones"), options =>
            {
                options.HttpMessageHandlerFactory = _ => server.CreateHandler();
                options.Transports = HttpTransportType.LongPolling;
                options.AccessTokenProvider = () => Task.FromResult(token);
            })
            .Build();

    private async Task StartConnectionAsync(string? token)
    {
        await using var connection = CreateConnection(token);
        await connection.StartAsync();
    }

    private string AdminToken() =>
        jwt.GenerarTokenUsuario(new UsuarioSistema { Id = 7, Usuario = "admin", Rol = RolUsuario.Administrador });

    private static string CreateExpiredToken()
    {
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestKey)),
            SecurityAlgorithms.HmacSha256);
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, "7"),
                new Claim(ClaimTypes.Role, "Administrador"),
                new Claim("tipo", "Usuario")
            ]),
            NotBefore = DateTime.UtcNow.AddMinutes(-2),
            Expires = DateTime.UtcNow.AddMinutes(-1),
            Issuer = Issuer,
            Audience = Audience,
            SigningCredentials = credentials
        };
        return new JwtSecurityTokenHandler().WriteToken(new JwtSecurityTokenHandler().CreateToken(descriptor));
    }

    public async Task DisposeAsync()
    {
        client?.Dispose();
        if (app != null) await app.DisposeAsync();
        await connection.DisposeAsync();
    }
}
