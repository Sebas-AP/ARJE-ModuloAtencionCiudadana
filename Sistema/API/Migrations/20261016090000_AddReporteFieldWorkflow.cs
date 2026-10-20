using ARJE.Api.Entidades;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ARJE.Api.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261016090000_AddReporteFieldWorkflow")]
public partial class AddReporteFieldWorkflow : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ComentariosResolucion",
            table: "Reportes",
            type: "nvarchar(2000)",
            maxLength: 2000,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "FechaSupervision",
            table: "Reportes",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "NotasSupervision",
            table: "Reportes",
            type: "nvarchar(1000)",
            maxLength: 1000,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "ComentariosResolucion", table: "Reportes");
        migrationBuilder.DropColumn(name: "FechaSupervision", table: "Reportes");
        migrationBuilder.DropColumn(name: "NotasSupervision", table: "Reportes");
    }
}
