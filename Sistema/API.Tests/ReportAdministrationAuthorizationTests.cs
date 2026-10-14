using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using ARJE.Api.Controllers;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace ARJE.Api.Tests;

public class ReportAdministrationAuthorizationTests : IAsyncLifetime
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private WebApplication app = null!;
    private HttpClient client = null!;
    private JwtService jwt = null!;
    private const string TestKey = "test-only-report-authorization-signing-key-123456789";

    public async Task InitializeAsync()
    {
        await connection.OpenAsync();
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = TestKey,
            ["Jwt:Issuer"] = "ReportAuthorizationTests",
            ["Jwt:Audience"] = "ReportAuthorizationTests"
        });
        jwt = new JwtService(builder.Configuration);
        builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connection));
        builder.Services.AddAutoMapper(typeof(AutoMapperProfiles));
        builder.Services.AddOutputCache();
        builder.Services.AddSingleton<IClasificadorService, TestClassifier>();
        builder.Services.AddSingleton<IAlmacenadorArchivos, TestFileStorage>();
        builder.Services.AddControllers().AddApplicationPart(typeof(ReportesController).Assembly);
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = "ReportAuthorizationTests",
                ValidAudience = "ReportAuthorizationTests",
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
                new Cuadrilla { Id = 1, Nombre = "One", UsuarioApp = "one" },
                new Cuadrilla { Id = 2, Nombre = "Two", UsuarioApp = "two" });
            db.Reportes.Add(new Reporte
            {
                Id = 1, Descripcion = "Original", Categoria = "Original", TipoProblema = TipoProblema.Fuga,
                IdCuadrillaAsignada = 2, Estatus = EstatusReporte.EnProceso, Prioridad = PrioridadReporte.Media
            });
            await db.SaveChangesAsync();
        }
        await app.StartAsync();
        var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        client = new HttpClient { BaseAddress = new Uri(address) };
    }

    [Theory]
    [InlineData("update")]
    [InlineData("category")]
    [InlineData("priority")]
    [InlineData("reevaluate")]
    [InlineData("assign")]
    [InlineData("supervise")]
    [InlineData("delete")]
    public async Task Cuadrilla_jwt_cannot_mutate_administrative_report_fields(string operation)
    {
        AuthenticateCuadrilla();
        using var response = await SendMutation(operation);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        using var scope = app.Services.CreateScope();
        var report = await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Reportes.FindAsync(1);
        Assert.NotNull(report);
        Assert.Equal("Original", report.Descripcion);
        Assert.Equal("Original", report.Categoria);
        Assert.Equal(PrioridadReporte.Media, report.Prioridad);
        Assert.Equal(2, report.IdCuadrillaAsignada);
        Assert.Null(report.IdCuadrillaSupervisora);
        Assert.Equal(EstatusReporte.EnProceso, report.Estatus);

        // A denied assignment must not enable the subsequent ownership-protected field write.
        using var statusResponse = await client.PutAsJsonAsync("api/reportes/1/estatus", EstatusReporte.Completado);
        Assert.Equal(HttpStatusCode.Forbidden, statusResponse.StatusCode);
    }

    [Theory]
    [InlineData("update")]
    [InlineData("category")]
    [InlineData("priority")]
    [InlineData("reevaluate")]
    [InlineData("assign")]
    [InlineData("supervise")]
    [InlineData("delete")]
    public async Task Administrator_jwt_retains_administrative_report_mutations(string operation)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            jwt.GenerarTokenUsuario(new UsuarioSistema { Id = 7, Usuario = "admin", Rol = RolUsuario.Administrador }));
        using var response = await SendMutation(operation);
        Assert.Equal(operation == "reevaluate" ? HttpStatusCode.OK : HttpStatusCode.NoContent, response.StatusCode);
        using var scope = app.Services.CreateScope();
        var report = await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Reportes.FindAsync(1);
        if (operation == "delete")
        {
            Assert.Null(report);
            return;
        }
        Assert.NotNull(report);
        switch (operation)
        {
            case "update": Assert.Equal("Updated", report.Descripcion); break;
            case "category": Assert.Equal("Updated", report.Categoria); break;
            case "priority":
            case "reevaluate": Assert.Equal(PrioridadReporte.Alta, report.Prioridad); break;
            case "assign":
                Assert.Equal(1, report.IdCuadrillaAsignada);
                Assert.Equal(EstatusReporte.Asignado, report.Estatus);
                break;
            case "supervise":
                Assert.Equal(1, report.IdCuadrillaSupervisora);
                Assert.Equal(EstatusReporte.EnSupervision, report.Estatus);
                break;
        }
    }

    private void AuthenticateCuadrilla() =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            jwt.GenerarTokenCuadrilla(new Cuadrilla { Id = 1, Nombre = "One", UsuarioApp = "one" }));

    private Task<HttpResponseMessage> SendMutation(string operation) => operation switch
    {
        "update" => client.PutAsJsonAsync("api/reportes/1", new { descripcion = "Updated", tipoProblema = 1, latitud = 25, longitud = -100 }),
        "category" => client.PutAsJsonAsync("api/reportes/1/categoria", new { categoria = "Updated" }),
        "priority" => client.PutAsJsonAsync("api/reportes/1/prioridad", new { prioridad = 3 }),
        "reevaluate" => client.PostAsync("api/reportes/1/revaluar-prioridad", null),
        "assign" => client.PutAsJsonAsync("api/reportes/1/asignar", new { idCuadrilla = 1 }),
        "supervise" => client.PutAsJsonAsync("api/reportes/1/supervision", new { idCuadrillaSupervisora = 1 }),
        "delete" => client.DeleteAsync("api/reportes/1"),
        _ => throw new ArgumentOutOfRangeException(nameof(operation))
    };

    public async Task DisposeAsync()
    {
        client?.Dispose();
        if (app != null) await app.DisposeAsync();
        await connection.DisposeAsync();
    }

    private sealed class TestClassifier : IClasificadorService
    {
        public Task<ClasificacionResult> ClasificarReporteAsync(string descripcion) =>
            Task.FromResult(new ClasificacionResult { Prioridad = PrioridadReporte.Alta });
    }

    private sealed class TestFileStorage : IAlmacenadorArchivos
    {
        public Task<string> GuardarArchivo(string contenedor, IFormFile archivo) => throw new NotSupportedException();
        public Task<string> EditarArchivo(string contenedor, IFormFile archivo, string rutaArchivoActual) => throw new NotSupportedException();
        public Task BorrarArchivo(string contenedor, string rutaArchivo) => throw new NotSupportedException();
    }
}
