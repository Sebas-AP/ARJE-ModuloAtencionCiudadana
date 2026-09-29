namespace ARJE.Api.Servicios;

public interface IClasificadorService
{
    Task<ClasificacionResult> ClasificarReporteAsync(string descripcion);
}

public class ClasificacionResult
{
    public string Categoria { get; set; } = string.Empty;
    public string TipoProblema { get; set; } = string.Empty;
    public double Confianza { get; set; }
    public string Razonamiento { get; set; } = string.Empty;
}