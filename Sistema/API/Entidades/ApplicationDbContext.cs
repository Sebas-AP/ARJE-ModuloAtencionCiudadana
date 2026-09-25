using Microsoft.EntityFrameworkCore;
using ARJE.Api.Entidades;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.Entidades;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Reporte> Reportes { get; set; } = null!;
    public DbSet<Evidencia> Evidencias { get; set; } = null!;
    public DbSet<Cuadrilla> Cuadrillas { get; set; } = null!;
    public DbSet<SeguimientoUbicacion> SeguimientosUbicacion { get; set; } = null!;
    public DbSet<UsuarioSistema> UsuariosSistema { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Reporte>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FechaRecibido).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.Estatus).HasDefaultValue(EstatusReporte.Nuevo);
            entity.HasIndex(e => e.Estatus);
            entity.HasIndex(e => e.IdCuadrillaAsignada);
            entity.HasIndex(e => e.IdCuadrillaSupervisora);
            entity.HasIndex(e => new { e.Latitud, e.Longitud });
        });

        modelBuilder.Entity<Evidencia>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Reporte)
                  .WithMany(r => r.Evidencias)
                  .HasForeignKey(e => e.IdReporte)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.IdReporte);
        });

        modelBuilder.Entity<Cuadrilla>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UsuarioApp).IsUnique();
            entity.HasIndex(e => e.EstatusDisponibilidad);
            entity.HasMany(e => e.ReportesAsignados)
                  .WithOne(r => r.CuadrillaAsignada)
                  .HasForeignKey(r => r.IdCuadrillaAsignada)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(e => e.ReportesSupervisados)
                  .WithOne(r => r.CuadrillaSupervisora)
                  .HasForeignKey(r => r.IdCuadrillaSupervisora)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SeguimientoUbicacion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Reporte)
                  .WithMany(r => r.SeguimientosUbicacion)
                  .HasForeignKey(e => e.IdReporte)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Cuadrilla)
                  .WithMany(c => c.SeguimientosUbicacion)
                  .HasForeignKey(e => e.IdCuadrilla)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.IdReporte);
            entity.HasIndex(e => e.IdCuadrilla);
            entity.HasIndex(e => e.FechaHora);
        });

        modelBuilder.Entity<UsuarioSistema>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Usuario).IsUnique();
            entity.HasIndex(e => e.Rol);
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UsuarioSistema>().HasData(
            new UsuarioSistema
            {
                Id = 1,
                Nombre = "Administrador",
                Usuario = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                Rol = RolUsuario.Administrador
            }
        );
    }
}