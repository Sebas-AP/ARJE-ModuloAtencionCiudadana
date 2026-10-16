using System.Security.Claims;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.Servicios;

public class FieldOperationPolicy
{
    public bool IsAllowedTransition(EstatusReporte from, EstatusReporte to) => (from, to) is
        (EstatusReporte.Asignado, EstatusReporte.LevantandoInformacion) or
        (EstatusReporte.LevantandoInformacion, EstatusReporte.EnProceso) or
        (EstatusReporte.EnProceso, EstatusReporte.Completado);

    public FieldOperationDecision EnsureAssignedToAuthenticatedCuadrilla(Reporte reporte, int authenticatedId) =>
        new(authenticatedId > 0 && reporte.IdCuadrillaAsignada == authenticatedId);

    public FieldOperationDecision EnsureCanComplete(Reporte reporte) =>
        new(reporte.Evidencias.Any(e => e.Tipo == TipoEvidencia.Resolucion));

    public EstatusCuadrilla ResolveAvailability(EstatusCuadrilla requested, IEnumerable<EstatusReporte> statuses) =>
        statuses.Any(status => status is EstatusReporte.Asignado or EstatusReporte.LevantandoInformacion or EstatusReporte.EnProceso)
            ? EstatusCuadrilla.Ocupada
            : requested;

    public bool IsCuadrilla(ClaimsPrincipal user) =>
        user.HasClaim("tipo", "Cuadrilla") || user.IsInRole("Cuadrilla");

    public bool CanAccessAssignedReport(Reporte reporte, ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var authenticatedId) &&
        EnsureAssignedToAuthenticatedCuadrilla(reporte, authenticatedId).IsAllowed;

    public bool CanAccessSupervisedReport(Reporte reporte, ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var authenticatedId) &&
        authenticatedId > 0 && reporte.IdCuadrillaSupervisora == authenticatedId;
}

public readonly record struct FieldOperationDecision(bool IsAllowed);
