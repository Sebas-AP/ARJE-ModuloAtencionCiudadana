namespace ARJE.Api.Utilidades;

public static class FechaHoraUtc
{
    public static DateTime Normalizar(DateTime valor) => valor.Kind switch
    {
        DateTimeKind.Utc => valor,
        DateTimeKind.Local => valor.ToUniversalTime(),
        _ => DateTime.SpecifyKind(valor, DateTimeKind.Utc)
    };

    public static DateTime? Normalizar(DateTime? valor) =>
        valor.HasValue ? Normalizar(valor.Value) : null;
}
