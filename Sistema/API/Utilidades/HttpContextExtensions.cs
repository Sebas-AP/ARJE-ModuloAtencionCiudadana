using Microsoft.AspNetCore.Http;

namespace ARJE.Api.Utilidades;

public static class HttpContextExtensions
{
    public static void AgregarHeaderCantidadTotalRegistros(this HttpContext context, int cantidadTotalRegistros)
    {
        context.Response.Headers.Append("cantidadTotalRegistros", cantidadTotalRegistros.ToString());
    }
}