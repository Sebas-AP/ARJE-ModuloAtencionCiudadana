using System.ComponentModel.DataAnnotations;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.Entidades;

public class UsuarioSistema : IId
{
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string Usuario { get; set; } = string.Empty;

    [Required]
    [StringLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    public RolUsuario Rol { get; set; }

    public bool Activo { get; set; } = true;
}