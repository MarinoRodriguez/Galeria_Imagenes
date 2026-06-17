using GaleriaImagenes.Api.Models;
using GaleriaImagenes.Api.Storage;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("GalleryClient", policy => policy
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? ["http://localhost:5500", "http://127.0.0.1:5500"]));
});
builder.Services.AddSingleton<MediaStore>();
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 200 * 1024 * 1024;
});

var app = builder.Build();

var uploadsPath = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "uploads");
Directory.CreateDirectory(uploadsPath);

app.UseCors("GalleryClient");
app.UseStaticFiles();

var allowedPrefixes = new[] { "image/", "video/" };
var contentTypeProvider = new FileExtensionContentTypeProvider();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", service = "GaleriaImagenes.Api" }));

app.MapGet("/api/media", async (MediaStore store, HttpRequest request, CancellationToken cancellationToken) =>
{
    var items = await store.GetAllAsync(cancellationToken);
    return Results.Ok(items
        .OrderByDescending(item => item.UploadedAt)
        .Select(item => ToResponse(item, request)));
});

app.MapGet("/api/media/{id}", async (string id, MediaStore store, HttpRequest request, CancellationToken cancellationToken) =>
{
    var item = await store.GetByIdAsync(id, cancellationToken);
    return item is null ? Results.NotFound() : Results.Ok(ToResponse(item, request));
});

app.MapPost("/api/media", async (HttpRequest request, MediaStore store, CancellationToken cancellationToken) =>
{
    if (!request.HasFormContentType)
    {
        return Results.BadRequest(new { error = "La solicitud debe ser multipart/form-data." });
    }

    var form = await request.ReadFormAsync(cancellationToken);
    var file = form.Files.GetFile("file");
    var title = form["title"].ToString().Trim();
    var description = form["description"].ToString().Trim();

    if (file is null || file.Length == 0)
    {
        return Results.BadRequest(new { error = "Debe enviar un archivo en el campo 'file'." });
    }

    if (string.IsNullOrWhiteSpace(title))
    {
        return Results.BadRequest(new { error = "El título es obligatorio." });
    }

    if (!allowedPrefixes.Any(prefix => file.ContentType.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)))
    {
        return Results.BadRequest(new { error = "Solo se permiten imágenes o videos." });
    }

    var extension = Path.GetExtension(file.FileName);
    if (string.IsNullOrWhiteSpace(extension) || !contentTypeProvider.TryGetContentType("file" + extension, out var detectedContentType) || !allowedPrefixes.Any(prefix => detectedContentType.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)))
    {
        return Results.BadRequest(new { error = "La extensión del archivo no corresponde a una imagen o video permitido." });
    }

    var id = Guid.NewGuid().ToString("N");
    var safeExtension = extension.ToLowerInvariant();
    var storedFileName = $"{id}{safeExtension}";
    var filePath = Path.Combine(uploadsPath, storedFileName);

    await using (var stream = File.Create(filePath))
    {
        await file.CopyToAsync(stream, cancellationToken);
    }

    var item = new MediaItem
    {
        Id = id,
        Title = title,
        Description = string.IsNullOrWhiteSpace(description) ? "Sin descripción" : description,
        FileName = storedFileName,
        OriginalFileName = Path.GetFileName(file.FileName),
        ContentType = file.ContentType,
        MediaType = file.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase) ? "video" : "image",
        Size = file.Length,
        UploadedAt = DateTimeOffset.UtcNow
    };

    await store.AddAsync(item, cancellationToken);
    return Results.Created($"/api/media/{item.Id}", ToResponse(item, request));
});

app.MapGet("/api/media/{id}/download", async (string id, MediaStore store, CancellationToken cancellationToken) =>
{
    var item = await store.GetByIdAsync(id, cancellationToken);
    if (item is null)
    {
        return Results.NotFound();
    }

    var filePath = Path.Combine(uploadsPath, item.FileName);
    return File.Exists(filePath)
        ? Results.File(filePath, item.ContentType, item.OriginalFileName)
        : Results.NotFound(new { error = "El archivo físico no existe." });
});

app.MapDelete("/api/media/{id}", async (string id, MediaStore store, CancellationToken cancellationToken) =>
{
    var item = await store.DeleteAsync(id, cancellationToken);
    if (item is null)
    {
        return Results.NotFound();
    }

    var filePath = Path.Combine(uploadsPath, item.FileName);
    if (File.Exists(filePath))
    {
        File.Delete(filePath);
    }

    return Results.NoContent();
});

app.Run();

static MediaResponse ToResponse(MediaItem item, HttpRequest request)
{
    var baseUrl = $"{request.Scheme}://{request.Host}";
    return new MediaResponse(
        item.Id,
        item.Title,
        item.Description,
        item.FileName,
        item.OriginalFileName,
        item.ContentType,
        item.MediaType,
        item.Size,
        item.UploadedAt,
        $"{baseUrl}/uploads/{Uri.EscapeDataString(item.FileName)}",
        $"{baseUrl}/api/media/{Uri.EscapeDataString(item.Id)}/download");
}
