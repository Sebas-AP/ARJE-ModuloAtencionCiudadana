using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.DTOs.Cuadrilla;

public class CuadrillaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Integrantes { get; set; }
    public string UsuarioApp { get; set; } = string.Empty;
    public EstatusCuadrilla EstatusDisponibilidad { get; set; }
    public int ReportesAsignadosCount { get; set; }
}