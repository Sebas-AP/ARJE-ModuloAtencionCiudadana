using Microsoft.AspNetCore.Mvc;
using ARJE.Api.Servicios;
using ARJE.Api.Entidades.Enums;
using ARJE.Api.DTOs.Usuario;

namespace ARJE.Api.Controllers;

[ApiController]
[Route("api/clasificacion")]
public class ClasificacionController : ControllerBase
{
    private readonly IClasificadorService _clasificador;

    public ClasificacionController(IClasificadorService clasificador)
    {
        _clasificador = clasificador;
    }

    [HttpPost]
    public async Task<ActionResult<ClasificacionResponseDTO>> Clasificar([FromBody] ClasificacionRequestDTO request)
    {
        if (string.IsNullOrWhiteSpace(request?.Descripcion))
        {
            return BadRequest(new { mensaje = "La descripción es requerida" });
        }

        try
        {
            var resultado = await _clasificador.ClasificarReporteAsync(request.Descripcion);

            return Ok(new ClasificacionResponseDTO
            {
                Categoria = resultado.Categoria,
                TipoProblema = Enum.TryParse<TipoProblema>(resultado.TipoProblema, out var tipo) ? tipo : TipoProblema.Otro,
                Confianza = resultado.Confianza,
                Razonamiento = resultado.Razonamiento,
                Prioridad = resultado.Prioridad,
                PrioridadNombre = resultado.Prioridad.ToString(),
                ScorePrioridad = resultado.ScorePrioridad,
                JustificacionPrioridad = resultado.JustificacionPrioridad,
                RequiereAtencionInmediata = resultado.RequiereAtencionInmediata
            });
        }
        catch
        {
            return Ok(new ClasificacionResponseDTO
            {
                Categoria = "Otro",
                TipoProblema = TipoProblema.Otro,
                Confianza = 0.5,
                Razonamiento = "Clasificación asignada por seguridad",
                Prioridad = PrioridadReporte.Media,
                PrioridadNombre = "Media",
                ScorePrioridad = 0.50,
                JustificacionPrioridad = "Prioridad asignada por seguridad",
                RequiereAtencionInmediata = false
            });
        }
    }
}

public class ClasificacionRequestDTO
{
    public string Descripcion { get; set; } = string.Empty;
}

public class ClasificacionResponseDTO
{
    public string Categoria { get; set; } = string.Empty;
    public TipoProblema TipoProblema { get; set; }
    public double Confianza { get; set; }
    public string Razonamiento { get; set; } = string.Empty;
    public PrioridadReporte Prioridad { get; set; }
    public string PrioridadNombre { get; set; } = string.Empty;
    public double ScorePrioridad { get; set; }
    public string JustificacionPrioridad { get; set; } = string.Empty;
    public bool RequiereAtencionInmediata { get; set; }
}