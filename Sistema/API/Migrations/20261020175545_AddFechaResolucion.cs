using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ARJE.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFechaResolucion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FechaResolucion",
                table: "Reportes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "UsuariosSistema",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$I9l4ysKinQXn1lE2k5k1..IVpcktKiVYPsJKY12ElJY43ZqXR0c2C");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FechaResolucion",
                table: "Reportes");

            migrationBuilder.UpdateData(
                table: "UsuariosSistema",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$RxMNHoXITr575Hq/v4iSpO3ynDFjkjRelm7FoeJ0rWfC43WMfNtLi");
        }
    }
}
