using System.Net;
using System.Net.Http.Json;
using ARJE.Api.Controllers;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace ARJE.Api.Tests;

public class ReporteCreacionTests : IAsyncLifetime
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private WebApplication app = null!;
    private HttpClient client = null!;

    public async Task InitializeAsync()
    {
        await connection.OpenAsync();
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connection));
        builder.Services.AddAutoMapper(_ => { }, typeof(AutoMapperProfiles));
        builder.Services.AddOutputCache();
        builder.Services.AddSingleton<IClasificadorService, TestClassifier>();
        builder.Services.AddSingleton<IAlmacenadorArchivos, TestFileStorage>();
        builder.Services.AddSingleton<IJwtService, JwtService>();
        builder.Configuration["Jwt:Key"] = "test-only-report-creation-signing-key-123456789";
        builder.Configuration["Jwt:Issuer"] = "ReporteCreacionTests";
        builder.Configuration["Jwt:Audience"] = "ReporteCreacionTests";
        builder.Services.AddControllers().AddApplicationPart(typeof(ReportesController).Assembly);
        builder.Services.AddAuthentication();
        builder.Services.AddAuthorization();
        app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        using (var scope = app.Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.EnsureCreatedAsync();
        }
        await app.StartAsync();
        var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        client = new HttpClient { BaseAddress = new Uri(address) };
    }

    [Fact]
    public async Task Falta_numero_de_contrato_devuelve_bad_request()
    {
        using var response = await client.PostAsJsonAsync("api/reportes", new
        {
            tipoProblema = 1, descripcion = "Fuga en vía pública", latitud = 21.88, longitud = -102.29,
            nombreCiudadano = "Juan Pérez", telefonoCiudadano = "5512345678"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Falta_nombre_devuelve_bad_request()
    {
        using var response = await client.PostAsJsonAsync("api/reportes", new
        {
            tipoProblema = 1, descripcion = "Fuga en vía pública", latitud = 21.88, longitud = -102.29,
            numeroContrato = "A12345", telefonoCiudadano = "5512345678"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("55123456789")]
    [InlineData("55ABCDE678")]
    public async Task Telefono_invalido_devuelve_bad_request(string telefono)
    {
        using var response = await client.PostAsJsonAsync("api/reportes", new
        {
            tipoProblema = 1, descripcion = "Fuga en vía pública", latitud = 21.88, longitud = -102.29,
            numeroContrato = "A12345", nombreCiudadano = "Juan Pérez", telefonoCiudadano = telefono
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Reporte_valido_devuelve_folio_compuesto_y_conserva_prioridad_del_clasificador()
    {
        using var response = await client.PostAsJsonAsync("api/reportes", new
        {
            tipoProblema = 1, categoria = "Fuga en vía pública", descripcion = "Fuga en vía pública",
            latitud = 21.88, longitud = -102.29,
            numeroContrato = "A12345", nombreCiudadano = "Juan Pérez", telefonoCiudadano = "5512345678"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<ReporteCiudadanoRespuesta>();
        Assert.NotNull(dto);
        Assert.Equal($"FOL-{dto!.Id}-A12345", dto.Folio);
        // La categoría/tipoProblema elegidos por el ciudadano no deben ser sobreescritos por el clasificador.
        Assert.Equal("Fuga en vía pública", dto.Categoria);
        Assert.Equal(TipoProblema.Fuga, dto.TipoProblema);

        using var scope = app.Services.CreateScope();
        var reporte = await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Reportes.FindAsync(dto.Id);
        Assert.NotNull(reporte);
        // La prioridad sí debe venir del clasificador (TestClassifier devuelve Alta).
        Assert.Equal(PrioridadReporte.Alta, reporte!.Prioridad);
    }

    public async Task DisposeAsync()
    {
        client?.Dispose();
        if (app != null) await app.DisposeAsync();
        await connection.DisposeAsync();
    }

    private sealed class TestClassifier : IClasificadorService
    {
        public Task<ClasificacionResult> ClasificarReporteAsync(string descripcion) =>
            Task.FromResult(new ClasificacionResult
            {
                Categoria = "Categoría distinta del clasificador",
                TipoProblema = "Otro",
                Prioridad = PrioridadReporte.Alta
            });
    }

    private sealed class TestFileStorage : IAlmacenadorArchivos
    {
        public Task<ArchivoValidacionResult> ValidarArchivo(IFormFile archivo) =>
            Task.FromResult(new ArchivoValidacionResult { EsValido = true });
        public Task<ArchivoGuardadoResult> GuardarArchivo(string contenedor, IFormFile archivo) =>
            Task.FromResult(new ArchivoGuardadoResult { Exitoso = true, Url = "/test/evidencia.jpg" });
        public Task<ArchivoGuardadoResult> EditarArchivo(string contenedor, IFormFile archivo, string rutaArchivoActual) =>
            Task.FromResult(new ArchivoGuardadoResult { Exitoso = true, Url = "/test/evidencia-editada.jpg" });
        public Task BorrarArchivo(string contenedor, string rutaArchivo) => Task.CompletedTask;
    }

    private sealed class ReporteCiudadanoRespuesta
    {
        public int Id { get; set; }
        public string Folio { get; set; } = string.Empty;
        public TipoProblema TipoProblema { get; set; }
        public string? Categoria { get; set; }
    }
}
