# Como gerar o aplicativo Android no Windows

1. Instale Node.js 22+ e Android Studio.
2. Abra o terminal nesta pasta.
3. Rode:

```bash
npm install
npx cap add android
npm run cap:android
```

O Android Studio será aberto com o projeto `android/`.

Depois de alterar HTML/CSS/JS:

```bash
npm run cap:sync
```

Para gerar uma versão de distribuição:

```bash
npm run cap:build:android
```

## iOS

O projeto também está preparado para iOS, mas a criação/build do projeto iOS exige macOS + Xcode.

```bash
npx cap add ios
npm run cap:ios
```
