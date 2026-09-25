using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.OutputCaching;
using ARJE.Api.Entidades;
using ARJE.Api.Servicios;
using ARJE.Api.Utilidades;

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

builder.Services.AddAutoMapper(typeof(AutoMapperProfiles));

builder.Services.AddOutputCache(options =>
{
    options.DefaultExpirationTimeSpan = TimeSpan.FromSeconds(60);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("permitirTodo", policy =>
    {
        var origenes = builder.Configuration["origenesPermitidos"]?.Split(',', StringSplitOptions.RemoveEmptyEntries)
            ?? new[] { "http://localhost:5173" };

        policy.WithOrigins(origenes)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddScoped<IAlmacenadorArchivos, AlmacenadorArchivosLocal>();
builder.Services.AddHttpContextAccessor();

// HTTP Client para NVIDIA API
builder.Services.AddHttpClient<IClasificadorService, ClasificadorNvidiaService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddControllers();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (dbContext.Database.IsRelational())
    {
        dbContext.Database.Migrate();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("permitirTodo");
app.UseOutputCache();
app.UseAuthorization();
app.MapControllers();

app.Run();