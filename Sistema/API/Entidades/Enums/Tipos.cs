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

public enum PrioridadReporte
{
    Baja = 1,
    Media = 2,
    Alta = 3,
    Critica = 4
}

public enum UnidadTiempoEstimado
{
    Horas = 1,
    Dias = 2
}

public enum MotivoEnProceso
{
    LlegandoAlLugar = 1,
    LevantandoInformacion = 2,
    PidiendoHerramientasYMateriales = 3,
    ComenzandoReparacion = 4,
    Otro = 5
}

public enum MotivoResolucion
{
    FugaReparada = 1,
    SuministroRestablecido = 2,
    FallaSolucionada = 3,
    CalidadAguaMejorada = 4,
    UsoIndebidoCorregido = 5,
    Otro = 6
}