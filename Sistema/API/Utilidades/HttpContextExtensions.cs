using Microsoft.AspNetCore.Http;

namespace ARJE.Api.Utilidades;

public static class HttpContextExtensions
{
    public static void AgregarHeaderCantidadTotalRegistros(this HttpContext context, int cantidadTotalRegistros)
    {
        var value = cantidadTotalRegistros.ToString(System.Globalization.CultureInfo.InvariantCulture);
        context.Response.Headers.Append("x-total-count", value);
        context.Response.Headers.Append("cantidadTotalRegistros", value);
    }
}