namespace ARJE.Api.DTOs.Cuadrilla;

public class UltimaUbicacionCuadrillaDTO
{
    public int IdCuadrilla { get; set; }
    public string CuadrillaNombre { get; set; } = string.Empty;
    public UltimaPosicionCuadrillaDTO? Posicion { get; set; }
}

public class UltimaPosicionCuadrillaDTO
{
    public int IdSeguimiento { get; set; }
    public int IdReporte { get; set; }
    public string FolioReporte { get; set; } = string.Empty;
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
    public DateTime FechaHora { get; set; }
    public DateTime? FechaRecepcion { get; set; }
    public double? PrecisionMetros { get; set; }
}
