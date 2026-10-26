using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ARJE.Api.Hubs;

[Authorize(Roles = "Administrador")]
public class UbicacionesHub : Hub
{
}
