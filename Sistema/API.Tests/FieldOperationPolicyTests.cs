using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Servicios;
using Xunit;

namespace ARJE.Api.Tests;

public class FieldOperationPolicyTests
{
    private readonly FieldOperationPolicy policy = new();

    [Theory]
    [InlineData(EstatusReporte.Asignado, EstatusReporte.LevantandoInformacion)]
    [InlineData(EstatusReporte.LevantandoInformacion, EstatusReporte.EnProceso)]
    [InlineData(EstatusReporte.EnProceso, EstatusReporte.Completado)]
    public void Allows_each_forward_transition(EstatusReporte from, EstatusReporte to) =>
        Assert.True(policy.IsAllowedTransition(from, to));

    [Theory]
    [InlineData(EstatusReporte.Asignado, EstatusReporte.Completado)]
    [InlineData(EstatusReporte.Asignado, EstatusReporte.EnProceso)]
    [InlineData(EstatusReporte.EnProceso, EstatusReporte.LevantandoInformacion)]
    [InlineData(EstatusReporte.EnProceso, EstatusReporte.EnProceso)]
    [InlineData(EstatusReporte.Completado, EstatusReporte.EnProceso)]
    [InlineData(EstatusReporte.Nuevo, EstatusReporte.Asignado)]
    [InlineData(EstatusReporte.EnProceso, (EstatusReporte)999)]
    public void Rejects_skipped_backward_repeated_and_non_field_transitions(EstatusReporte from, EstatusReporte to) =>
        Assert.False(policy.IsAllowedTransition(from, to));

    [Fact]
    public void Rejects_completion_without_resolution_evidence() =>
        Assert.False(policy.EnsureCanComplete(new Reporte()).IsAllowed);

    [Fact]
    public void Initial_evidence_does_not_allow_completion() =>
        Assert.False(policy.EnsureCanComplete(new Reporte
        {
            Evidencias = [new Evidencia { Tipo = TipoEvidencia.Inicial, Archivo = "initial.jpg" }]
        }).IsAllowed);

    [Fact]
    public void Allows_completion_with_resolution_evidence() =>
        Assert.True(policy.EnsureCanComplete(new Reporte
        {
            Evidencias = [new Evidencia { Tipo = TipoEvidencia.Resolucion, Archivo = "resolution.jpg" }]
        }).IsAllowed);

    [Theory]
    [InlineData(2, 1)]
    [InlineData(null, 1)]
    [InlineData(1, 0)]
    public void Rejects_foreign_unassigned_or_invalid_cuadrilla(int? assignedId, int authenticatedId) =>
        Assert.False(policy.EnsureAssignedToAuthenticatedCuadrilla(
            new Reporte { IdCuadrillaAsignada = assignedId }, authenticatedId).IsAllowed);

    [Fact]
    public void Allows_assigned_cuadrilla() =>
        Assert.True(policy.EnsureAssignedToAuthenticatedCuadrilla(
            new Reporte { IdCuadrillaAsignada = 1 }, 1).IsAllowed);

    [Theory]
    [InlineData(EstatusReporte.Asignado)]
    [InlineData(EstatusReporte.LevantandoInformacion)]
    [InlineData(EstatusReporte.EnProceso)]
    public void Active_report_keeps_cuadrilla_busy(EstatusReporte status) =>
        Assert.Equal(EstatusCuadrilla.Ocupada,
            policy.ResolveAvailability(EstatusCuadrilla.Disponible, [status]));

    [Theory]
    [InlineData(EstatusCuadrilla.Disponible)]
    [InlineData(EstatusCuadrilla.FueraServicio)]
    public void Without_active_reports_preserves_requested_availability(EstatusCuadrilla requested) =>
        Assert.Equal(requested, policy.ResolveAvailability(requested,
            [EstatusReporte.Completado, EstatusReporte.EnSupervision, EstatusReporte.Cerrado]));
}
