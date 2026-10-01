using ARJE.Api.Entidades.Enums;
using System.ComponentModel.DataAnnotations;

namespace ARJE.Api.DTOs.Reporte;

public class ActualizarPrioridadDTO
{
    [Required]
    public PrioridadReporte Prioridad { get; set; }

    [StringLength(500)]
    public string? Justificacion { get; set; }
}
