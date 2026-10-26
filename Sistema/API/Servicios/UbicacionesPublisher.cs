using ARJE.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace ARJE.Api.Servicios;

public class UbicacionesPublisher : IUbicacionesPublisher
{
    public const string EventoUbicacionActualizada = "ubicacionCuadrillaActualizada";

    private readonly IUbicacionesCuadrillaService _ubicaciones;
    private readonly IHubContext<UbicacionesHub> _hubContext;
    private readonly ILogger<UbicacionesPublisher> _logger;

    public UbicacionesPublisher(
        IUbicacionesCuadrillaService ubicaciones,
        IHubContext<UbicacionesHub> hubContext,
        ILogger<UbicacionesPublisher> logger)
    {
        _ubicaciones = ubicaciones;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task PublicarUltimaAsync(int idCuadrilla, CancellationToken ct)
    {
        var ultima = await _ubicaciones.GetUltimaAsync(idCuadrilla, ct);
        if (ultima?.Posicion == null)
        {
            return;
        }

        try
        {
            await _hubContext.Clients.All.SendAsync(EventoUbicacionActualizada, ultima, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "No se pudo emitir la ubicación de la cuadrilla {IdCuadrilla}; la persistencia se conserva.",
                idCuadrilla);
        }
    }
}
