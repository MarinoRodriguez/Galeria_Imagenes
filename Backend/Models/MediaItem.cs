namespace GaleriaImagenes.Api.Models;

public sealed class MediaItem
{
    public required string Id { get; init; }
    public required string Title { get; set; }
    public string Description { get; set; } = "Sin descripción";
    public required string FileName { get; init; }
    public required string OriginalFileName { get; init; }
    public required string ContentType { get; init; }
    public required string MediaType { get; init; }
    public long Size { get; init; }
    public DateTimeOffset UploadedAt { get; init; } = DateTimeOffset.UtcNow;
}
