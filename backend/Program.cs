using System.Text;
using backend.Data;
using backend.Hubs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Render sets PORT; fall back to 5000 in dev
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Database — connection string via env var in production
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")!;

// Neon provides postgresql:// URIs; Npgsql needs the keyword format
if (connectionString.StartsWith("postgresql://") || connectionString.StartsWith("postgres://"))
    connectionString = ConvertPostgresUrl(connectionString);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Identity
builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT — key via env var in production
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
    // Allow JWT via SignalR query string
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var token = context.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                context.Token = token;
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();
builder.Services.AddSignalR();
builder.Services.AddScoped<TokenService>();
builder.Services.AddHttpClient<DeliveryService>();

// CORS — reads comma-separated origins from env var or config
var allowedOrigins = (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")
    ?? builder.Configuration["AllowedOrigins"]
    ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ClaudePizza API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "JWT Bearer token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            []
        }
    });
});

var app = builder.Build();

// Auto-migrate and seed on startup (works on Render cold starts)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { UserRoles.Admin, UserRoles.Customer })
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));
    }

    // Seed admin user
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
    const string adminEmail = "admin@pizzaria.com";
    if (await userManager.FindByEmailAsync(adminEmail) is null)
    {
        var admin = new AppUser { Name = "Admin", Email = adminEmail, UserName = adminEmail, Role = UserRoles.Admin };
        await userManager.CreateAsync(admin, "Admin@123");
        await userManager.AddToRoleAsync(admin, UserRoles.Admin);
    }

    // Seed flavors
    if (!db.Flavors.Any())
    {
        db.Flavors.AddRange(
            new Flavor { Name = "Margherita", Description = "Molho de tomate, mussarela e manjericão", BasePrice = 39.90m },
            new Flavor { Name = "Calabresa", Description = "Molho de tomate, mussarela e calabresa fatiada", BasePrice = 42.90m },
            new Flavor { Name = "Frango com Catupiry", Description = "Molho de tomate, frango desfiado e catupiry", BasePrice = 44.90m },
            new Flavor { Name = "Portuguesa", Description = "Molho de tomate, presunto, ovos, cebola e azeitona", BasePrice = 44.90m },
            new Flavor { Name = "Quatro Queijos", Description = "Mussarela, provolone, parmesão e catupiry", BasePrice = 46.90m },
            new Flavor { Name = "Pepperoni", Description = "Molho de tomate, mussarela e pepperoni", BasePrice = 47.90m }
        );
        await db.SaveChangesAsync();
    }

    // Seed products
    if (!db.Products.Any())
    {
        db.Products.AddRange(
            new Product { Name = "Coca-Cola 2L",         Description = "Refrigerante gelado",          Price = 12.00m, Category = "Bebidas" },
            new Product { Name = "Suco de Laranja 500ml",Description = "Suco natural",                 Price = 10.00m, Category = "Bebidas" },
            new Product { Name = "Água Mineral 500ml",   Description = "Sem gás",                      Price = 5.00m,  Category = "Bebidas" },
            new Product { Name = "Bordão de Alho",       Description = "Porção de pão de alho",        Price = 14.90m, Category = "Entradas" },
            new Product { Name = "Batata Frita",         Description = "Porção crocante com cheddar",  Price = 22.90m, Category = "Entradas" }
        );
        await db.SaveChangesAsync();
    }

    // Corrigir categorias antigas em singular → plural
    var wrongCat = db.Products.Where(p => p.Category == "Bebida" || p.Category == "Entrada").ToList();
    foreach (var p in wrongCat)
        p.Category = p.Category == "Bebida" ? "Bebidas" : "Entradas";
    if (wrongCat.Any()) await db.SaveChangesAsync();
}

// CORS deve ser o primeiro middleware para que os headers sejam enviados
// em TODAS as respostas, inclusive erros 4xx/5xx
app.UseCors("Frontend");

// Swagger available in all environments (portfolio project)
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "ClaudePizza API v1"));
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<OrderHub>("/hubs/orders");

app.Run();

// Converts postgresql://user:pass@host/db to Npgsql keyword connection string
static string ConvertPostgresUrl(string url)
{
    var uri = new Uri(url);
    var userInfo = uri.UserInfo.Split(':');
    var db = uri.AbsolutePath.TrimStart('/').Split('?')[0];
    var port = uri.Port == -1 ? 5432 : uri.Port;
    return $"Host={uri.Host};Port={port};Database={db};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}
