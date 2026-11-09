const isAdminLogin = document.body.classList.contains('admin-login-page');
const images = isAdminLogin
  ? [
      {
        src: '../admin/assets/login-cooperativa.png',
        caption: 'Triagem de materiais na cooperativa'
      },
      {
        src: '../admin/assets/login-cidade-futurista.png',
        caption: 'Reciclagem inteligente no futuro'
      },
      {
        src: '../admin/assets/login-reciclagem-parque.png',
        caption: 'Pontos de coleta seletiva na cidade'
      },
      {
        src: '../admin/assets/login-reciclagem-personagem.png',
        caption: 'Reciclagem inteligente em cada bairro'
      }
    ]
  : [
      {
        src: '../admin/assets/login-reciclagem-parque.png',
        caption: 'Pontos de coleta seletiva na cidade'
      },
      {
        src: '../admin/assets/login-cidade-futurista.png',
        caption: 'Reciclagem inteligente no futuro'
      },
      {
        src: '../admin/assets/login-reciclagem-personagem.png',
        caption: 'Reciclagem inteligente em cada bairro'
      },
      {
        src: '../admin/assets/login-cooperativa.png',
        caption: 'Triagem de materiais na cooperativa'
      }
    ];

const background = document.querySelector('.login-background');
const layers = background?.querySelectorAll('img');
const photoCaption = document.querySelector('#login-photo-caption');

if (background && layers?.length === 2) {
  let currentLayer = 0;
  let currentImage = 0;
  let isTransitioning = false;

  if (photoCaption) {
    photoCaption.textContent = images[currentImage].caption;
  }

  const preloadImage = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`Não foi possível carregar a imagem ${src}.`));
    image.src = src;
  });

  const rotateBackground = async () => {
    if (isTransitioning) return;
    isTransitioning = true;
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
      if (photoCaption) photoCaption.textContent = images[currentImage].caption;
    } catch (error) {
      console.error(error);
    } finally {
      isTransitioning = false;
    }
  };

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.setInterval(rotateBackground, 7000);
  }
}
