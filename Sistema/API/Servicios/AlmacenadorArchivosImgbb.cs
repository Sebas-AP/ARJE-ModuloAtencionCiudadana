using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace ARJE.Api.Servicios;

public class AlmacenadorArchivosImgbb : IAlmacenadorArchivos
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly long _maxFileSizeBytes = 10 * 1024 * 1024;
    private readonly string[] _allowedMimeTypes = { "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif" };

    public AlmacenadorArchivosImgbb(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = configuration["Imgbb:ApiKey"] ?? "a7e8cb9da6b9b8e9c2d2648a572a362e";

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
            using var ms = new MemoryStream();
            await archivo.CopyToAsync(ms);
            var bytes = ms.ToArray();

            var base64 = Convert.ToBase64String(bytes);

            var formData = new MultipartFormDataContent
            {
                { new StringContent(_apiKey), "key" },
                { new StringContent(base64), "image" }
            };

            var response = await _httpClient.PostAsync("https://api.imgbb.com/1/upload", formData);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                return new ArchivoGuardadoResult { Exitoso = false, ErrorMessage = $"Error al subir a imgbb: {errorContent}" };
            }

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ImgbbResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (result?.Data?.Url != null)
            {
                return new ArchivoGuardadoResult { Exitoso = true, Url = result.Data.Url };
            }

            return new ArchivoGuardadoResult { Exitoso = false, ErrorMessage = "No se pudo obtener la URL de la imagen subida" };
        }
        catch (Exception ex)
        {
            return new ArchivoGuardadoResult { Exitoso = false, ErrorMessage = $"Error al subir archivo a imgbb: {ex.Message}" };
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
        return Task.CompletedTask;
    }

    private class ImgbbResponse
    {
        public ImgbbData? Data { get; set; }
        public bool Success { get; set; }
        public int Status { get; set; }
    }

    private class ImgbbData
    {
        public string? Url { get; set; }
        public string? DisplayUrl { get; set; }
        public string? DeleteUrl { get; set; }
    }
}