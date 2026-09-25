using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace ARJE.Api.Servicios;

public class AlmacenadorArchivosLocal : IAlmacenadorArchivos
{
    private readonly IWebHostEnvironment _env;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly string _baseUrl;

    public AlmacenadorArchivosLocal(
        IWebHostEnvironment env,
        IHttpContextAccessor httpContextAccessor,
        IConfiguration configuration)
    {
        _env = env;
        _httpContextAccessor = httpContextAccessor;
        _baseUrl = configuration["BaseUrl"] ?? "";
    }

    public async Task<string> GuardarArchivo(string contenedor, IFormFile archivo)
    {
        var extension = Path.GetExtension(archivo.FileName);
        var nombreArchivo = $"{Guid.NewGuid()}{extension}";
        var rutaContenedor = Path.Combine(_env.WebRootPath, contenedor);

        if (!Directory.Exists(rutaContenedor))
        {
            Directory.CreateDirectory(rutaContenedor);
        }

        var rutaCompleta = Path.Combine(rutaContenedor, nombreArchivo);

        using (var stream = new FileStream(rutaCompleta, FileMode.Create))
        {
            await archivo.CopyToAsync(stream);
        }

        var url = $"{_baseUrl}/{contenedor}/{nombreArchivo}";
        return url;
    }

    public async Task<string> EditarArchivo(string contenedor, IFormFile archivo, string rutaArchivoActual)
    {
        if (!string.IsNullOrEmpty(rutaArchivoActual))
        {
            await BorrarArchivo(contenedor, rutaArchivoActual);
        }

        return await GuardarArchivo(contenedor, archivo);
    }

    public Task BorrarArchivo(string contenedor, string rutaArchivo)
    {
        if (string.IsNullOrEmpty(rutaArchivo))
        {
            return Task.CompletedTask;
        }

        var nombreArchivo = Path.GetFileName(rutaArchivo);
        var rutaCompleta = Path.Combine(_env.WebRootPath, contenedor, nombreArchivo);

        if (File.Exists(rutaCompleta))
        {
            File.Delete(rutaCompleta);
        }

        return Task.CompletedTask;
    }
}