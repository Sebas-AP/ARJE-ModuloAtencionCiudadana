using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Reporte;

public class ReporteFiltrarDTO
{
    public EstatusReporte? Estatus { get; set; }
    public TipoProblema? TipoProblema { get; set; }
    public int? IdCuadrillaAsignada { get; set; }
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public int Pagina { get; set; } = 1;
    public int RegistrosPorPagina { get; set; } = 10;
}