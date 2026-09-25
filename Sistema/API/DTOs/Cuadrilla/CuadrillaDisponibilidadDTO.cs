using System.ComponentModel.DataAnnotations;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Cuadrilla;

public class CuadrillaDisponibilidadDTO
{
    [Required]
    public EstatusCuadrilla EstatusDisponibilidad { get; set; }
}