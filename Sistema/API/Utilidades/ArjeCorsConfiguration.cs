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

    public static IServiceCollection AddArjeCors(this IServiceCollection services, string? origenesPermitidos)
    {
        var permitidos = (origenesPermitidos ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        services.AddCors(options =>
        {
            options.AddPolicy(PolicyName, policy =>
            {
                policy.SetIsOriginAllowed(origen => permitidos.Contains(origen))
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials()
                      .WithExposedHeaders(ExposedHeaders);
            });
        });

        return services;
    }
}
