// Clase principal que maneja la lógica de la galería de imágenes
class ImageGalleryApp {
  constructor() {
    // Inicialización de elementos del DOM
    // Se crean contenedores para la galería y la información
    // Esto permite una estructura flexible y fácil de manipular
    this.appContainer = document.getElementById('app');
    this.galleryContainer = document.createElement('div');
    this.galleryContainer.id = 'gallery';
    this.infoContainer = document.createElement('div');
    this.infoContainer.id = 'info';
    this.appContainer.appendChild(this.galleryContainer);
    this.appContainer.appendChild(this.infoContainer);

    // Inicialización del servicio de almacenamiento
    // Se utiliza una clase separada para manejar el almacenamiento local
    // Esto mejora la modularidad y facilita cambios futuros en el método de almacenamiento
    this.storageService = new LocalStorageService();

    // Configuración de event listeners y mostrar la galería
    // Se separa la lógica de configuración de eventos y se muestra la galería inicialmente
    this.setupEventListeners();
    this.showGallery();
  }

  setupEventListeners() {
    // Event listeners para la navegación
    // Se manejan tanto la versión de escritorio como la móvil
    // Esto asegura una experiencia de usuario consistente en diferentes dispositivos
    document.getElementById('navGallery').addEventListener('click', () => this.showGallery());
    document.getElementById('navGalleryMobile').addEventListener('click', () => {
      this.showGallery();
      bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasMenu')).hide();
    });
    document.getElementById('navUpload').addEventListener('click', () => this.showUploadModal());
    document.getElementById('navUploadMobile').addEventListener('click', () => {
      this.showUploadModal();
      bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasMenu')).hide();
    });
    document.getElementById('navInfo').addEventListener('click', () => this.showInfo());
    document.getElementById('navInfoMobile').addEventListener('click', () => {
      this.showInfo();
      bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasMenu')).hide();
    });

    // Event listeners para el modal de subida de imágenes
    // Se manejan diferentes formas de seleccionar y subir imágenes
    // Esto proporciona flexibilidad al usuario en cómo interactúa con la aplicación
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const selectImageBtn = document.getElementById('selectImageBtn');
    const saveImageBtn = document.getElementById('saveImageBtn');

    // Manejo de eventos de arrastrar y soltar
    // Mejora la experiencia de usuario al permitir arrastrar archivos directamente
    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
      dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.classList.remove('dragover');
      this.handleImageSelect(e.dataTransfer.files[0]);
    });

    // Manejo de selección de archivo y guardado de imagen
    // Proporciona múltiples formas de seleccionar y guardar imágenes
    selectImageBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleImageSelect(e.target.files[0]));
    saveImageBtn.addEventListener('click', () => {
      this.validateAndSaveImage();
    });

    // Corregir el error de aria-hidden en los botones de cierre de modal
    // Mejora la accesibilidad de la aplicación
    const closeButtons = document.querySelectorAll('.btn-close[data-bs-dismiss="modal"]');
    closeButtons.forEach(button => {
      button.removeAttribute('aria-hidden');
    });
  }

  showUploadModal() {
    // Resetear el formulario y mostrar el área de arrastrar y soltar
    // Asegura que el modal esté en un estado limpio cada vez que se abre
    document.getElementById('imageDetailsForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('dropArea').style.display = 'block';
    document.getElementById('imageDetailsForm').style.display = 'none';
    document.getElementById('saveImageBtn').style.display = 'none';

    // Mostrar el modal
    const uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'));
    uploadModal.show();
  }

  handleImageSelect(file) {
    // Maneja la selección de imágenes, ya sea por arrastrar y soltar o selección de archivo
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        
        // Verificar si la imagen ya existe en la galería
        // Evita duplicados y mejora la integridad de los datos
        const existingImages = this.storageService.getAllImages();
        if (existingImages.some(img => img.data === imageData)) {
          Swal.fire({
            icon: 'error',
            title: 'Error, imagen duplicada',
            text: 'Esta imagen ya existe en la galería, intentalo con otra.',
            confirmButtonText: 'Entendido'
          }).then(() => {
            // Reiniciar el proceso de subida
            this.showUploadModal();
            // Eliminar el div con la clase "modal-backdrop"
            const modalBackdrop = document.querySelector('.modal-backdrop');
            if (modalBackdrop) {
              modalBackdrop.remove();
            }
          });
          // Limpiar el input de archivo para permitir seleccionar una imagen nuevamente
          document.getElementById('fileInput').value = '';
          return;
        }

        // Si la imagen no existe, proceder con los detalles
        // para mostrar un preview dela imagen seleccionada y el formulario de detalles
        document.getElementById('previewImage').src = imageData;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('dropArea').style.display = 'none';
        document.getElementById('imageDetailsForm').style.display = 'block';
        document.getElementById('saveImageBtn').style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    }
  }

  validateAndSaveImage() {
    // Valida que el título no esté vacío antes de guardar la imagen
    // Asegura que todas las imágenes tengan un título, mejorando la organización
    const title = document.getElementById('imageTitle').value.trim();
    if (!title) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El título de la imagen no puede estar vacío.',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    // Verificar si ya existe una imagen con el mismo título
    // Evita conflictos de nombres y mejora la organización
    const existingImages = this.storageService.getAllImages();
    if (existingImages.some(img => img.title.toLowerCase() === title.toLowerCase())) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ya existe una imagen con este título. Por favor, elige un título diferente.',
      });
      return;
    }

    this.saveImage();
  }

  async saveImage() {
    // Guarda la imagen en el almacenamiento local
    const title = document.getElementById('imageTitle').value.trim();
    const description = document.getElementById('imageDescription').value.trim() || "Sin descripción";
    const imageData = document.getElementById('previewImage').src;
    const date = new Date().toISOString();

    

    // Si todas las verificaciones pasan, guardar la imagen
    await this.storageService.saveImage(title, description, imageData, date);
    
    // Cerrar el modal de subida
    bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();

    // Mostrar notificación de éxito que se cierra automáticamente o con un botón
    // Proporciona retroalimentación inmediata al usuario sobre el éxito de la operación
    await Swal.fire({
      icon: 'success',
      title: '¡Éxito!',
      text: 'Imagen subida correctamente',
      timer: 2000,
      showConfirmButton: false
    });

    this.showGallery();
  }

  showGallery() {
    // Muestra la galería de imágenes
    // Oculta el contenedor de información y muestra el de la galería
    this.galleryContainer.style.display = 'block';
    this.infoContainer.style.display = 'none';
    const images = this.storageService.getAllImages();
    this.galleryContainer.innerHTML = `
      <h2 class="text-center my-4">Galería de Imágenes</h2>
      <div class="row" id="imageContainer"></div>
    `;
    const imageContainer = this.galleryContainer.querySelector('#imageContainer');
    if (images.length > 0) {
      images.forEach(image => {
        const imageElement = this.createImageElement(image);
        imageContainer.appendChild(imageElement);
      });
    }
  }

  createImageElement(image) {
    // Crea un elemento HTML para cada imagen en la galería
    // Hace uso de Bootstrap para un diseño responsivo y atractivo
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-md-4 col-lg-3 mb-4';
    col.innerHTML = `
      <div class="card">
        <img src="${image.data}" class="card-img-top" alt="${image.title}">
        <div class="card-body">
          <h5 class="card-title">${image.title}</h5>
        </div>
      </div>
    `;
    col.querySelector('.card').addEventListener('click', () => this.showImageDetail(image));
    return col;
  }

  showImageDetail(image) {
    // Muestra los detalles de una imagen en un modal
    // Permite ver la imagen en tamaño completo y sus detalles, titulo, descripcion y fecha de subida
    const modal = new bootstrap.Modal(document.getElementById('imageDetailModal'));
    document.getElementById('modalDetailImage').src = image.data;
    document.getElementById('modalImageTitle').textContent = image.title;
    document.getElementById('modalImageDescription').textContent = image.description;
    document.getElementById('modalImageDate').textContent = `Subida el: ${new Date(image.date).toLocaleString()}`;
    document.getElementById('modalDeleteButton').onclick = () => this.deleteImage(image.id);
    modal.show();
  }

  deleteImage(id) {
    // Maneja la eliminación de una imagen
    // Pide confirmación al usuario antes de eliminar para evitar eliminaciones accidentales
    Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esta acción",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteImage(id);
        this.showGallery();
        bootstrap.Modal.getInstance(document.getElementById('imageDetailModal')).hide();
        
        // Notificación de éxito al eliminar una imagen
        // Proporciona retroalimentación inmediata al usuario
        Swal.fire({
          icon: 'success',
          title: 'Eliminada',
          text: 'La imagen ha sido eliminada correctamente.',
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  }

  showInfo() {
    // Muestra información sobre la pagina
    // Oculta la galería y muestra el contenedor de información
    this.galleryContainer.style.display = 'none';
    this.infoContainer.style.display = 'block';
    this.infoContainer.innerHTML = `
      <h2 class="text-center my-4">Información de la Galería</h2>
      <div class="container">
        <p>Esta es una galería de imágenes interactiva que te permite:</p>
        <ul>
          <li>Ver una colección de imágenes subidas por los usuarios</li>
          <li>Subir tus propias imágenes</li>
          <li>Ver imágenes en detalle</li>
          <li>Eliminar imágenes individualmente</li>
        </ul>
        <p>Todas las imágenes se almacenan localmente en tu navegador utilizando localStorage.</p>
      </div>
    `;
  }
}

// Clase para manejar el almacenamiento local de imágenes
class LocalStorageService {
  constructor() {
    // Clave para almacenar las imágenes en localStorage
    this.storageKey = 'galleryImages';
  }

  getAllImages() {
    // Obtiene todas las imágenes almacenadas
    // Devuelve un array vacío si no hay imágenes almacenadas
    return JSON.parse(localStorage.getItem(this.storageKey)) || [];
  }

  saveImage(title, description, data, fecha) {
    // Guarda una nueva imagen en el almacenamiento local
    const images = this.getAllImages();
    const newImage = { 
      id: Date.now().toString(), // Usa la marca de tiempo como ID único
      title, 
      description: description || "Sin descripción",
      data, 
      fecha 
    };
    images.push(newImage);
    localStorage.setItem(this.storageKey, JSON.stringify(images));
  }

  deleteImage(id) {
    // Elimina una imagen del almacenamiento local por su ID
    let images = this.getAllImages();
    images = images.filter(img => img.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(images));
  }
}

// Espera a que el DOM esté completamente cargado antes de inicializar la aplicación
// Esto asegura que todos los elementos del DOM estén disponibles antes de manipularlos
document.addEventListener('DOMContentLoaded', () => {
  new ImageGalleryApp();
});
