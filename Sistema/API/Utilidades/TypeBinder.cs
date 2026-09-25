using Microsoft.AspNetCore.Mvc.ModelBinding;
using System.Text.Json;

namespace ARJE.Api.Utilidades;

public class TypeBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        var nombrePropiedad = bindingContext.ModelName;
        var proveedorValor = bindingContext.ValueProvider.GetValue(nombrePropiedad);

        if (proveedorValor == ValueProviderResult.None)
        {
            return Task.CompletedTask;
        }

        var valor = proveedorValor.FirstValue;

        if (string.IsNullOrEmpty(valor))
        {
            return Task.CompletedTask;
        }

        try
        {
            var opciones = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var resultado = JsonSerializer.Deserialize(valor, bindingContext.ModelType, opciones);
            bindingContext.Result = ModelBindingResult.Success(resultado!);
        }
        catch (JsonException)
        {
            bindingContext.ModelState.TryAddModelError(nombrePropiedad, "El valor proporcionado no es un JSON válido.");
        }

        return Task.CompletedTask;
    }
}

[AttributeUsage(AttributeTargets.Parameter | AttributeTargets.Property)]
public class TypeBinderAttribute : Attribute, IModelBinderProvider
{
    public IModelBinder GetBinder(ModelBinderProviderContext context)
    {
        if (context.Metadata.ModelType.IsClass && context.Metadata.ModelType != typeof(string))
        {
            return new TypeBinder();
        }

        return null!;
    }
}