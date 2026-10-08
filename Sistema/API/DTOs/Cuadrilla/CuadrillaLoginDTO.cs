using System.ComponentModel.DataAnnotations;

namespace ARJE.Api.DTOs.Cuadrilla;

public class CuadrillaLoginDTO
{
    [Required]
    [StringLength(50)]
    public string Usuario { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Password { get; set; } = string.Empty;
}

public class CuadrillaLoginResponseDTO
{
    public string Token { get; set; } = string.Empty;
    public CuadrillaDTO Cuadrilla { get; set; } = null!;
}
