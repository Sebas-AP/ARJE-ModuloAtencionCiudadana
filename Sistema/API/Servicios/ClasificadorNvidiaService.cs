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
                model = "meta/llama-3.2-11b-vision-instruct",
                messages = new[]
                {
                    new { role = "system", content = "Eres el Agente Inteligente de Triage, Clasificación y Priorización de reportes de agua de ARJE. Responde EXCLUSIVAMENTE con JSON válido." },
                    new { role = "user", content = prompt }
                },
                temperature = 0.1,
                max_tokens = 250,
                top_p = 0.9
            };

            var response = await _httpClient.PostAsJsonAsync("chat/completions", request);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<NvidiaResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            var content = result?.Choices?[0]?.Message?.Content?.Trim() ?? "";
            return ParsearRespuesta(content, descripcion);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error llamando a API NVIDIA, usando clasificación y priorización de respaldo (fallback)");
            return ClasificacionFallback(descripcion);
        }
    }

    private string ConstruirPrompt(string descripcion)
    {
        var categoriasStr = string.Join(", ", Categorias);
        return $@"Eres el Agente Experto de Triage y Priorización de Incidencias de Agua Potable.
Analiza este reporte ciudadano: ""{descripcion}""

INSTRUCCIONES DE EVALUACIÓN:
1. Categoría: Asigna exactamente UNA de estas opciones: {categoriasStr}
2. Prioridad Operativa:
   - 'Critica' (score 0.85-1.00): Riesgo vital, socavón/hundimiento, fuga torrencial en vía principal, desabasto a hospitales/escuelas, inundación a viviendas o agua contaminada.
   - 'Alta' (score 0.65-0.84): Fuga de gran caudal en calle secundaria, desabasto total en colonia (>24h), registro sin tapa en banqueta concurrida.
   - 'Media' (score 0.35-0.64): Fuga domiciliaria externa moderada, baja presión generalizada, hidrante goteando, instalación rota sin riesgo de colapso.
   - 'Baja' (score 0.00-0.34): Goteo leve de medidor, medidor empañado sin fuga, aclaración administrativa, uso indebido menor.

Responde ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
{{
  ""categoria"": ""nombre_exacto_categoria"",
  ""confianza"": 0.95,
  ""razonamiento"": ""breve justificación de categoría"",
  ""prioridad"": ""Critica"",
  ""scorePrioridad"": 0.92,
  ""justificacionPrioridad"": ""explicación clara y concisa del porqué de la prioridad asignada"",
  ""requiereAtencionInmediata"": true
}}";
    }

    private ClasificacionResult ParsearRespuesta(string content, string descripcionOriginal)
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
                    var catTrim = parsed.Categoria.Trim();
                    var tipoEnum = MapeoCategoriaAEnum.GetValueOrDefault(catTrim, TipoProblema.Otro);

                    if (tipoEnum == TipoProblema.Otro && !catTrim.Equals("Otro", StringComparison.OrdinalIgnoreCase))
                    {
                        var match = MapeoCategoriaAEnum.FirstOrDefault(kvp =>
                            kvp.Key.Contains(catTrim, StringComparison.OrdinalIgnoreCase) ||
                            catTrim.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase));

                        if (!string.IsNullOrEmpty(match.Key))
                        {
                            tipoEnum = match.Value;
                        }
                    }

                    // Mapear prioridad
                    var prioridad = ParsearPrioridad(parsed.Prioridad);
                    var score = parsed.ScorePrioridad > 0 ? parsed.ScorePrioridad : ObtenerScorePorDefecto(prioridad);

                    return new ClasificacionResult
                    {
                        Categoria = catTrim,
                        TipoProblema = tipoEnum.ToString(),
                        Confianza = parsed.Confianza > 0 ? parsed.Confianza : 0.85,
                        Razonamiento = parsed.Razonamiento ?? "Clasificado por Agente IA",
                        Prioridad = prioridad,
                        ScorePrioridad = Math.Round(score, 2),
                        JustificacionPrioridad = !string.IsNullOrWhiteSpace(parsed.JustificacionPrioridad)
                            ? parsed.JustificacionPrioridad.Trim()
                            : $"Prioridad {prioridad} asignada según impacto y severidad evaluados por IA",
                        RequiereAtencionInmediata = parsed.RequiereAtencionInmediata || prioridad == PrioridadReporte.Critica
                    };
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo deserializar respuesta de IA: {Content}", content);
        }

        return ClasificacionFallback(descripcionOriginal);
    }

    private PrioridadReporte ParsearPrioridad(string? prioridadStr)
    {
        if (string.IsNullOrWhiteSpace(prioridadStr)) return PrioridadReporte.Media;
        var p = prioridadStr.Trim().ToLowerInvariant();
        if (p.Contains("crit") || p.Contains("crít")) return PrioridadReporte.Critica;
        if (p.Contains("alt")) return PrioridadReporte.Alta;
        if (p.Contains("med")) return PrioridadReporte.Media;
        if (p.Contains("baj")) return PrioridadReporte.Baja;
        return PrioridadReporte.Media;
    }

    private double ObtenerScorePorDefecto(PrioridadReporte prioridad)
    {
        return prioridad switch
        {
            PrioridadReporte.Critica => 0.95,
            PrioridadReporte.Alta => 0.75,
            PrioridadReporte.Media => 0.50,
            PrioridadReporte.Baja => 0.25,
            _ => 0.50
        };
    }

    private ClasificacionResult ClasificacionFallback(string descripcion)
    {
        var desc = descripcion.ToLowerInvariant();

        // 1. Determinar categoría y tipo
        string categoria = "Otro";
        TipoProblema tipoProblema = TipoProblema.Otro;
        string razonamiento = "Clasificación por análisis heurístico de respaldo";
        double confianza = 0.75;

        if (desc.Contains("fuga") || desc.Contains("goteo") || desc.Contains("chorro") || desc.Contains("brote") || desc.Contains("escape"))
        {
            if (desc.Contains("domicil") || desc.Contains("casa") || desc.Contains("hogar"))
            {
                categoria = "Fuga domiciliaria";
                tipoProblema = TipoProblema.Fuga;
                razonamiento = "Detección de fuga en ámbito domiciliario";
            }
            else
            {
                categoria = "Fuga en vía pública";
                tipoProblema = TipoProblema.Fuga;
                razonamiento = "Detección de fuga de agua en vía pública";
            }
        }
        else if (desc.Contains("presion") || desc.Contains("presión") || desc.Contains("poco chorro") || desc.Contains("baja"))
        {
            categoria = "Baja presión del agua";
            tipoProblema = TipoProblema.FaltaAbastecimiento;
            razonamiento = "Detección de problemas de presión insuficiente";
        }
        else if (desc.Contains("no hay agua") || desc.Contains("sin agua") || desc.Contains("falta agua") || desc.Contains("corte") || desc.Contains("suspension") || desc.Contains("suspensión"))
        {
            categoria = "Falta de abastecimiento";
            tipoProblema = TipoProblema.FaltaAbastecimiento;
            razonamiento = "Detección de desabasto total o corte de servicio";
        }
        else if (desc.Contains("intermitent") || desc.Contains("va y viene") || desc.Contains("a ratos"))
        {
            categoria = "Suministro intermitente";
            tipoProblema = TipoProblema.FaltaAbastecimiento;
            razonamiento = "Detección de suministro irregular";
        }
        else if (desc.Contains("hundim") || desc.Contains("socavon") || desc.Contains("socavón") || desc.Contains("hoyo") || desc.Contains("zanja"))
        {
            categoria = "Hundimiento o socavón por fuga";
            tipoProblema = TipoProblema.Fuga;
            razonamiento = "Detección de colapso de suelo o socavón por filtración de agua";
        }
        else if (desc.Contains("medidor") || desc.Contains("contador"))
        {
            categoria = "Medidor dañado";
            tipoProblema = TipoProblema.InstalacionRota;
            razonamiento = "Detección de daño en aparato de medición";
        }
        else if (desc.Contains("registro") || desc.Contains("tapa") || desc.Contains("alcantarilla"))
        {
            categoria = "Registro dañado o sin tapa";
            tipoProblema = TipoProblema.InstalacionRota;
            razonamiento = "Detección de registro o alcantarilla descubierta o dañada";
        }
        else if (desc.Contains("sucia") || desc.Contains("contaminada") || desc.Contains("turbia") || desc.Contains("mal olor") || desc.Contains("color"))
        {
            categoria = "Agua contaminada o sucia";
            tipoProblema = TipoProblema.Otro;
            razonamiento = "Detección de anomalías en calidad de agua potable";
        }
        else if (desc.Contains("roto") || desc.Contains("quebrado") || desc.Contains("dañado") || desc.Contains("grieta"))
        {
            categoria = "Instalación rota";
            tipoProblema = TipoProblema.InstalacionRota;
            razonamiento = "Detección de tubería o infraestructura hidráulica fracturada";
        }
        else if (desc.Contains("robo") || desc.Contains("ilegal") || desc.Contains("toma clandestina") || desc.Contains("desperdicio"))
        {
            categoria = "Uso indebido";
            tipoProblema = TipoProblema.UsoIndebido;
            razonamiento = "Detección de presunto uso indebido o toma irregular";
        }

        // 2. Determinar Prioridad por análisis heurístico de severidad
        PrioridadReporte prioridad = PrioridadReporte.Media;
        double scorePrioridad = 0.50;
        string justificacionPrioridad;
        bool requiereInmediata = false;

        // Criterios de prioridad Crítica
        if (desc.Contains("socavon") || desc.Contains("socavón") || desc.Contains("hundim") ||
            desc.Contains("hospital") || desc.Contains("clinica") || desc.Contains("clínica") ||
            desc.Contains("escuela") || desc.Contains("inundaci") || desc.Contains("inundando") ||
            desc.Contains("peligro") || desc.Contains("vida") || desc.Contains("torrencial") ||
            desc.Contains("desesperad") || desc.Contains("cables") || desc.Contains("colaps") ||
            desc.Contains("caer") || desc.Contains("accidente"))
        {
            prioridad = PrioridadReporte.Critica;
            scorePrioridad = 0.95;
            justificacionPrioridad = "Prioridad Crítica: Se detectaron riesgos de colapso de suelo, afectación a centros vulnerables o peligro vial/estructural.";
            requiereInmediata = true;
        }
        // Criterios de prioridad Alta
        else if (desc.Contains("colonia") || desc.Contains("toda la") || desc.Contains("dias sin") ||
                 desc.Contains("días sin") || desc.Contains("muchos vecinos") || desc.Contains("sin servicio") ||
                 desc.Contains("avenida") || desc.Contains("calle principal") || desc.Contains("sin tapa") ||
                 desc.Contains("abierto") || desc.Contains("brote fuerte") || desc.Contains("caudal grande") ||
                 desc.Contains("mucha agua"))
        {
            prioridad = PrioridadReporte.Alta;
            scorePrioridad = 0.78;
            justificacionPrioridad = "Prioridad Alta: Fuga de gran volumen o desabasto generalizado que afecta a múltiples usuarios.";
        }
        // Criterios de prioridad Baja
        else if (desc.Contains("goteo leve") || desc.Contains("pequeña gota") || desc.Contains("empañado") ||
                 desc.Contains("empañado") || desc.Contains("vidrio sucio") || desc.Contains("aclaracion") ||
                 desc.Contains("aclaración") || desc.Contains("duda") || desc.Contains("poco a poco"))
        {
            prioridad = PrioridadReporte.Baja;
            scorePrioridad = 0.20;
            justificacionPrioridad = "Prioridad Baja: Reporte menor de baja urgencia sin riesgo a la red pública.";
        }
        // Criterio Media por defecto
        else
        {
            prioridad = PrioridadReporte.Media;
            scorePrioridad = 0.50;
            justificacionPrioridad = "Prioridad Media: Incidencia estándar programada para asignación de cuadrilla de zona.";
        }

        return new ClasificacionResult
        {
            Categoria = categoria,
            TipoProblema = tipoProblema.ToString(),
            Confianza = confianza,
            Razonamiento = razonamiento,
            Prioridad = prioridad,
            ScorePrioridad = scorePrioridad,
            JustificacionPrioridad = justificacionPrioridad,
            RequiereAtencionInmediata = requiereInmediata
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
        public string? Prioridad { get; set; }
        public double ScorePrioridad { get; set; }
        public string? JustificacionPrioridad { get; set; }
        public bool RequiereAtencionInmediata { get; set; }
    }
}