using System.ComponentModel.DataAnnotations;

namespace ARJE.Api.DTOs.SeguimientoUbicacion;

public class SeguimientoUbicacionCreacionDTO
{
    [Required]
    [Range(-90, 90)]
    public decimal Latitud { get; set; }

    [Required]
    [Range(-180, 180)]
    public decimal Longitud { get; set; }
}

public class SeguimientoUbicacionBatchDTO
{
    [Required]
    public List<SeguimientoUbicacionCreacionDTO> Ubicaciones { get; set; } = new();
}