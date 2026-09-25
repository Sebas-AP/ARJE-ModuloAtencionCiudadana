using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ARJE.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Cuadrillas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Nombre = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Integrantes = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    UsuarioApp = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    EstatusDisponibilidad = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cuadrillas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UsuariosSistema",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Nombre = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Usuario = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    Rol = table.Column<int>(type: "INTEGER", nullable: false),
                    Activo = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuariosSistema", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Reportes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TipoProblema = table.Column<int>(type: "INTEGER", nullable: false),
                    Descripcion = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    Latitud = table.Column<decimal>(type: "decimal(18,15)", nullable: false),
                    Longitud = table.Column<decimal>(type: "decimal(18,15)", nullable: false),
                    FechaRecibido = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    Estatus = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    TiempoEstimado = table.Column<decimal>(type: "TEXT", nullable: true),
                    IdCuadrillaAsignada = table.Column<int>(type: "INTEGER", nullable: true),
                    IdCuadrillaSupervisora = table.Column<int>(type: "INTEGER", nullable: true),
                    NumeroContrato = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    NombreCiudadano = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    TelefonoCiudadano = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reportes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reportes_Cuadrillas_IdCuadrillaAsignada",
                        column: x => x.IdCuadrillaAsignada,
                        principalTable: "Cuadrillas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Reportes_Cuadrillas_IdCuadrillaSupervisora",
                        column: x => x.IdCuadrillaSupervisora,
                        principalTable: "Cuadrillas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Evidencias",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    IdReporte = table.Column<int>(type: "INTEGER", nullable: false),
                    Tipo = table.Column<int>(type: "INTEGER", nullable: false),
                    Archivo = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    FechaCaptura = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Evidencias", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Evidencias_Reportes_IdReporte",
                        column: x => x.IdReporte,
                        principalTable: "Reportes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SeguimientosUbicacion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    IdReporte = table.Column<int>(type: "INTEGER", nullable: false),
                    IdCuadrilla = table.Column<int>(type: "INTEGER", nullable: false),
                    Latitud = table.Column<decimal>(type: "decimal(18,15)", nullable: false),
                    Longitud = table.Column<decimal>(type: "decimal(18,15)", nullable: false),
                    FechaHora = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeguimientosUbicacion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SeguimientosUbicacion_Cuadrillas_IdCuadrilla",
                        column: x => x.IdCuadrilla,
                        principalTable: "Cuadrillas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SeguimientosUbicacion_Reportes_IdReporte",
                        column: x => x.IdReporte,
                        principalTable: "Reportes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "UsuariosSistema",
                columns: new[] { "Id", "Activo", "Nombre", "PasswordHash", "Rol", "Usuario" },
                values: new object[] { 1, true, "Administrador", "$2a$11$zt0Jc7aezBlqosCY0.qiSOlSEh7iPE7K5/ZlXm5c/TFQWDr0IGDlW", 1, "admin" });

            migrationBuilder.CreateIndex(
                name: "IX_Cuadrillas_EstatusDisponibilidad",
                table: "Cuadrillas",
                column: "EstatusDisponibilidad");

            migrationBuilder.CreateIndex(
                name: "IX_Cuadrillas_UsuarioApp",
                table: "Cuadrillas",
                column: "UsuarioApp",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Evidencias_IdReporte",
                table: "Evidencias",
                column: "IdReporte");

            migrationBuilder.CreateIndex(
                name: "IX_Reportes_Estatus",
                table: "Reportes",
                column: "Estatus");

            migrationBuilder.CreateIndex(
                name: "IX_Reportes_IdCuadrillaAsignada",
                table: "Reportes",
                column: "IdCuadrillaAsignada");

            migrationBuilder.CreateIndex(
                name: "IX_Reportes_IdCuadrillaSupervisora",
                table: "Reportes",
                column: "IdCuadrillaSupervisora");

            migrationBuilder.CreateIndex(
                name: "IX_Reportes_Latitud_Longitud",
                table: "Reportes",
                columns: new[] { "Latitud", "Longitud" });

            migrationBuilder.CreateIndex(
                name: "IX_SeguimientosUbicacion_FechaHora",
                table: "SeguimientosUbicacion",
                column: "FechaHora");

            migrationBuilder.CreateIndex(
                name: "IX_SeguimientosUbicacion_IdCuadrilla",
                table: "SeguimientosUbicacion",
                column: "IdCuadrilla");

            migrationBuilder.CreateIndex(
                name: "IX_SeguimientosUbicacion_IdReporte",
                table: "SeguimientosUbicacion",
                column: "IdReporte");

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosSistema_Rol",
                table: "UsuariosSistema",
                column: "Rol");

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosSistema_Usuario",
                table: "UsuariosSistema",
                column: "Usuario",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Evidencias");

            migrationBuilder.DropTable(
                name: "SeguimientosUbicacion");

            migrationBuilder.DropTable(
                name: "UsuariosSistema");

            migrationBuilder.DropTable(
                name: "Reportes");

            migrationBuilder.DropTable(
                name: "Cuadrillas");
        }
    }
}
