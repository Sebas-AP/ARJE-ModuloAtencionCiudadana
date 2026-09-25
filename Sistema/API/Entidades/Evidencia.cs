using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.Entidades;

public class Evidencia : IId
{
    public int Id { get; set; }

    [Required]
    public int IdReporte { get; set; }
    public Reporte? Reporte { get; set; }

    [Required]
    public TipoEvidencia Tipo { get; set; }

    [Required]
    [StringLength(500)]
    public string Archivo { get; set; } = string.Empty;

    [Required]
    public DateTime FechaCaptura { get; set; } = DateTime.UtcNow;
}