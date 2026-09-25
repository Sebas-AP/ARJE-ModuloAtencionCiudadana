using ARJE.Api.DTOs.Evidencia;
using ARJE.Api.DTOs.SeguimientoUbicacion;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Reporte;

public class ReporteDetalleDTO : ReporteDTO
{
    public string? TelefonoCiudadano { get; set; }
    public int? IdCuadrillaSupervisora { get; set; }
    public string? CuadrillaSupervisoraNombre { get; set; }
    public List<EvidenciaDTO> Evidencias { get; set; } = new();
    public List<SeguimientoUbicacionDTO> SeguimientosUbicacion { get; set; } = new();
}