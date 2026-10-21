using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Reporte;

public class ReporteCiudadanoRespuestaDTO
{
    public int Id { get; set; }
    public string Folio => $"FOL-{Id}";
    public TipoProblema TipoProblema { get; set; }
    public string? Categoria { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
    public DateTime FechaRecibido { get; set; }
    public EstatusReporte Estatus { get; set; }
    public string? NumeroContrato { get; set; }
    public string? NombreCiudadano { get; set; }
    public string UploadToken { get; set; } = string.Empty;
    public int UploadTokenExpiraEnMinutos { get; set; } = 60;
}