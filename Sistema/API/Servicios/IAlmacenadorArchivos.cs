using Microsoft.AspNetCore.Http;

namespace ARJE.Api.Servicios;

public interface IAlmacenadorArchivos
{
    Task<string> GuardarArchivo(string contenedor, IFormFile archivo);
    Task<string> EditarArchivo(string contenedor, IFormFile archivo, string rutaArchivoActual);
    Task BorrarArchivo(string contenedor, string rutaArchivo);
}