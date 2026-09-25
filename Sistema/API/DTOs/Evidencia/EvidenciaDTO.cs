using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Evidencia;

public class EvidenciaDTO
{
    public int Id { get; set; }
    public int IdReporte { get; set; }
    public TipoEvidencia Tipo { get; set; }
    public string Archivo { get; set; } = string.Empty;
    public string ArchivoUrl { get; set; } = string.Empty;
    public DateTime FechaCaptura { get; set; }
}