using ARJE.Api.Entidades.Enums;

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

    // Propiedades calculadas por el Agente de Priorización y Triage
    public PrioridadReporte Prioridad { get; set; } = PrioridadReporte.Media;
    public double ScorePrioridad { get; set; } = 0.5;
    public string JustificacionPrioridad { get; set; } = string.Empty;
    public bool RequiereAtencionInmediata { get; set; }
}