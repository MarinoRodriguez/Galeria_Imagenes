namespace GaleriaImagenes.Api.Models;

public sealed record MediaResponse(
    string Id,
    string Title,
    string Description,
    string FileName,
    string OriginalFileName,
    string ContentType,
    string MediaType,
    long Size,
    DateTimeOffset UploadedAt,
    string Url,
    string DownloadUrl);
