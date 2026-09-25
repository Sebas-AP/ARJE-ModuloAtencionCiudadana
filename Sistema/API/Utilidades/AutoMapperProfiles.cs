using AutoMapper;
using ARJE.Api.Entidades;
using ARJE.Api.DTOs.Reporte;
using ARJE.Api.DTOs.Evidencia;
using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.DTOs.SeguimientoUbicacion;
using ARJE.Api.DTOs.Usuario;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.Utilidades;

public class AutoMapperProfiles : Profile
{
    public AutoMapperProfiles()
    {
        CreateMap<Reporte, ReporteDTO>()
            .ForMember(d => d.CuadrillaAsignadaNombre, o => o.MapFrom(s => s.CuadrillaAsignada != null ? s.CuadrillaAsignada.Nombre : null))
            .ForMember(d => d.TotalEvidencias, o => o.MapFrom(s => s.Evidencias.Count));

        CreateMap<Reporte, ReporteDetalleDTO>()
            .ForMember(d => d.CuadrillaAsignadaNombre, o => o.MapFrom(s => s.CuadrillaAsignada != null ? s.CuadrillaAsignada.Nombre : null))
            .ForMember(d => d.CuadrillaSupervisoraNombre, o => o.MapFrom(s => s.CuadrillaSupervisora != null ? s.CuadrillaSupervisora.Nombre : null))
            .ForMember(d => d.TotalEvidencias, o => o.MapFrom(s => s.Evidencias.Count));

        CreateMap<ReporteCreacionDTO, Reporte>();

        CreateMap<Evidencia, EvidenciaDTO>()
            .ForMember(d => d.ArchivoUrl, o => o.MapFrom(s => s.Archivo));

        CreateMap<EvidenciaCreacionDTO, Evidencia>()
            .ForMember(d => d.Archivo, o => o.Ignore())
            .ForMember(d => d.FechaCaptura, o => o.MapFrom(_ => DateTime.UtcNow));

        CreateMap<Cuadrilla, CuadrillaDTO>()
            .ForMember(d => d.ReportesAsignadosCount, o => o.MapFrom(s => s.ReportesAsignados.Count));

        CreateMap<CuadrillaCreacionDTO, Cuadrilla>()
            .ForMember(d => d.PasswordHash, o => o.MapFrom(s => BCrypt.Net.BCrypt.HashPassword(s.Password)))
            .ForMember(d => d.EstatusDisponibilidad, o => o.MapFrom(_ => EstatusCuadrilla.Disponible));

        CreateMap<SeguimientoUbicacion, SeguimientoUbicacionDTO>()
            .ForMember(d => d.CuadrillaNombre, o => o.MapFrom(s => s.Cuadrilla != null ? s.Cuadrilla.Nombre : string.Empty));

        CreateMap<SeguimientoUbicacionCreacionDTO, SeguimientoUbicacion>()
            .ForMember(d => d.FechaHora, o => o.MapFrom(_ => DateTime.UtcNow));

        CreateMap<UsuarioSistema, UsuarioDTO>()
            .ForMember(d => d.Rol, o => o.MapFrom(s => s.Rol.ToString()));
    }
}