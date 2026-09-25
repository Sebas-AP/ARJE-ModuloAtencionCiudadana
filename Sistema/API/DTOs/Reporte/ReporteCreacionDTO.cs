using System.ComponentModel.DataAnnotations;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Reporte;

public class ReporteCreacionDTO
{
    [Required]
    public TipoProblema TipoProblema { get; set; }

    [Required]
    [StringLength(2000)]
    public string Descripcion { get; set; } = string.Empty;

    [Required]
    [Range(-90, 90)]
    public decimal Latitud { get; set; }

    [Required]
    [Range(-180, 180)]
    public decimal Longitud { get; set; }

    [StringLength(50)]
    public string? NumeroContrato { get; set; }

    [StringLength(100)]
    public string? NombreCiudadano { get; set; }

    [StringLength(20)]
    public string? TelefonoCiudadano { get; set; }
}