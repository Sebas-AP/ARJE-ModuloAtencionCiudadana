using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Reporte;

public class ReporteDTO
{
    public int Id { get; set; }
    public TipoProblema TipoProblema { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
    public DateTime FechaRecibido { get; set; }
    public EstatusReporte Estatus { get; set; }
    public decimal? TiempoEstimado { get; set; }
    public int? IdCuadrillaAsignada { get; set; }
    public string? CuadrillaAsignadaNombre { get; set; }
    public string? NumeroContrato { get; set; }
    public string? NombreCiudadano { get; set; }
    public int TotalEvidencias { get; set; }
}