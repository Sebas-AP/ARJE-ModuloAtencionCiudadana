using Microsoft.AspNetCore.Http;

namespace ARJE.Api.Servicios;

public class ArchivoValidacionResult
{
    public bool EsValido { get; set; }
    public string? ErrorMessage { get; set; }
    public string? ContentType { get; set; }
    public long FileSize { get; set; }
}

public class ArchivoGuardadoResult
{
    public bool Exitoso { get; set; }
    public string? Url { get; set; }
    public string? ErrorMessage { get; set; }
}

public interface IAlmacenadorArchivos
{
    Task<ArchivoValidacionResult> ValidarArchivo(IFormFile archivo);
    Task<ArchivoGuardadoResult> GuardarArchivo(string contenedor, IFormFile archivo);
    Task<ArchivoGuardadoResult> EditarArchivo(string contenedor, IFormFile archivo, string rutaArchivoActual);
    Task BorrarArchivo(string contenedor, string rutaArchivo);
}