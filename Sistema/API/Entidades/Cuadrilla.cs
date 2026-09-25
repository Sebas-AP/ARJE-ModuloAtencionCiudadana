using System.ComponentModel.DataAnnotations;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.Entidades;

public class Cuadrilla : IId
{
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Integrantes { get; set; }

    [Required]
    [StringLength(50)]
    public string UsuarioApp { get; set; } = string.Empty;

    [Required]
    [StringLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    public EstatusCuadrilla EstatusDisponibilidad { get; set; } = EstatusCuadrilla.Disponible;

    public List<Reporte> ReportesAsignados { get; set; } = new();
    public List<Reporte> ReportesSupervisados { get; set; } = new();
    public List<SeguimientoUbicacion> SeguimientosUbicacion { get; set; } = new();
}