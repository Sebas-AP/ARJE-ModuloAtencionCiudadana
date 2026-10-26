using System;
using ARJE.Api.Entidades;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ARJE.Api.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261026090000_AddLocationCaptureMetadata")]
public partial class AddLocationCaptureMetadata : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "IdMuestra",
            table: "SeguimientosUbicacion",
            type: "nvarchar(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "FechaRecepcion",
            table: "SeguimientosUbicacion",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<double>(
            name: "PrecisionMetros",
            table: "SeguimientosUbicacion",
            type: "float",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_SeguimientosUbicacion_IdCuadrilla_IdMuestra",
            table: "SeguimientosUbicacion",
            columns: new[] { "IdCuadrilla", "IdMuestra" },
            unique: true,
            filter: "[IdMuestra] IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_SeguimientosUbicacion_IdCuadrilla_FechaHora_Id",
            table: "SeguimientosUbicacion",
            columns: new[] { "IdCuadrilla", "FechaHora", "Id" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_SeguimientosUbicacion_IdCuadrilla_FechaHora_Id",
            table: "SeguimientosUbicacion");

        migrationBuilder.DropIndex(
            name: "IX_SeguimientosUbicacion_IdCuadrilla_IdMuestra",
            table: "SeguimientosUbicacion");

        migrationBuilder.DropColumn(
            name: "PrecisionMetros",
            table: "SeguimientosUbicacion");

        migrationBuilder.DropColumn(
            name: "FechaRecepcion",
            table: "SeguimientosUbicacion");

        migrationBuilder.DropColumn(
            name: "IdMuestra",
            table: "SeguimientosUbicacion");
    }
}
