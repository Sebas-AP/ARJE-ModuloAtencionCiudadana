using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;
using ARJE.Api.Entidades;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;
using ARJE.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var useSqlite = builder.Environment.IsDevelopment() && !string.IsNullOrEmpty(connectionString) && connectionString.EndsWith(".db");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (useSqlite)
    {
        options.UseSqlite(connectionString);
    }
    else
    {
        options.UseSqlServer(connectionString);
    }
});

builder.Services.AddAutoMapper(_ => { }, typeof(AutoMapperProfiles));

builder.Services.AddOutputCache(options =>
{
    options.DefaultExpirationTimeSpan = TimeSpan.FromSeconds(60);
});

builder.Services.AddArjeCors(
    builder.Configuration["origenesPermitidos"],
    builder.Environment.IsDevelopment());

builder.Services.AddHttpClient();
builder.Services.AddScoped<IAlmacenadorArchivos, AlmacenadorArchivosImgbb>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IUbicacionesCuadrillaService, UbicacionesCuadrillaService>();
builder.Services.AddScoped<IUbicacionesPublisher, UbicacionesPublisher>();
builder.Services.AddSignalR();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddHttpContextAccessor();

builder.Services.AddArjeJwtAuthentication(builder.Configuration);
builder.Services.AddAuthorization();

// HTTP Client para NVIDIA API (timeout ágil de 10s para fallback inmediato en caso de red lenta)
builder.Services.AddHttpClient<IClasificadorService, ClasificadorNvidiaService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ARJE API - Atención Ciudadana", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Autenticación JWT usando el esquema Bearer. Ingrese 'Bearer' [espacio] y luego su token.\r\n\r\nEjemplo: \"Bearer eyJhbGciOi...\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (dbContext.Database.IsRelational())
    {
        dbContext.Database.Migrate();
    }

    await CuadrillasIniciales.AsegurarRegistradasAsync(dbContext);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(ArjeCorsConfiguration.PolicyName);

// Servir archivos estáticos (evidencias)
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();
app.UseOutputCache();
app.MapControllers();
app.MapHub<UbicacionesHub>(ArjeAuthenticationConfiguration.HubPath, options =>
{
    options.CloseOnAuthenticationExpiration = true;
});

app.Run();
