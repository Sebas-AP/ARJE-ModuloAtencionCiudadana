using System.Net;
using Microsoft.Extensions.DependencyInjection;

namespace ARJE.Api.Utilidades;

public static class ArjeCorsConfiguration
{
    public const string PolicyName = "permitirTodo";

    public static readonly string[] ExposedHeaders =
    [
        "x-total-count",
        "cantidadTotalRegistros"
    ];

    public static IServiceCollection AddArjeCors(
        this IServiceCollection services,
        string? origenesPermitidos,
        bool permitirOrigenesDeDesarrollo = false)
    {
        var permitidos = (origenesPermitidos ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        services.AddCors(options =>
        {
            options.AddPolicy(PolicyName, policy =>
            {
                policy.SetIsOriginAllowed(origen =>
                          permitidos.Contains(origen) ||
                          (permitirOrigenesDeDesarrollo && EsOrigenDeDesarrollo(origen)))
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials()
                      .WithExposedHeaders(ExposedHeaders);
            });
        });

        return services;
    }

    private static bool EsOrigenDeDesarrollo(string origen)
    {
        if (!Uri.TryCreate(origen, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (uri.Scheme is not ("http" or "https" or "exp"))
        {
            return false;
        }

        var host = uri.Host.Trim('[', ']');
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return IPAddress.TryParse(host, out var ip) && EsIpLocal(ip);
    }

    private static bool EsIpLocal(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip))
        {
            return true;
        }

        if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            var bytes = ip.GetAddressBytes();
            return bytes[0] == 10
                || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                || (bytes[0] == 192 && bytes[1] == 168)
                || (bytes[0] == 169 && bytes[1] == 254);
        }

        if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
        {
            return ip.IsIPv6LinkLocal
                || (ip.GetAddressBytes()[0] & 0xFE) == 0xFC;
        }

        return false;
    }
}
