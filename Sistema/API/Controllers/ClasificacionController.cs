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
        if (string.IsNullOrWhiteSpace(request.Descripcion))
        {
            return BadRequest(new { mensaje = "La descripción es requerida" });
        }

        var resultado = await _clasificador.ClasificarReporteAsync(request.Descripcion);

        return Ok(new ClasificacionResponseDTO
        {
            TipoProblema = Enum.TryParse<TipoProblema>(resultado.TipoProblema, out var tipo) ? tipo : TipoProblema.Otro,
            Confianza = resultado.Confianza,
            Razonamiento = resultado.Razonamiento
        });
    }
}

public class ClasificacionRequestDTO
{
    public string Descripcion { get; set; } = string.Empty;
}

public class ClasificacionResponseDTO
{
    public TipoProblema TipoProblema { get; set; }
    public double Confianza { get; set; }
    public string Razonamiento { get; set; } = string.Empty;
}