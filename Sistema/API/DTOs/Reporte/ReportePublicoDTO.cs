using ARJE.Api.DTOs.Evidencia;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Reporte;

public class ReportePublicoDTO
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
    public decimal? TiempoEstimado { get; set; }
    public string? NumeroContrato { get; set; }
    public string? NombreCiudadano { get; set; }
    public List<EvidenciaPublicoDTO> Evidencias { get; set; } = new();
}

public class EvidenciaPublicoDTO
{
    public int Id { get; set; }
    public TipoEvidencia Tipo { get; set; }
    public string ArchivoUrl { get; set; } = string.Empty;
    public DateTime FechaCaptura { get; set; }
}

public class ReporteConsultaPaginadoDTO
{
    public List<ReportePublicoDTO> Data { get; set; } = new();
    public int TotalRegistros { get; set; }
    public int Pagina { get; set; }
    public int RegistrosPorPagina { get; set; }
    public int TotalPaginas { get; set; }
}