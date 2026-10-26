using ARJE.Api.Utilidades;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace ARJE.Api.Tests;

public class PaginatedReportHeadersTests
{
    [Fact]
    public void Emite_el_encabezado_canonico_y_el_legado_con_el_mismo_valor()
    {
        var context = new DefaultHttpContext();

        context.AgregarHeaderCantidadTotalRegistros(235);

        Assert.Equal("235", context.Response.Headers["x-total-count"]);
        Assert.Equal("235", context.Response.Headers["cantidadTotalRegistros"]);
    }

    [Fact]
    public void Emite_cero_de_forma_explicita_cuando_no_hay_registros()
    {
        var context = new DefaultHttpContext();

        context.AgregarHeaderCantidadTotalRegistros(0);

        Assert.Equal("0", context.Response.Headers["x-total-count"]);
        Assert.Equal("0", context.Response.Headers["cantidadTotalRegistros"]);
    }
}
