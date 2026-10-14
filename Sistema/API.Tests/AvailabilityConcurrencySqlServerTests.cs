using ARJE.Api.Controllers;
using ARJE.Api.DTOs.Cuadrilla;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.Utilidades;
using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using System.Data.Common;
using Xunit;

namespace ARJE.Api.Tests;

/// <summary>
/// Exercises SQL Server key-range locking with two independent connections. Set
/// ARJE_SQLSERVER_TEST_CONNECTION to a dedicated, migrated test database to run
/// it; it intentionally does not use the development connection string.
/// </summary>
public sealed class AvailabilityConcurrencySqlServerTests : IAsyncDisposable
{
    private const string ConnectionStringVariable = "ARJE_SQLSERVER_TEST_CONNECTION";
    private readonly string? connectionString = Environment.GetEnvironmentVariable(ConnectionStringVariable);
    private readonly ServiceProvider services = new ServiceCollection().AddLogging().AddOutputCache().BuildServiceProvider();
    private readonly IMapper mapper = new MapperConfiguration(c => c.AddProfile<AutoMapperProfiles>()).CreateMapper();

    [Fact]
    [Trait("Category", "SqlServerIntegration")]
    public async Task Availability_update_holds_report_assignment_until_it_commits()
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            // A real SQL Server database is intentionally opt-in: running this
            // against the configured development database could alter user data.
            Console.WriteLine(
                $"Not executed: set {ConnectionStringVariable} to a dedicated, migrated SQL Server test database.");
            return;
        }

        var suffix = Guid.NewGuid().ToString("N");
        int crewId = 0;
        int reportId = 0;
        var barrier = new ActiveReportReadBarrier();

        try
        {
            await using (var setup = CreateContext())
            {
                var crew = new Cuadrilla
                {
                    Nombre = $"Concurrency test {suffix}",
                    UsuarioApp = $"concurrency-{suffix}",
                    PasswordHash = "test",
                    EstatusDisponibilidad = EstatusCuadrilla.Ocupada
                };
                var report = new Reporte
                {
                    Descripcion = "Concurrency test report",
                    TipoProblema = TipoProblema.Fuga,
                    Estatus = EstatusReporte.Nuevo
                };

                setup.AddRange(crew, report);
                await setup.SaveChangesAsync();
                crewId = crew.Id;
                reportId = report.Id;
            }

            await using var availabilityContext = CreateContext(barrier);
            var cache = services.GetRequiredService<IOutputCacheStore>();
            var controller = new CuadrillasController(availabilityContext, mapper, cache, null!);
            var availabilityTask = controller.PutDisponibilidad(crewId,
                new CuadrillaDisponibilidadDTO { EstatusDisponibilidad = EstatusCuadrilla.Disponible });

            await barrier.ActiveReportRead.WaitAsync(TimeSpan.FromSeconds(10));

            var assignmentTask = AssignReportAndMarkCrewBusy(reportId, crewId);
            await Task.Delay(TimeSpan.FromMilliseconds(300));
            var assignmentWasBlocked = !assignmentTask.IsCompleted;

            barrier.ReleaseAvailabilityUpdate();
            Assert.IsType<NoContentResult>(await availabilityTask);
            await assignmentTask;
            Assert.True(assignmentWasBlocked,
                "SQL Server did not block the report assignment while availability held its serializable range lock.");

            await using var verification = CreateContext();
            Assert.Equal(EstatusCuadrilla.Ocupada,
                (await verification.Cuadrillas.FindAsync(crewId))!.EstatusDisponibilidad);
        }
        finally
        {
            barrier.ReleaseAvailabilityUpdate();
            if (reportId != 0 || crewId != 0)
            {
                await Cleanup(reportId, crewId);
            }
        }
    }

    private ApplicationDbContext CreateContext(params IInterceptor[] interceptors)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(connectionString!)
            .AddInterceptors(interceptors)
            .Options;
        return new ApplicationDbContext(options);
    }

    private async Task AssignReportAndMarkCrewBusy(int reportId, int crewId)
    {
        await using var context = CreateContext();
        var report = (await context.Reportes.FindAsync(reportId))!;
        var crew = (await context.Cuadrillas.FindAsync(crewId))!;
        report.IdCuadrillaAsignada = crewId;
        report.Estatus = EstatusReporte.Asignado;
        crew.EstatusDisponibilidad = EstatusCuadrilla.Ocupada;
        await context.SaveChangesAsync();
    }

    private async Task Cleanup(int reportId, int crewId)
    {
        await using var context = CreateContext();
        if (reportId != 0)
        {
            await context.Reportes.Where(r => r.Id == reportId).ExecuteDeleteAsync();
        }
        if (crewId != 0)
        {
            await context.Cuadrillas.Where(c => c.Id == crewId).ExecuteDeleteAsync();
        }
    }

    public ValueTask DisposeAsync() => services.DisposeAsync();

    private sealed class ActiveReportReadBarrier : DbCommandInterceptor
    {
        private readonly TaskCompletionSource activeReportRead = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource releaseAvailabilityUpdate = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task ActiveReportRead => activeReportRead.Task;

        public void ReleaseAvailabilityUpdate() => releaseAvailabilityUpdate.TrySetResult();

        public override async ValueTask<DbDataReader> ReaderExecutedAsync(
            DbCommand command,
            CommandExecutedEventData eventData,
            DbDataReader result,
            CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("FROM [Reportes] AS [r]", StringComparison.Ordinal) &&
                command.CommandText.Contains("[IdCuadrillaAsignada]", StringComparison.Ordinal))
            {
                activeReportRead.TrySetResult();
                await releaseAvailabilityUpdate.Task.WaitAsync(cancellationToken);
            }

            return result;
        }
    }
}
