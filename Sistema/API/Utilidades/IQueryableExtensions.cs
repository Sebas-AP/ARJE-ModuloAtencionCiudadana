namespace ARJE.Api.Utilidades;

public static class IQueryableExtensions
{
    public static IQueryable<T> Paginar<T>(this IQueryable<T> queryable, int pagina, int registrosPorPagina)
    {
        if (pagina <= 0) pagina = 1;
        if (registrosPorPagina <= 0) registrosPorPagina = 10;
        if (registrosPorPagina > 100) registrosPorPagina = 100;

        return queryable
            .Skip((pagina - 1) * registrosPorPagina)
            .Take(registrosPorPagina);
    }
}