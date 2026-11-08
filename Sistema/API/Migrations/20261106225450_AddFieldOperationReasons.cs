using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ARJE.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFieldOperationReasons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MotivoEnProceso",
                table: "Reportes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotivoEnProcesoDetalle",
                table: "Reportes",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MotivoResolucion",
                table: "Reportes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TiempoEstimadoUnidad",
                table: "Reportes",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MotivoEnProceso",
                table: "Reportes");

            migrationBuilder.DropColumn(
                name: "MotivoEnProcesoDetalle",
                table: "Reportes");

            migrationBuilder.DropColumn(
                name: "MotivoResolucion",
                table: "Reportes");

            migrationBuilder.DropColumn(
                name: "TiempoEstimadoUnidad",
                table: "Reportes");
        }
    }
}
