using System.Text.Json;
using GaleriaImagenes.Api.Models;

namespace GaleriaImagenes.Api.Storage;

public sealed class MediaStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly string _metadataPath;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public MediaStore(IWebHostEnvironment environment)
    {
        var dataPath = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataPath);
        _metadataPath = Path.Combine(dataPath, "media.json");
    }

    public async Task<IReadOnlyCollection<MediaItem>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            return await ReadUnsafeAsync(cancellationToken);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<MediaItem?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var items = await GetAllAsync(cancellationToken);
        return items.FirstOrDefault(item => item.Id == id);
    }

    public async Task AddAsync(MediaItem item, CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var items = await ReadUnsafeAsync(cancellationToken);
            items.Add(item);
            await WriteUnsafeAsync(items, cancellationToken);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<MediaItem?> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var items = await ReadUnsafeAsync(cancellationToken);
            var item = items.FirstOrDefault(media => media.Id == id);
            if (item is null)
            {
                return null;
            }

            items.Remove(item);
            await WriteUnsafeAsync(items, cancellationToken);
            return item;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task<List<MediaItem>> ReadUnsafeAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_metadataPath))
        {
            return [];
        }

        await using var stream = File.OpenRead(_metadataPath);
        return await JsonSerializer.DeserializeAsync<List<MediaItem>>(stream, JsonOptions, cancellationToken) ?? [];
    }

    private async Task WriteUnsafeAsync(List<MediaItem> items, CancellationToken cancellationToken)
    {
        await using var stream = File.Create(_metadataPath);
        await JsonSerializer.SerializeAsync(stream, items, JsonOptions, cancellationToken);
    }
}
