using System.Net;
using ARJE.Api.Utilidades;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace ARJE.Api.Tests;

public class CorsConfigurationTests : IAsyncLifetime
{
    private const string AllowedOrigin = "http://localhost:5173";
    private WebApplication app = null!;
    private HttpClient client = null!;

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();
        builder.Services.AddArjeCors($"{AllowedOrigin}, http://localhost:8081");
        builder.Services.AddRouting();
        app = builder.Build();
        app.UseCors(ArjeCorsConfiguration.PolicyName);
        app.MapGet("/headers", (HttpContext context) =>
        {
            context.AgregarHeaderCantidadTotalRegistros(235);
            return Results.Ok(new { ok = true });
        });
        await app.StartAsync();
        client = app.GetTestServer().CreateClient();
    }

    [Fact]
    public async Task El_preflight_acepta_solo_origenes_explicitos()
    {
        using var allowed = await Preflight(AllowedOrigin);
        Assert.Equal(HttpStatusCode.NoContent, allowed.StatusCode);
        Assert.Equal(AllowedOrigin, allowed.Headers.GetValues("Access-Control-Allow-Origin").Single());

        using var rejected = await Preflight("https://evil.example");
        Assert.False(rejected.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Expone_los_encabezados_de_paginacion_en_respuestas_get()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/headers");
        request.Headers.Add("Origin", AllowedOrigin);
        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("235", response.Headers.GetValues("x-total-count").Single());
        var exposed = response.Headers.GetValues("Access-Control-Expose-Headers").Single();
        Assert.Contains("x-total-count", exposed);
        Assert.Contains("cantidadTotalRegistros", exposed);
    }

    private Task<HttpResponseMessage> Preflight(string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/headers");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "authorization");
        return client.SendAsync(request);
    }

    public async Task DisposeAsync()
    {
        client?.Dispose();
        if (app != null) await app.DisposeAsync();
    }
}

public class CorsDevelopmentOriginTests : IAsyncLifetime
{
    private const string AllowedOrigin = "https://tu-frontend.vercel.app";
    private WebApplication app = null!;
    private HttpClient client = null!;

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();
        builder.Services.AddArjeCors(AllowedOrigin, permitirOrigenesDeDesarrollo: true);
        builder.Services.AddRouting();
        app = builder.Build();
        app.UseCors(ArjeCorsConfiguration.PolicyName);
        app.MapGet("/headers", () => Results.Ok(new { ok = true }));
        await app.StartAsync();
        client = app.GetTestServer().CreateClient();
    }

    [Theory]
    [InlineData("http://localhost:8082")]
    [InlineData("http://127.0.0.1:8082")]
    [InlineData("http://192.168.1.70:8082")]
    [InlineData("http://10.0.0.5:8082")]
    [InlineData("http://172.16.4.10:8082")]
    public async Task En_desarrollo_acepta_origenes_locales_y_de_red_privada(string origin)
    {
        using var response = await Preflight(origin);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(origin, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task En_desarrollo_sigue_rechazando_origenes_publicos()
    {
        using var response = await Preflight("https://evil.example");

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private Task<HttpResponseMessage> Preflight(string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/headers");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "authorization");
        return client.SendAsync(request);
    }

    public async Task DisposeAsync()
    {
        client?.Dispose();
        if (app != null) await app.DisposeAsync();
    }
}
