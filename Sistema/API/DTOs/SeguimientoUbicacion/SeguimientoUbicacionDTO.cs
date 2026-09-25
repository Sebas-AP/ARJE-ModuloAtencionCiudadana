namespace ARJE.Api.DTOs.SeguimientoUbicacion;

public class SeguimientoUbicacionDTO
{
    public int Id { get; set; }
    public int IdReporte { get; set; }
    public int IdCuadrilla { get; set; }
    public string CuadrillaNombre { get; set; } = string.Empty;
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
    public DateTime FechaHora { get; set; }
}