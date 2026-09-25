using System.ComponentModel.DataAnnotations;

namespace ARJE.Api.DTOs.Cuadrilla;

public class CuadrillaCreacionDTO
{
    [Required]
    [StringLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Integrantes { get; set; }

    [Required]
    [StringLength(50)]
    public string UsuarioApp { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;
}