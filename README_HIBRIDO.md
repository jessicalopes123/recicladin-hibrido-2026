# ReciclaDin 2026 — Plataforma Híbrida Web + Mobile

## Stack
- HTML5
- CSS3 responsivo
- JavaScript ES Modules
- Supabase Auth
- PostgreSQL/Supabase
- RLS
- Capacitor 8

## Estrutura
- `www/`: frontend original
- `dist/`: cópia preparada para o Capacitor
- `scripts/prepare-web.mjs`: prepara o frontend
- `capacitor.config.ts`: configuração do app híbrido
- `sql/supabase.sql`: banco e políticas RLS

## Primeiro uso
1. Instale Node.js 22+.
2. No terminal, entre nesta pasta.
3. Execute `npm install`.
4. Confira `www/js/supabase.js` e coloque a Publishable Key do seu projeto Supabase.
5. Execute `npm run cap:sync`.
6. Para Android: `npx cap add android` e depois `npm run cap:android`.
7. Para iOS: `npx cap add ios` e depois `npm run cap:ios` (requer macOS/Xcode).

## Observação
A versão Web continua funcionando independentemente do Android/iOS. Capacitor cria o contêiner nativo e reutiliza o mesmo frontend.
