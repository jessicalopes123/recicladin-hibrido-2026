# ReciclaDin 2026 — Web + Mobile responsivo

Frontend acadêmico em HTML, CSS e JavaScript modular, preparado para Supabase/PostgreSQL.

## Estrutura
- `index.html` — splash
- `pages/login.html` — login
- `pages/cadastro.html` — cadastro
- `pages/recuperar.html` — recuperação
- `pages/nova-senha.html` — nova senha
- `pages/app.html` — plataforma por perfil
- `admin/index.html`, `admin/admin.css`, `admin/admin.js` — painel administrativo independente
- `pages/privacidade.html` — política de privacidade
- `pages/termos.html` — termos de uso
- `css/style.css` — design responsivo
- `css/auth-theme.css` — tema Bento escuro das telas de autenticação
- `css/partner-dark-theme.css` — tema Bento escuro da área do parceiro
- `js/supabase.js` — configuração do Supabase
- `js/auth.js`, `cadastro.js`, `recovery.js`, `new-password.js`, `app.js`
- `sql/supabase.sql` — tabelas, trigger, dados iniciais e RLS
- `admin/assets/` — imagens usadas pelas telas de autenticação e pelo dashboard

Contas com o perfil `admin` são direcionadas para `admin/index.html`. O dashboard independente em Bento Grid acompanha coletas e pedidos, permite lançar pesagens com preço por kg e excluir registros operacionais. O monitor atualiza em tempo real quando a publicação Realtime está habilitada e usa sincronização periódica como contingência. A coluna `weighings.price_per_kg` é criada pela migration `supabase/migrations/20261024155000_repair_operational_tables.sql`; aplique-a no Supabase para registrar preços. A migration `supabase/migrations/20261102190000_fix_signup_profile_role.sql` corrige o gatilho de cadastro para salvar o perfil escolhido e reconcilia contas marcadas como comprador nos metadados. O painel também inclui cadastro e edição de materiais, listas separadas de compradores e parceiros, relatórios filtrados por data/perfil, gráfico e exportação PDF.

As telas de login, cadastro, acesso administrativo e recuperação de senha usam o tema Bento escuro com fundo preto, cartões em blocos, texto claro e destaques verde neon. O layout se adapta a computadores e celulares.

Os logins público e administrativo alternam fotografias locais de reciclagem com transições suaves e um HUD decorativo de caminhão de coleta com barra de carga. A animação respeita a preferência do dispositivo por movimento reduzido.

A área do parceiro usa tema Bento escuro próprio, com fundo preto, cartões e navegação em blocos, texto branco, ações em verde neon e layouts responsivos para telas grandes e celulares.

Na área do parceiro, o dashboard apresenta o saldo da Carteira Verde, um formulário para agendar reciclagem ou óleo usado, e as contribuições recentes; o histórico completo mostra data, material, peso e pontos de cada pesagem. O Supabase calcula 10 pontos por kg e atualiza a carteira por gatilho. Aplique `supabase/migrations/20261024155000_repair_operational_tables.sql` e `supabase/migrations/20261025210000_partner_scheduling_impact.sql`; em bancos que já receberam a primeira migration, aplique também `supabase/migrations/20261025200000_green_wallet_ten_points_per_kg.sql` para migrar os pontos já registrados à regra atual. Alertas dos agendamentos exigem configurar `RESEND_API_KEY`, `RECICLADIN_NOTIFICATION_EMAIL` e `RESEND_FROM_EMAIL` como secrets no Supabase e implantar `supabase/functions/notify-collection-request` (detalhes em `README_WEB.md`). O painel de impacto mostra equivalências ecológicas estimadas, pontos resgatados e valor de referência dos produtos retirados.

