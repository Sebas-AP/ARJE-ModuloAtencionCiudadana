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

    [StringLength(100)]
    public string? IdMuestra { get; set; }

    public DateTime? FechaCaptura { get; set; }

    [Range(0, double.MaxValue)]
    public double? PrecisionMetros { get; set; }
}

public class SeguimientoUbicacionBatchDTO
{
    [Required]
    [MinLength(1)]
    [MaxLength(200)]
    public List<SeguimientoUbicacionCreacionDTO> Ubicaciones { get; set; } = new();
}
