# ReciclaDin 2026 — Web + Mobile responsivo

Frontend acadêmico em HTML, CSS e JavaScript modular, preparado para Supabase/PostgreSQL.

## Estrutura
- `index.html` — splash
- `pages/login.html` — login
- `pages/cadastro.html` — cadastro
- `pages/recuperar.html` — recuperação
- `pages/nova-senha.html` — nova senha
- `pages/app.html` — plataforma por perfil
- `pages/privacidade.html` — política de privacidade
- `pages/termos.html` — termos de uso
- `css/style.css` — design responsivo
- `js/supabase.js` — configuração do Supabase
- `js/auth.js`, `cadastro.js`, `recovery.js`, `new-password.js`, `app.js`
- `sql/supabase.sql` — tabelas, trigger, dados iniciais e RLS
- `assets/cidade-limpa.svg` — fundo da autenticação

## 1. Configurar Supabase
Abra `js/supabase.js` e mantenha a URL:
`https://cxwrraqccjurvshbqnog.supabase.co`

Cole a **Publishable key** do seu projeto em:
`SUPABASE_PUBLISHABLE_KEY`

Nunca coloque `service_role`/secret key no navegador.

## 2. Banco
No Supabase: SQL Editor → New query → cole todo o conteúdo de `sql/supabase.sql` → Run.

## 3. Auth
Em Authentication, configure Email. Se quiser Google, configure o provider Google e as URLs de redirecionamento do projeto.

## 4. E-mail de confirmação e recuperação
Configure o SMTP/serviço de e-mail do projeto e as Redirect URLs para `pages/nova-senha.html` e `pages/app.html` no ambiente em que o sistema for publicado.

## 5. Abrir
Execute `npm run web:prepare` para gerar o bundle do app e copiar a versão web para `dist/`. Sirva `dist/` (recomendado para a versão preparada) ou `www/` usando um servidor local; não abra diretamente por `file://`.

## 6. Perfis
- `partner` = Parceiro
- `buyer` = Comprador
- `admin` = Administrativo

O papel deve ser controlado pelo banco/RLS. Em produção, não permita que um usuário comum altere seu próprio `role`.

## 7. Fases 1 e 2 incluídas
Fase 1: splash, acesso, cadastro, login, recuperação, senha no Supabase Auth, confirmação por e-mail e Google preparado.

Fase 2: Minha Conta, edição de perfil, preferências de notificações, segurança, suporte/FAQ, avaliação, acessibilidade, tema claro/escuro, exclusão de conta e páginas de privacidade/termos.

## Observação acadêmica
O projeto é uma base funcional de frontend + integração Supabase. Antes de uma publicação real, revise LGPD, políticas de exclusão, SMTP, OAuth, Storage e regras administrativas com o responsável pelo sistema.
