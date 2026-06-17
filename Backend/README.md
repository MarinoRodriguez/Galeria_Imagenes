# Backend API - Galería de Imágenes

API REST en ASP.NET Core para administrar imágenes y videos de la galería. Los archivos se guardan como contenido estático en `wwwroot/uploads` y los metadatos se guardan en `App_Data/media.json`.

## Requisitos

- .NET SDK 8.0 o superior.

## Ejecutar

```bash
cd Backend
dotnet run
```

La API queda disponible en `http://localhost:5000`.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Verifica que la API esté activa. |
| `GET` | `/api/media` | Lista imágenes y videos cargados. |
| `GET` | `/api/media/{id}` | Obtiene un elemento por id. |
| `POST` | `/api/media` | Carga un archivo `multipart/form-data` con `file`, `title` y `description`. |
| `GET` | `/api/media/{id}/download` | Descarga el archivo original. |
| `DELETE` | `/api/media/{id}` | Elimina metadatos y archivo físico. |

## Ejemplo de carga

```bash
curl -X POST http://localhost:5000/api/media \
  -F "file=@/ruta/archivo.jpg" \
  -F "title=Mi imagen" \
  -F "description=Descripción opcional"
```
