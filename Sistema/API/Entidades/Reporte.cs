using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.Entidades;

public class Reporte : IId
{
    public int Id { get; set; }

    [Required]
    public TipoProblema TipoProblema { get; set; }

    [Required]
    [StringLength(2000)]
    public string Descripcion { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(18,15)")]
    public decimal Latitud { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,15)")]
    public decimal Longitud { get; set; }

    [Required]
    public DateTime FechaRecibido { get; set; } = DateTime.UtcNow;

    [Required]
    public EstatusReporte Estatus { get; set; } = EstatusReporte.Nuevo;

    public decimal? TiempoEstimado { get; set; }

    public int? IdCuadrillaAsignada { get; set; }
    public Cuadrilla? CuadrillaAsignada { get; set; }

    public int? IdCuadrillaSupervisora { get; set; }
    public Cuadrilla? CuadrillaSupervisora { get; set; }

    [StringLength(50)]
    public string? NumeroContrato { get; set; }

    [StringLength(100)]
    public string? NombreCiudadano { get; set; }

    [StringLength(20)]
    public string? TelefonoCiudadano { get; set; }

    public List<Evidencia> Evidencias { get; set; } = new();
    public List<SeguimientoUbicacion> SeguimientosUbicacion { get; set; } = new();
}