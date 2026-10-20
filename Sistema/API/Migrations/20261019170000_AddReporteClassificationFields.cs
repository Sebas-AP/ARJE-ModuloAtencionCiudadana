using ARJE.Api.Entidades;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ARJE.Api.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261019170000_AddReporteClassificationFields")]
public partial class AddReporteClassificationFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        if (ActiveProvider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase))
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'[Reportes]', N'Categoria') IS NULL
                    ALTER TABLE [Reportes] ADD [Categoria] nvarchar(100) NULL;

                IF COL_LENGTH(N'[Reportes]', N'ConfianzaIA') IS NULL
                    ALTER TABLE [Reportes] ADD [ConfianzaIA] float NULL;

                IF COL_LENGTH(N'[Reportes]', N'RazonamientoIA') IS NULL
                    ALTER TABLE [Reportes] ADD [RazonamientoIA] nvarchar(500) NULL;
                """);
            return;
        }

        migrationBuilder.AddColumn<string>(
            name: "Categoria",
            table: "Reportes",
            type: "nvarchar(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<double>(
            name: "ConfianzaIA",
            table: "Reportes",
            type: "float",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "RazonamientoIA",
            table: "Reportes",
            type: "nvarchar(500)",
            maxLength: 500,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Categoria", table: "Reportes");
        migrationBuilder.DropColumn(name: "ConfianzaIA", table: "Reportes");
        migrationBuilder.DropColumn(name: "RazonamientoIA", table: "Reportes");
    }
}
