using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ARJE.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPrioridadReporte : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Prioridad",
                table: "Reportes",
                type: "int",
                nullable: false,
                defaultValue: 2);

            migrationBuilder.AddColumn<double>(
                name: "ScorePrioridad",
                table: "Reportes",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "JustificacionPrioridad",
                table: "Reportes",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reportes_Prioridad",
                table: "Reportes",
                column: "Prioridad");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reportes_Prioridad",
                table: "Reportes");

            migrationBuilder.DropColumn(
                name: "Prioridad",
                table: "Reportes");

            migrationBuilder.DropColumn(
                name: "ScorePrioridad",
                table: "Reportes");

            migrationBuilder.DropColumn(
                name: "JustificacionPrioridad",
                table: "Reportes");
        }
    }
}
