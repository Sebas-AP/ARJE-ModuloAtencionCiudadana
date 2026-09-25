namespace ARJE.Api.Entidades.Enums;

public enum TipoProblema
{
    Fuga = 1,
    FaltaAbastecimiento = 2,
    InstalacionRota = 3,
    UsoIndebido = 4,
    Otro = 5
}

public enum EstatusReporte
{
    Nuevo = 1,
    Asignado = 2,
    LevantandoInformacion = 3,
    EnProceso = 4,
    Completado = 5,
    EnSupervision = 6,
    Cerrado = 7
}

public enum TipoEvidencia
{
    Inicial = 1,
    Resolucion = 2
}

public enum EstatusCuadrilla
{
    Disponible = 1,
    Ocupada = 2,
    FueraServicio = 3
}

public enum RolUsuario
{
    Administrador = 1,
    Cuadrilla = 2
}