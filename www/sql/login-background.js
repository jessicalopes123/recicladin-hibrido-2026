const images = [
  {
    src: '../admin/assets/login-reciclagem-parque.png',
    caption: 'Separação de materiais recicláveis'
  },
  {
    src: '../admin/assets/login-reciclagem-personagem.png',
    caption: 'Reciclar hoje é um futuro melhor amanhã'
  },
  {
    src: '../admin/assets/login-cooperativa.png',
    caption: 'Cooperativa de reciclagem em atividade'
  }
];
const layers = document.querySelectorAll('.login-background img');
const photoCaption = document.querySelector('#login-photo-caption');

if (layers.length === 2 && photoCaption) {
  let currentLayer = 0;
  let currentImage = 0;
  photoCaption.textContent = images[currentImage].caption;

  const preloadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`Não foi possível carregar a imagem ${src}.`));
    image.src = src;
  });

  const rotateBackground = async () => {
    const nextImage = (currentImage + 1) % images.length;
    const nextLayer = 1 - currentLayer;

    try {
      const src = await preloadImage(images[nextImage].src);
      const layer = layers[nextLayer];
      layer.src = src;
      layer.classList.add('is-visible');
      layers[currentLayer].classList.remove('is-visible');
      currentLayer = nextLayer;
      currentImage = nextImage;
      photoCaption.textContent = images[currentImage].caption;
    } catch (error) {
      console.error(error);
    }
  };

  window.setInterval(rotateBackground, 7000);
}
