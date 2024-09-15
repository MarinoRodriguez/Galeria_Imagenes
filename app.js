class ImageGalleryApp {
  constructor() {
    // Inicialización de elementos del DOM
    this.appContainer = document.getElementById('app');
    this.galleryContainer = document.createElement('div');
    this.galleryContainer.id = 'gallery';
    this.infoContainer = document.createElement('div');
    this.infoContainer.id = 'info';
    this.appContainer.appendChild(this.galleryContainer);
    this.appContainer.appendChild(this.infoContainer);

    // Inicialización del servicio de almacenamiento
    this.storageService = new LocalStorageService();

    // Configuración de event listeners y mostrar la galería
    this.setupEventListeners();
    this.showGallery();
  }

  setupEventListeners() {
    // Event listeners para la navegación
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
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const selectImageBtn = document.getElementById('selectImageBtn');
    const saveImageBtn = document.getElementById('saveImageBtn');

    // Manejo de eventos de arrastrar y soltar
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
    selectImageBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleImageSelect(e.target.files[0]));
    saveImageBtn.addEventListener('click', () => {
      this.saveImage();
      this.showGallery(); // Muestra la galería después de guardar la imagen
    });
  }

  handleImageSelect(file) {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        
        // Verificar si la imagen ya existe en la galería
        const existingImages = this.storageService.getAllImages();
        if (existingImages.some(img => img.data === imageData)) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Esta imagen ya existe en la galería.',
          });
          return;
        }

        // Si la imagen no existe, proceder con la carga
        document.getElementById('previewImage').src = imageData;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('dropArea').style.display = 'none';
        document.getElementById('imageDetailsForm').style.display = 'block';
        document.getElementById('saveImageBtn').style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    }
  }

  saveImage() {
    const title = document.getElementById('imageTitle').value.trim();
    const description = document.getElementById('imageDescription').value.trim() || "Sin descripción";
    const imageData = document.getElementById('previewImage').src;
    const date = new Date().toISOString();

    // Verificar si el título está vacío
    if (!title) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El título de la imagen no puede estar vacío.',
      });
      return;
    }

    // Verificar si ya existe una imagen con el mismo título
    const existingImages = this.storageService.getAllImages();
    if (existingImages.some(img => img.title.toLowerCase() === title.toLowerCase())) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ya existe una imagen con este título. Por favor, elige un título diferente.',
      });
      return;
    }

    // Si todas las verificaciones pasan, guardar la imagen
    this.storageService.saveImage(title, description, imageData, date);
    this.showGallery();
    bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
    
    // Mostrar notificación de éxito que se cierra automáticamente
    Swal.fire({
      icon: 'success',
      title: '¡Éxito!',
      text: 'Imagen subida correctamente',
      timer: 2000,
      showConfirmButton: false
    });
  }

  showGallery() {
    this.galleryContainer.style.display = 'block';
    this.infoContainer.style.display = 'none';
    const images = this.storageService.getAllImages();
    this.galleryContainer.innerHTML = `
      <h2 class="text-center my-4">Galería de Imágenes</h2>
      <div class="row" id="imageContainer"></div>
    `;
    const imageContainer = this.galleryContainer.querySelector('#imageContainer');
    if (images.length === 0) {
      imageContainer.innerHTML = `
        <div class="col-12 text-center">
          <p>No hay imágenes en la galería. ¡Sube algunas!</p>
        </div>
      `;
      // Notificación cuando la galería está vacía
      Swal.fire({
        icon: 'info',
        title: 'Galería vacía',
        text: 'No hay imágenes en la galería. ¡Sube algunas!',
        timer: 3000,
        showConfirmButton: false
      });
    } else {
      images.forEach(image => {
        const imageElement = this.createImageElement(image);
        imageContainer.appendChild(imageElement);
      });
    }
  }

  createImageElement(image) {
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
    const modal = new bootstrap.Modal(document.getElementById('imageDetailModal'));
    document.getElementById('modalDetailImage').src = image.data;
    document.getElementById('modalImageTitle').textContent = image.title;
    document.getElementById('modalImageDescription').textContent = image.description;
    document.getElementById('modalImageDate').textContent = `Subida el: ${new Date(image.date).toLocaleString()}`;
    document.getElementById('modalDeleteButton').onclick = () => this.deleteImage(image.id);
    modal.show();
  }

  deleteImage(id) {
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

class LocalStorageService {
  constructor() {
    this.storageKey = 'galleryImages';
  }

  getAllImages() {
    return JSON.parse(localStorage.getItem(this.storageKey)) || [];
  }

  saveImage(title, description, data, date) {
    const images = this.getAllImages();
    const newImage = { 
      id: Date.now().toString(), 
      title, 
      description: description || "Sin descripción",
      data, 
      date 
    };
    images.push(newImage);
    localStorage.setItem(this.storageKey, JSON.stringify(images));
  }

  deleteImage(id) {
    let images = this.getAllImages();
    images = images.filter(img => img.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(images));
  }
}

// Espera a que el DOM esté completamente cargado antes de inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  new ImageGalleryApp();
});
