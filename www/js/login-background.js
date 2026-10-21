const images = [
  '../assets/cidade-limpa.png',
  '../assets/cidade-noturna.png',
  '../assets/skyline.png',
  '../assets/rua-cidade.png'
];
const layers = document.querySelectorAll('.login-background img');

if (layers.length === 2) {
  let currentLayer = 0;
  let currentImage = 0;

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
      const src = await preloadImage(images[nextImage]);
      const layer = layers[nextLayer];
      layer.src = src;
      layer.classList.add('is-visible');
      layers[currentLayer].classList.remove('is-visible');
      currentLayer = nextLayer;
      currentImage = nextImage;
    } catch (error) {
      console.error(error);
    }
  };

  window.setInterval(rotateBackground, 7000);
}