Na área logada do comprador, “Materiais disponíveis” lista somente materiais presentes em transações atribuídas à conta autenticada. O administrador registra cada transação vinculando comprador, material, quantidade, preço unitário e valor total em `orders`; comprador não cria nem altera registros. “Minhas compras” filtra esses lançamentos por ano, mês e semana, mostra um gráfico Chart.js por material e gera um PDF com os valores efetivamente salvos. A consulta confirma o usuário com `supabase.auth.getUser()` e filtra por `buyer_id`; os campos `created_by`, `price_per_kg` e `total_value` são mantidos para auditoria e histórico financeiro. Aplique, nesta ordem, as migrations `20261102200000_admin_only_buyer_transactions.sql`, `20261102210000_show_all_orders_assigned_to_buyer.sql`, `20261102230000_reconcile_buyer_orders_access.sql` e `20261102240000_remove_stale_order_points_trigger.sql` no Supabase. A última remove triggers obsoletos de `orders` que ainda tentam usar a coluna inexistente `balance_points`.

Na seção administrativa “Produtos e prêmios”, o formulário envia a imagem ao bucket público `produtos` e salva nome, descrição, custo em pontos e URL na tabela `benefits`. A tela “Resgatar Produtos” do parceiro chama o RPC `redeem_benefit`, que debita o saldo e registra o resgate em uma única transação. Aplique as migrations em ordem: `20261025190000_benefit_products_storage_redemption.sql`, `20261025210000_partner_scheduling_impact.sql`, `20261102160000_reconcile_green_wallet_balances.sql`, `20261102170000_sync_benefit_title_and_name.sql` e `20261102180000_repair_benefit_redemption.sql`. Se o cadastro falhar com `null value in column "title"`, aplique também `20261102220000_repair_benefit_title_sync.sql`. A migração mantém `title` e `name` sincronizados; não é necessário renomear tabelas ou colunas.

No painel administrativo, os nomes de compradores e parceiros abrem páginas individuais com filtros dinâmicos por ano, mês e semana, tabela de atividades e exportação PDF com jsPDF. Os filtros consultam intervalos de data no Supabase. Para compradores, os relatórios usam o preço unitário e o total guardados no próprio lançamento, sem recalcular pelo catálogo atual. No formulário de pesagem manual, escolha um material ativo; o valor financeiro é calculado em tempo real com o peso e o preço por kg.

## 1. Configurar Supabase
Abra `js/supabase.js` e mantenha a URL:
`https://cxwrraqccjurvshbqnog.supabase.co`

Cole a **Publishable key** do seu projeto em:
`SUPABASE_PUBLISHABLE_KEY`

Nunca coloque `service_role`/secret key no navegador.

## 2. Banco
No Supabase: SQL Editor → New query → cole todo o conteúdo de `sql/supabase.sql` → Run. O script também adiciona, sem apagar dados, as colunas de `profiles` usadas pelo cadastro e pelas preferências do perfil (`cpf`, `avatar_url`, `background_url`, canais de notificação e aceite dos termos). As políticas RLS restringem o perfil à própria conta.

Para habilitar ativação e desativação de contas existentes, execute `../supabase/migrations/20261103211800_partner_buyer_account_activation.sql` no SQL Editor do Supabase. A migração adiciona o status, bloqueia contas desativadas e permite ao administrador reativá-las.

## 3. Auth
Em Authentication, configure Email. Se quiser Google, configure o provider Google e as URLs de redirecionamento do projeto.

## 4. E-mail de confirmação e recuperação
Configure o SMTP/serviço de e-mail do projeto e adicione à Redirect URL Allow List do Supabase as URLs absolutas do domínio publicado que terminam em `/pages/nova-senha.html` e `/pages/app.html`. O link de redefinição usa o endereço atual do site; não cadastre um endereço local como `127.0.0.1`.

## 5. Abrir
Execute `npm run web:prepare` para gerar o bundle do app em `www/`. Sirva a pasta `www/` em hospedagem web; para Android/iOS, `npm run cap:sync` atualiza os arquivos nativos a partir dela. Não abra diretamente por `file://`.

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
