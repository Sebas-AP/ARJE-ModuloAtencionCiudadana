using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace ARJE.Api.Servicios;

public class AlmacenadorArchivosLocal : IAlmacenadorArchivos
{
    private readonly IWebHostEnvironment _env;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly string _baseUrl;
    private readonly long _maxFileSizeBytes = 10 * 1024 * 1024; // 10 MB
    private readonly string[] _allowedMimeTypes = { "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif" };
    private readonly Dictionary<string, byte[]> _magicBytes = new()
    {
        { "image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF } },
        { "image/png", new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A } },
        { "image/webp", new byte[] { 0x52, 0x49, 0x46, 0x46 } }, // RIFF header, need to check WEBP at offset 8
        { "image/heic", new byte[] { 0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63 } }, // ftypheic
        { "image/heif", new byte[] { 0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x66 } }, // ftypheif
    };

    public AlmacenadorArchivosLocal(
        IWebHostEnvironment env,
        IHttpContextAccessor httpContextAccessor,
        IConfiguration configuration)
    {
        _env = env;
        _httpContextAccessor = httpContextAccessor;
        _baseUrl = configuration["BaseUrl"] ?? "";
        
        var maxSizeConfig = configuration["MaxFileSizeMB"];
        if (int.TryParse(maxSizeConfig, out var maxSizeMB) && maxSizeMB > 0)
        {
            _maxFileSizeBytes = maxSizeMB * 1024 * 1024;
        }
    }

    public async Task<ArchivoValidacionResult> ValidarArchivo(IFormFile archivo)
    {
        if (archivo == null || archivo.Length == 0)
        {
            return new ArchivoValidacionResult { EsValido = false, ErrorMessage = "El archivo está vacío" };
        }

        if (archivo.Length > _maxFileSizeBytes)
        {
            return new ArchivoValidacionResult 
            { 
                EsValido = false, 
                ErrorMessage = $"El archivo excede el tamaño máximo permitido de {_maxFileSizeBytes / (1024 * 1024)} MB",
                FileSize = archivo.Length
            };
        }

        var declaredContentType = archivo.ContentType?.ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(declaredContentType) || !_allowedMimeTypes.Contains(declaredContentType))
        {
            return new ArchivoValidacionResult 
            { 
                EsValido = false, 
                ErrorMessage = $"Tipo de archivo no permitido. Tipos permitidos: {string.Join(", ", _allowedMimeTypes)}",
                ContentType = declaredContentType,
                FileSize = archivo.Length
            };
        }

        // Validar magic bytes
        try
        {
            archivo.OpenReadStream().Position = 0;
            var buffer = new byte[12];
            await archivo.OpenReadStream().ReadExactlyAsync(buffer, 0, 12);
            archivo.OpenReadStream().Position = 0;

            var isValidMagic = false;
            if (_magicBytes.TryGetValue(declaredContentType, out var expectedBytes))
            {
                if (declaredContentType == "image/webp")
                {
                    // WEBP: RIFF header + "WEBP" at offset 8
                    isValidMagic = buffer[0] == 0x52 && buffer[1] == 0x49 && buffer[2] == 0x46 && buffer[3] == 0x46 &&
                                 buffer.Length >= 12 && buffer[8] == 0x57 && buffer[9] == 0x45 && buffer[10] == 0x42 && buffer[11] == 0x50;
                }
                else
                {
                    isValidMagic = buffer.Take(expectedBytes.Length).SequenceEqual(expectedBytes);
                }
            }

            if (!isValidMagic)
            {
                return new ArchivoValidacionResult 
                { 
                    EsValido = false, 
                    ErrorMessage = "El contenido del archivo no coincide con su tipo declarado",
                    ContentType = declaredContentType,
                    FileSize = archivo.Length
                };
            }
        }
        catch
        {
            return new ArchivoValidacionResult 
            { 
                EsValido = false, 
                ErrorMessage = "No se pudo validar el contenido del archivo",
                ContentType = declaredContentType,
                FileSize = archivo.Length
            };
        }

        return new ArchivoValidacionResult { EsValido = true, ContentType = declaredContentType, FileSize = archivo.Length };
    }

    public async Task<ArchivoGuardadoResult> GuardarArchivo(string contenedor, IFormFile archivo)
    {
        var validacion = await ValidarArchivo(archivo);
        if (!validacion.EsValido)
        {
            return new ArchivoGuardadoResult { Exitoso = false, ErrorMessage = validacion.ErrorMessage };
        }

        try
        {
            var extension = Path.GetExtension(archivo.FileName);
            // Normalizar extensión según MIME type real
            extension = validacion.ContentType?.ToLowerInvariant() switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                "image/heic" => ".heic",
                "image/heif" => ".heif",
                _ => extension
            };

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

            // Verificar que el archivo se escribió correctamente
            var fileInfo = new FileInfo(rutaCompleta);
            if (!fileInfo.Exists || fileInfo.Length == 0)
            {
                if (fileInfo.Exists) File.Delete(rutaCompleta);
                return new ArchivoGuardadoResult { Exitoso = false, ErrorMessage = "El archivo guardado está vacío o corrupto" };
            }

            var url = $"{_baseUrl}/{contenedor}/{nombreArchivo}";
            return new ArchivoGuardadoResult { Exitoso = true, Url = url };
        }
        catch (Exception ex)
        {
            return new ArchivoGuardadoResult { Exitoso = false, ErrorMessage = $"Error al guardar archivo: {ex.Message}" };
        }
    }

    public async Task<ArchivoGuardadoResult> EditarArchivo(string contenedor, IFormFile archivo, string rutaArchivoActual)
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