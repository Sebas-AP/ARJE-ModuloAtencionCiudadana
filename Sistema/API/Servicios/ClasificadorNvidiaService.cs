using System.Text.Json;
using ARJE.Api.Entidades.Enums;

namespace ARJE.Api.Servicios;

public class ClasificadorNvidiaService : IClasificadorService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ClasificadorNvidiaService> _logger;

    private static readonly string[] Categorias = new[]
    {
        "Agua contaminada o sucia",
        "Baja presion del agua",
        "Falta de abastecimiento",
        "Fuga domiciliaria",
        "Fuga en via publica",
        "Hundimiento o socavon por fuga",
        "Instalacion rota",
        "Medidor dañado",
        "Otro",
        "Registro dañado o sin tapa",
        "Suministro intermitente",
        "Uso indevido"
    };

    private static readonly Dictionary<string, TipoProblema> MapeoCategoriaAEnum = new(StringComparer.OrdinalIgnoreCase)
    {
        { "Agua contaminada o sucia", TipoProblema.Otro },
        { "Baja presion del agua", TipoProblema.FaltaAbastecimiento },
        { "Falta de abastecimiento", TipoProblema.FaltaAbastecimiento },
        { "Fuga domiciliaria", TipoProblema.Fuga },
        { "Fuga en via publica", TipoProblema.Fuga },
        { "Hundimiento o socavon por fuga", TipoProblema.Fuga },
        { "Instalacion rota", TipoProblema.InstalacionRota },
        { "Medidor dañado", TipoProblema.InstalacionRota },
        { "Otro", TipoProblema.Otro },
        { "Registro dañado o sin tapa", TipoProblema.InstalacionRota },
        { "Suministro intermitente", TipoProblema.FaltaAbastecimiento },
        { "Uso indevido", TipoProblema.UsoIndebido }
    };

    public ClasificadorNvidiaService(HttpClient httpClient, IConfiguration configuration, ILogger<ClasificadorNvidiaService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        var apiKey = _configuration["NvidiaApiKey"] ?? "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";
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
        _httpClient.BaseAddress = new Uri("https://integrate.api.nvidia.com/v1/");
    }

    public async Task<ClasificacionResult> ClasificarReporteAsync(string descripcion)
    {
        try
        {
            var prompt = ConstruirPrompt(descripcion);

            var request = new
            {
                model = "meta/llama-3.1-8b-instruct",
                messages = new[]
                {
                    new { role = "system", content = "Eres un clasificador de reportes de agua. Responde SOLO con JSON válido." },
                    new { role = "user", content = prompt }
                },
                temperature = 0.1,
                max_tokens = 150,
                top_p = 0.9
            };

            var response = await _httpClient.PostAsJsonAsync("chat/completions", request);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<NvidiaResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            var content = result?.Choices?[0]?.Message?.Content?.Trim() ?? "";
            return ParsearRespuesta(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clasificando reporte, usando fallback");
            return ClasificacionFallback(descripcion);
        }
    }

    private string ConstruirPrompt(string descripcion)
    {
        var categoriasStr = string.Join(", ", Categorias);
        return $@"Clasifica este reporte de agua en UNA de estas categorías: {categoriasStr}

Reporte: ""{descripcion}""

Responde SOLO con JSON:
{{""categoria"": ""nombre_exacto_categoria"", ""confianza"": 0.95, ""razonamiento"": ""breve_explicacion""}}";
    }

    private ClasificacionResult ParsearRespuesta(string content)
    {
        try
        {
            var jsonStart = content.IndexOf('{');
            var jsonEnd = content.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var json = content.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var parsed = JsonSerializer.Deserialize<ClasificacionJson>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (parsed != null && !string.IsNullOrEmpty(parsed.Categoria))
                {
                    var tipoEnum = MapeoCategoriaAEnum.GetValueOrDefault(parsed.Categoria, TipoProblema.Otro);
                    return new ClasificacionResult
                    {
                        TipoProblema = tipoEnum.ToString(),
                        Confianza = parsed.Confianza,
                        Razonamiento = parsed.Razonamiento ?? ""
                    };
                }
            }
        }
        catch { }

        return new ClasificacionResult
        {
            TipoProblema = TipoProblema.Otro.ToString(),
            Confianza = 0.5,
            Razonamiento = "No se pudo parsear la respuesta de la IA"
        };
    }

    private ClasificacionResult ClasificacionFallback(string descripcion)
    {
        var desc = descripcion.ToLowerInvariant();

        if (desc.Contains("fuga") || desc.Contains("goteo") || desc.Contains("chorro") || desc.Contains("brote") || desc.Contains("escape"))
        {
            if (desc.Contains("domicil") || desc.Contains("casa") || desc.Contains("hogar"))
                return new ClasificacionResult { TipoProblema = TipoProblema.Fuga.ToString(), Confianza = 0.8, Razonamiento = "Palabras clave: fuga domiciliaria" };
            if (desc.Contains("calle") || desc.Contains("via") || desc.Contains("publica") || desc.Contains("banqueta"))
                return new ClasificacionResult { TipoProblema = TipoProblema.Fuga.ToString(), Confianza = 0.8, Razonamiento = "Palabras clave: fuga en via publica" };
            return new ClasificacionResult { TipoProblema = TipoProblema.Fuga.ToString(), Confianza = 0.75, Razonamiento = "Palabras clave: fuga" };
        }

        if (desc.Contains("presion") || desc.Contains("poco chorro") || desc.Contains("baja") || desc.Contains("gotea apenas"))
            return new ClasificacionResult { TipoProblema = TipoProblema.FaltaAbastecimiento.ToString(), Confianza = 0.8, Razonamiento = "Palabras clave: baja presion" };

        if (desc.Contains("no hay agua") || desc.Contains("sin agua") || desc.Contains("falta agua") || desc.Contains("corte") || desc.Contains("suspension"))
            return new ClasificacionResult { TipoProblema = TipoProblema.FaltaAbastecimiento.ToString(), Confianza = 0.85, Razonamiento = "Palabras clave: falta de abastecimiento" };

        if (desc.Contains("intermitent") || desc.Contains("va y viene") || desc.Contains("a ratos"))
            return new ClasificacionResult { TipoProblema = TipoProblema.FaltaAbastecimiento.ToString(), Confianza = 0.75, Razonamiento = "Palabras clave: suministro intermitente" };

        if (desc.Contains("roto") || desc.Contains("quebrado") || desc.Contains("dañado") || desc.Contains("partido") || desc.Contains("grieta"))
            return new ClasificacionResult { TipoProblema = TipoProblema.InstalacionRota.ToString(), Confianza = 0.8, Razonamiento = "Palabras clave: instalacion rota" };

        if (desc.Contains("medidor") || desc.Contains("contador"))
            return new ClasificacionResult { TipoProblema = TipoProblema.InstalacionRota.ToString(), Confianza = 0.8, Razonamiento = "Palabras clave: medidor dañado" };

        if (desc.Contains("registro") || desc.Contains("tapa") || desc.Contains("alcantarilla"))
            return new ClasificacionResult { TipoProblema = TipoProblema.InstalacionRota.ToString(), Confianza = 0.75, Razonamiento = "Palabras clave: registro dañado" };

        if (desc.Contains("hundim") || desc.Contains("socavon") || desc.Contains("hoyo"))
            return new ClasificacionResult { TipoProblema = TipoProblema.Fuga.ToString(), Confianza = 0.75, Razonamiento = "Palabras clave: hundimiento por fuga" };

        if (desc.Contains("sucia") || desc.Contains("contaminada") || desc.Contains("turbia") || desc.Contains("color") || desc.Contains("mal olor"))
            return new ClasificacionResult { TipoProblema = TipoProblema.Otro.ToString(), Confianza = 0.7, Razonamiento = "Palabras clave: agua contaminada" };

        if (desc.Contains("robo") || desc.Contains("hurto") || desc.Contains("ilegal") || desc.Contains("bypass") || desc.Contains("manguera") || desc.Contains("riego") || desc.Contains("lavado") || desc.Contains("piscina"))
            return new ClasificacionResult { TipoProblema = TipoProblema.UsoIndebido.ToString(), Confianza = 0.8, Razonamiento = "Palabras clave: uso indebido" };

        return new ClasificacionResult
        {
            TipoProblema = TipoProblema.Otro.ToString(),
            Confianza = 0.5,
            Razonamiento = "Clasificación por palabras clave (fallback)"
        };
    }

    private class NvidiaResponse
    {
        public Choice[]? Choices { get; set; }
    }

    private class Choice
    {
        public Message? Message { get; set; }
    }

    private class Message
    {
        public string? Content { get; set; }
    }

    private class ClasificacionJson
    {
        public string? Categoria { get; set; }
        public double Confianza { get; set; }
        public string? Razonamiento { get; set; }
    }
}