using System.ComponentModel.DataAnnotations;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Evidencia;

public class EvidenciaCreacionDTO
{
    [Required]
    public TipoEvidencia Tipo { get; set; }

    [Required]
    public IFormFile Archivo { get; set; } = null!;
}