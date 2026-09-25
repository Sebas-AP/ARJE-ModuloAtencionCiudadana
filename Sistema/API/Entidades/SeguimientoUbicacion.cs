using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ARJE.Api.Entidades;

public class SeguimientoUbicacion : IId
{
    public int Id { get; set; }

    [Required]
    public int IdReporte { get; set; }
    public Reporte? Reporte { get; set; }

    [Required]
    public int IdCuadrilla { get; set; }
    public Cuadrilla? Cuadrilla { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,15)")]
    public decimal Latitud { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,15)")]
    public decimal Longitud { get; set; }

    [Required]
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
}