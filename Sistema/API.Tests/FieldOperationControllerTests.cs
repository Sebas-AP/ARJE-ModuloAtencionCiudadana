using System.Security.Claims;
using System.Data;
using System.Data.Common;
using ARJE.Api.Controllers;
using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.DTOs.Evidencia;
using ARJE.Api.DTOs.SeguimientoUbicacion;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace ARJE.Api.Tests;

public class FieldOperationControllerTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly TransactionSpy transactionSpy = new();
    private readonly ApplicationDbContext context;
    private readonly IMapper mapper = new MapperConfiguration(c => c.AddProfile<AutoMapperProfiles>()).CreateMapper();
    private readonly ServiceProvider services;
    private readonly IOutputCacheStore cache;

    public FieldOperationControllerTests()
    {
        connection.Open();
        context = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .AddInterceptors(transactionSpy)
            .Options);
        context.Database.EnsureCreated();
        context.Cuadrillas.AddRange(
            new Cuadrilla { Id = 1, Nombre = "One", UsuarioApp = "one", EstatusDisponibilidad = EstatusCuadrilla.Ocupada },
            new Cuadrilla { Id = 2, Nombre = "Two", UsuarioApp = "two" });
        context.SaveChanges();
        services = new ServiceCollection().AddLogging().AddOutputCache().BuildServiceProvider();
        cache = services.GetRequiredService<IOutputCacheStore>();
    }

    [Theory]
    [InlineData("2")]
    [InlineData(null)]
    [InlineData("invalid")]
    public async Task Status_rejects_foreign_or_missing_identity_without_mutating_report(string? subject)
    {
        var report = await AddReport(EstatusReporte.Asignado);
        var result = await Reports(subject).PutEstatus(report.Id, EstatusReporte.LevantandoInformacion);
        Assert.IsType<ForbidResult>(result);
        await context.Entry(report).ReloadAsync();
        Assert.Equal(EstatusReporte.Asignado, report.Estatus);
    }

    [Theory]
    [InlineData(EstatusReporte.Asignado)]
    [InlineData(EstatusReporte.LevantandoInformacion)]
    [InlineData(EstatusReporte.EnProceso)]
    [InlineData(EstatusReporte.Completado)]
    public async Task Status_retry_of_current_state_succeeds_for_assigned_cuadrilla(EstatusReporte status)
    {
        var report = await AddReport(status, resolution: true);
        context.ChangeTracker.Clear();
        Assert.IsType<NoContentResult>(await Reports().PutEstatus(report.Id, status));
        context.ChangeTracker.Clear();
        Assert.Equal(status, (await context.Reportes.FindAsync(report.Id))!.Estatus);
    }

    [Fact]
    public async Task Status_retry_still_rejects_foreign_cuadrilla()
    {
        var report = await AddReport(EstatusReporte.EnProceso);
        Assert.IsType<ForbidResult>(await Reports("2").PutEstatus(report.Id, EstatusReporte.EnProceso));
    }

    [Fact]
    public async Task Completion_retry_still_requires_resolution_evidence()
    {
        var report = await AddReport(EstatusReporte.Completado);
        Assert.IsType<BadRequestObjectResult>(await Reports().PutEstatus(report.Id, EstatusReporte.Completado));
    }

    [Theory]
    [InlineData(EstatusReporte.Asignado, EstatusReporte.Completado)]
    [InlineData(EstatusReporte.EnProceso, EstatusReporte.Asignado)]
    [InlineData(EstatusReporte.Completado, EstatusReporte.EnProceso)]
    [InlineData(EstatusReporte.EnProceso, (EstatusReporte)999)]
    public async Task Status_rejects_invalid_field_transition(EstatusReporte from, EstatusReporte to)
    {
        var report = await AddReport(from, resolution: true);
        Assert.IsType<BadRequestObjectResult>(await Reports().PutEstatus(report.Id, to));
        await context.Entry(report).ReloadAsync();
        Assert.Equal(from, report.Estatus);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Completion_requires_persisted_resolution_evidence(bool initialEvidence)
    {
        var report = await AddReport(EstatusReporte.EnProceso);
        if (initialEvidence)
        {
            context.Evidencias.Add(new Evidencia { IdReporte = report.Id, Tipo = TipoEvidencia.Inicial, Archivo = "initial.jpg" });
            await context.SaveChangesAsync();
        }
        Assert.IsType<BadRequestObjectResult>(await Reports().PutEstatus(report.Id, EstatusReporte.Completado));
        await context.Entry(report).ReloadAsync();
        Assert.Equal(EstatusReporte.EnProceso, report.Estatus);
    }

    [Theory]
    [InlineData(EstatusReporte.Asignado, EstatusReporte.LevantandoInformacion, EstatusCuadrilla.Ocupada)]
    [InlineData(EstatusReporte.LevantandoInformacion, EstatusReporte.EnProceso, EstatusCuadrilla.Ocupada)]
    [InlineData(EstatusReporte.EnProceso, EstatusReporte.Completado, EstatusCuadrilla.Disponible)]
    public async Task Forward_transition_persists_and_recalculates_availability(
        EstatusReporte from, EstatusReporte to, EstatusCuadrilla availability)
    {
        var report = await AddReport(from, resolution: true);
        context.ChangeTracker.Clear();
        Assert.IsType<NoContentResult>(await Reports().PutEstatus(report.Id, to));
        context.ChangeTracker.Clear();
        Assert.Equal(to, (await context.Reportes.FindAsync(report.Id))!.Estatus);
        Assert.Equal(availability, (await context.Cuadrillas.FindAsync(1))!.EstatusDisponibilidad);
    }

    [Theory]
    [InlineData(EstatusReporte.Asignado)]
    [InlineData(EstatusReporte.LevantandoInformacion)]
    [InlineData(EstatusReporte.EnProceso)]
    public async Task Completion_keeps_busy_when_another_report_is_active(EstatusReporte otherStatus)
    {
        var report = await AddReport(EstatusReporte.EnProceso, resolution: true);
        await AddReport(otherStatus);
        Assert.IsType<NoContentResult>(await Reports().PutEstatus(report.Id, EstatusReporte.Completado));
        context.ChangeTracker.Clear();
        Assert.Equal(EstatusCuadrilla.Ocupada, (await context.Cuadrillas.FindAsync(1))!.EstatusDisponibilidad);
    }

    [Fact]
    public async Task Administrator_retains_non_field_supervision_transition()
    {
        var report = await AddReport(EstatusReporte.Completado, resolution: true);
        Assert.IsType<NoContentResult>(await Reports("7", "Usuario", "Administrador")
            .PutEstatus(report.Id, EstatusReporte.EnSupervision));
    }

    [Fact]
    public async Task Administrative_supervision_preserves_out_of_service_after_last_report_completion()
    {
        var report = await AddReport(EstatusReporte.EnProceso, resolution: true);
        Assert.IsType<NoContentResult>(await Reports().PutEstatus(report.Id, EstatusReporte.Completado));
        context.ChangeTracker.Clear();
        Assert.Equal(EstatusCuadrilla.Disponible, (await context.Cuadrillas.FindAsync(1))!.EstatusDisponibilidad);

        var cuadrillas = Authenticate(new CuadrillasController(context, mapper, cache, null!));
        Assert.IsType<NoContentResult>(await cuadrillas.PutDisponibilidad(1,
            new CuadrillaDisponibilidadDTO { EstatusDisponibilidad = EstatusCuadrilla.FueraServicio }));
        context.ChangeTracker.Clear();
        Assert.Equal(EstatusCuadrilla.FueraServicio, (await context.Cuadrillas.FindAsync(1))!.EstatusDisponibilidad);

        Assert.IsType<NoContentResult>(await Reports("7", "Usuario", "Administrador")
            .PutEstatus(report.Id, EstatusReporte.EnSupervision));
        context.ChangeTracker.Clear();
        Assert.Equal(EstatusReporte.EnSupervision, (await context.Reportes.FindAsync(report.Id))!.Estatus);
        Assert.Equal(EstatusCuadrilla.FueraServicio, (await context.Cuadrillas.FindAsync(1))!.EstatusDisponibilidad);
    }

    [Fact]
    public async Task Location_rejects_foreign_cuadrilla_without_writing_points()
    {
        var report = await AddReport(EstatusReporte.EnProceso);
        var controller = Authenticate(new SeguimientosUbicacionController(context, mapper, cache), "2");
        Assert.IsType<ForbidResult>(await controller.Post(report.Id, LocationBatch()));
        Assert.Empty(await context.SeguimientosUbicacion.ToListAsync());
    }

    [Fact]
    public async Task Location_records_points_for_authenticated_assigned_cuadrilla()
    {
        var report = await AddReport(EstatusReporte.EnProceso);
        var controller = Authenticate(new SeguimientosUbicacionController(context, mapper, cache));
        Assert.IsType<OkObjectResult>(await controller.Post(report.Id, LocationBatch()));
        context.ChangeTracker.Clear();
        var point = Assert.Single(await context.SeguimientosUbicacion.ToListAsync());
        Assert.Equal(1, point.IdCuadrilla);
        Assert.Equal(report.Id, point.IdReporte);
        Assert.Equal(25m, point.Latitud);
    }

    [Fact]
    public async Task Evidence_rejects_foreign_cuadrilla_without_creating_evidence()
    {
        var report = await AddReport(EstatusReporte.EnProceso);
        var result = await Reports("2").PostEvidencia(report.Id, Evidence());
        Assert.IsType<ForbidResult>(result.Result);
        Assert.Empty(await context.Evidencias.ToListAsync());
    }

    [Fact]
    public async Task Evidence_upload_allows_assigned_cuadrilla_then_completion()
    {
        var report = await AddReport(EstatusReporte.EnProceso);
        Assert.IsType<CreatedAtRouteResult>((await Reports().PostEvidencia(report.Id, Evidence())).Result);
        context.ChangeTracker.Clear();
        Assert.IsType<NoContentResult>(await Reports().PutEstatus(report.Id, EstatusReporte.Completado));
    }

    [Fact]
    public async Task Availability_rejects_foreign_cuadrilla()
    {
        var controller = Authenticate(new CuadrillasController(context, mapper, cache, null!), "2");
        Assert.IsType<ForbidResult>(await controller.PutDisponibilidad(1,
            new CuadrillaDisponibilidadDTO { EstatusDisponibilidad = EstatusCuadrilla.Disponible }));
        context.ChangeTracker.Clear();
        Assert.Equal(EstatusCuadrilla.Ocupada, (await context.Cuadrillas.FindAsync(1))!.EstatusDisponibilidad);
    }

    [Theory]
    [InlineData(EstatusReporte.Asignado)]
    [InlineData(EstatusReporte.LevantandoInformacion)]
    [InlineData(EstatusReporte.EnProceso)]
    public async Task Availability_cannot_mark_active_cuadrilla_available(EstatusReporte status)
    {
        await AddReport(status);
        var controller = Authenticate(new CuadrillasController(context, mapper, cache, null!));
        Assert.IsType<NoContentResult>(await controller.PutDisponibilidad(1,
            new CuadrillaDisponibilidadDTO { EstatusDisponibilidad = EstatusCuadrilla.Disponible }));
        context.ChangeTracker.Clear();
        Assert.Equal(EstatusCuadrilla.Ocupada, (await context.Cuadrillas.FindAsync(1))!.EstatusDisponibilidad);
    }

    [Theory]
    [InlineData(EstatusCuadrilla.Disponible)]
    [InlineData(EstatusCuadrilla.FueraServicio)]
    public async Task Availability_without_active_reports_accepts_requested_status(EstatusCuadrilla requested)
    {
        await AddReport(EstatusReporte.Completado);
        var controller = Authenticate(new CuadrillasController(context, mapper, cache, null!));
        Assert.IsType<NoContentResult>(await controller.PutDisponibilidad(1,
            new CuadrillaDisponibilidadDTO { EstatusDisponibilidad = requested }));
        context.ChangeTracker.Clear();
        Assert.Equal(requested, (await context.Cuadrillas.FindAsync(1))!.EstatusDisponibilidad);
    }

    [Fact]
    public async Task Availability_check_and_update_run_in_a_serializable_transaction()
    {
        var controller = Authenticate(new CuadrillasController(context, mapper, cache, null!));

        Assert.IsType<NoContentResult>(await controller.PutDisponibilidad(1,
            new CuadrillaDisponibilidadDTO { EstatusDisponibilidad = EstatusCuadrilla.Disponible }));

        Assert.Contains(IsolationLevel.Serializable, transactionSpy.IsolationLevels);
    }

    private async Task<Reporte> AddReport(EstatusReporte status, bool resolution = false)
    {
        var report = new Reporte
        {
            Descripcion = "Water leak", IdCuadrillaAsignada = 1, Estatus = status,
            TipoProblema = TipoProblema.Fuga
        };
        if (resolution) report.Evidencias.Add(new Evidencia { Tipo = TipoEvidencia.Resolucion, Archivo = "resolution.jpg" });
        context.Reportes.Add(report);
        await context.SaveChangesAsync();
        return report;
    }

    private ReportesController Reports(string? subject = "1", string type = "Cuadrilla", string role = "Cuadrilla") =>
        Authenticate(new ReportesController(context, mapper, cache, new TestFileStorage(), null!), subject, type, role);

    private static T Authenticate<T>(T controller, string? subject = "1", string type = "Cuadrilla", string role = "Cuadrilla")
        where T : ControllerBase
    {
        var claims = new List<Claim> { new("tipo", type), new(ClaimTypes.Role, role), new("idCuadrilla", "2") };
        if (subject != null) claims.Add(new(ClaimTypes.NameIdentifier, subject));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer")) }
        };
        return controller;
    }

    private static SeguimientoUbicacionBatchDTO LocationBatch() => new()
    {
        Ubicaciones = [new SeguimientoUbicacionCreacionDTO { Latitud = 25, Longitud = -100 }]
    };

    private static EvidenciaCreacionDTO Evidence() => new()
    {
        Tipo = TipoEvidencia.Resolucion,
        Archivo = new FormFile(new MemoryStream([1, 2, 3]), 0, 3, "Archivo", "resolution.jpg")
    };

    public void Dispose()
    {
        context.Dispose();
        connection.Dispose();
        services.Dispose();
    }

    private sealed class TestFileStorage : IAlmacenadorArchivos
    {
        public Task<string> GuardarArchivo(string contenedor, IFormFile archivo) => Task.FromResult("/evidencias/resolution.jpg");
        public Task<string> EditarArchivo(string contenedor, IFormFile archivo, string rutaArchivoActual) => throw new NotSupportedException();
        public Task BorrarArchivo(string contenedor, string rutaArchivo) => throw new NotSupportedException();
    }

    private sealed class TransactionSpy : DbTransactionInterceptor
    {
        public List<IsolationLevel> IsolationLevels { get; } = [];

        public override DbTransaction TransactionStarted(
            DbConnection connection,
            TransactionEndEventData eventData,
            DbTransaction result)
        {
            IsolationLevels.Add(result.IsolationLevel);
            return result;
        }
    }
}
