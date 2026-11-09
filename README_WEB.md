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
- `css/auth-theme.css` — tema Bento escuro para login, cadastro e recuperação de acesso
- `css/partner-dark-theme.css` — tema Bento escuro para a área do parceiro
- `js/supabase.js` — configuração do Supabase
- `js/auth.js`, `cadastro.js`, `recovery.js`, `new-password.js`, `app.js`
- `supabase.sql` — tabelas, trigger, dados iniciais e RLS
- `assets/cidade-limpa.svg` — fundo da autenticação

## 1. Configurar Supabase
Abra `js/supabase.js` e mantenha a URL:
`https://cxwrraqccjurvshbqnog.supabase.co`

As telas de login, cadastro, login administrativo e recuperação de senha usam o tema Bento escuro com detalhes verde neon, mantendo layouts adaptáveis a celulares e computadores.

Os logins público e administrativo alternam fotografias locais de reciclagem a cada sete segundos, com transição suave, ilustração HUD de caminhão de coleta e indicador de carga; a animação respeita a preferência por movimento reduzido do dispositivo.

Cole a **Publishable key** do seu projeto em:
`SUPABASE_PUBLISHABLE_KEY`

Nunca coloque `service_role`/secret key no navegador.

## 2. Banco
No Supabase: SQL Editor → New query → cole todo o conteúdo do arquivo `supabase.sql` (na raiz do projeto) → Run. Se o arquivo já foi executado antes, execute-o novamente após as atualizações para criar as colunas de pedidos e reaplicar as políticas RLS e permissões. Cadastre primeiro a conta administrativa pela tela de cadastro e, no SQL Editor, atribua o perfil pelo e-mail da conta: `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'seu-email@exemplo.com');`. A alteração de perfil não pode ser feita pelo navegador.

Se as tabelas operacionais foram recriadas e o app mostrar erros HTTP 400 em materiais, pesagens ou benefícios, execute também `supabase/migrations/20261024155000_repair_operational_tables.sql` no SQL Editor. Essa migração atualiza as tabelas operacionais e suas políticas sem alterar `profiles` nem Authentication. Para corrigir o cadastro que não preserva o perfil selecionado, execute `supabase/migrations/20261102190000_fix_signup_profile_role.sql`; ela ajusta o gatilho `handle_new_user` e corrige perfis existentes com metadados de comprador.

Se a solicitação de coleta for bloqueada por RLS, confira no Supabase se o perfil da conta está com `role = 'partner'` e execute novamente `supabase.sql`. A política de inserção permite apenas que um usuário autenticado crie solicitações para o próprio perfil de parceiro; ela não libera gravações para compradores nem administradores.

Para habilitar os lançamentos administrativos de compradores e os relatórios somente leitura da área do comprador, execute `supabase/migrations/20261102200000_admin_only_buyer_transactions.sql`, `supabase/migrations/20261102210000_show_all_orders_assigned_to_buyer.sql`, `supabase/migrations/20261102230000_reconcile_buyer_orders_access.sql` e `supabase/migrations/20261102240000_remove_stale_order_points_trigger.sql` no SQL Editor, nessa ordem, antes de publicar a aplicação. A migração 2300 remove políticas RLS antigas em `orders` e reaplica a regra: comprador consulta somente linhas em que `buyer_id = auth.uid()`, e somente administrador pode gravar. A migração 2400 remove triggers antigos de `orders` que ainda referenciem `balance_points`, coluna que não existe e não faz parte das transações de compradores.

Se o cadastro de produtos apresentar `null value in column "title" of relation "benefits"`, execute `supabase/migrations/20261102220000_repair_benefit_title_sync.sql` no SQL Editor. Ela garante que `title` e `name` sejam preenchidos com o mesmo nome do produto. Depois, publique a aplicação atualizada para invalidar o bundle antigo do painel administrativo.

Para habilitar ativação e desativação de contas existentes, execute `supabase/migrations/20261103211800_partner_buyer_account_activation.sql` no SQL Editor do Supabase. A migração adiciona o status, bloqueia contas desativadas e permite ao administrador reativá-las.

## 3. Auth
Em Authentication, configure Email. Se quiser Google, configure o provider Google e as URLs de redirecionamento do projeto.

## 4. E-mail de confirmação e recuperação
Configure o SMTP/serviço de e-mail do projeto e adicione à Redirect URL Allow List do Supabase as URLs absolutas do domínio publicado que terminam em `/pages/nova-senha.html` e `/pages/app.html`. O link de redefinição usa o endereço atual do site; não cadastre um endereço local como `127.0.0.1`.

## 5. E-mails de avaliação e alertas de coleta
A avaliação do aplicativo usa EmailJS. Solicitações de coleta, pedidos de material, catálogo, perfis e atualizações administrativas são gravados no Supabase e protegidos pelas políticas RLS; não dependem do EmailJS:
1. Crie uma conta no EmailJS, conecte o serviço de e-mail e crie um template.
2. No template, defina o destinatário como `recicladin01@gmail.com`, use `{{subject}}` no campo Assunto e `{{email}}` em Reply-To. Inclua `{{name}}`, `{{email}}`, `{{profile}}`, `{{event}}`, `{{rating}}`, `{{comment}}` e `{{time}}` no corpo. Para avaliação, `rating` recebe “N estrelas”.
3. Restrinja os domínios autorizados nas configurações do EmailJS.
4. Use o Service ID, o Template ID e a Public Key configurados em `www/js/rating-email.js`; o destinatário da mensagem deve ser configurado no próprio template EmailJS.

A Public Key do EmailJS foi feita para uso no cliente; nunca coloque chaves privadas no site. Enquanto os três identificadores não estiverem configurados, o formulário informa que o envio automático ainda não está pronto.

Os agendamentos do parceiro são gravados em `collections` ou `oil_collections` e o alerta administrativo é enviado pela Edge Function `supabase/functions/notify-collection-request/index.ts`, usando a API do Resend. Configure um domínio remetente verificado no Resend e os secrets no projeto Supabase; não coloque a chave privada no frontend:

```powershell
supabase secrets set RESEND_API_KEY=re_xxxxx RECICLADIN_NOTIFICATION_EMAIL=seu-email-oficial@exemplo.com RESEND_FROM_EMAIL="ReciclaDin <avisos@seu-dominio-verificado.com>" --project-ref SEU_PROJECT_REF
supabase functions deploy notify-collection-request --project-ref SEU_PROJECT_REF
```

O endpoint exige JWT válido, valida que o usuário é parceiro e só envia aviso para um registro pertencente ao próprio perfil. A solicitação permanece salva mesmo se o serviço de e-mail falhar; nesse caso, o painel informa que o alerta não foi enviado. O Supabase injeta a URL e a chave pública da API para a função. Aplique também `supabase/migrations/20261025210000_partner_scheduling_impact.sql` para os campos de agendamento do óleo, observações e valores históricos dos benefícios.

## 6. Abrir
Execute `npm run web:prepare` para gerar o bundle do app em `www/`. Sirva a pasta `www/` em hospedagem web; para Android/iOS, `npm run cap:sync` atualiza os arquivos nativos a partir dela. Não abra diretamente por `file://`.

## 7. Perfis
- `partner` = Parceiro
- `buyer` = Comprador
- `admin` = Administrativo

A área administrativa independente fica em `www/admin/` com HTML, CSS e JavaScript próprios. O login administrativo e as contas com `role = 'admin'` são encaminhados a essa área. O dashboard escuro em Bento Grid acompanha solicitações de coleta e pedidos, com atualização Realtime quando habilitada no Supabase e sincronização periódica como contingência. Administradores podem lançar pesagens vinculadas a parceiros, informar o preço por kg e consultar o total calculado; essas pesagens alimentam o gráfico acumulado. O formulário administrativo também registra transações vinculadas a compradores, preservando preço e valor total no momento do lançamento. A tabela operacional permite excluir registros de coletas, pedidos e pesagens. Para gravar o preço por kg, aplique a migration `supabase/migrations/20261024155000_repair_operational_tables.sql` no Supabase. O painel também oferece listas separadas de compradores e parceiros, relatórios com filtros por dia, mês, ano, comprador e parceiro, gráfico de atividade e exportação PDF. Administradores podem cadastrar, editar, ativar/desativar e excluir materiais; ao excluir, o vínculo do material é removido de pesagens e pedidos, preservando os dados históricos.

Compradores consultam materiais e transações lançados pelo administrador exclusivamente para sua conta, com filtros por período, gráfico e exportação PDF. Eles não criam nem alteram pedidos. Parceiros solicitam e acompanham coletas. Os status administrativos e os dados enviados pelos formulários ficam salvos no Supabase.

Na área do parceiro, a Carteira Verde mostra o saldo disponível, e pesagens confirmadas acumulam automaticamente 10 pontos por kg. O dashboard exibe contribuições recentes com data, material, peso e pontos; o histórico completo usa os mesmos registros de `weighings`. O formulário de coleta permite agendar reciclagem ou óleo usado, salva a data, o período (`manha` ou `tarde`) e as observações e chama a Edge Function de alerta descrita acima. Aplique `supabase/migrations/20261024155000_repair_operational_tables.sql` para habilitar o período e os gatilhos de cálculo/sincronização da carteira e, em bancos que já receberam essa migration, aplique também `supabase/migrations/20261025200000_green_wallet_ten_points_per_kg.sql` para adotar a regra atualizada de 10 pontos por kg. A migration `supabase/migrations/20261025210000_partner_scheduling_impact.sql` adiciona campos de agendamento de óleo e o valor monetário de referência dos benefícios.

O painel “Impacto ambiental e benefícios” calcula estimativas a partir de `weighings` e dos resgates em `benefit_redemptions`. Os fatores ecológicos exibidos são estimativas configuradas no frontend, não medições auditadas. O valor financeiro considera apenas benefícios com status de retirada/conclusão e valor de referência cadastrado; os resgates antigos podem não ter um valor histórico confiável.

O catálogo de prêmios fica na administração em `www/admin/`: cadastre nome, descrição, custo em pontos e foto. As fotos são enviadas ao bucket público `produtos`; `benefits.photo_url` guarda a URL pública. Parceiros veem os itens ativos em “Resgatar Produtos”. A migration `supabase/migrations/20261025190000_benefit_products_storage_redemption.sql` adiciona a coluna, configura o bucket e a política de upload administrativo, e instala `redeem_benefit`, que debita a carteira e cria o resgate atomicamente. Se o Supabase responder que `public.redeem_benefit(p_benefit_id)` não foi encontrado no schema cache, aplique também `supabase/migrations/20261102250000_restore_redeem_benefit_rpc.sql`; ela reinstala a função com a assinatura usada pelo app e solicita a atualização do cache do PostgREST. Use as colunas existentes `benefits.name`, `description`, `points_cost` e `benefit_redemptions.partner_id`; não crie colunas duplicadas em português. Aplique as migrations no Supabase antes de usar os módulos e execute `npm run web:prepare` para atualizar o bundle web.

Nas listas administrativas de compradores e parceiros, clique no nome para abrir o perfil individual. Os filtros de ano, mês e semana carregam apenas períodos disponíveis e consultam intervalos de `created_at` no Supabase. A tabela e o botão “Gerar Relatório PDF” usam os mesmos registros filtrados. Para compradores, os relatórios usam o preço unitário e o valor total armazenados no lançamento administrativo, sem estimar pelo preço atual do catálogo. O lançamento manual de pesagens escolhe materiais ativos do catálogo e exibe o total calculado em tempo real. As bibliotecas Chart.js e jsPDF e o complemento de tabelas são empacotados localmente com `npm run web:prepare`.

O papel deve ser controlado pelo banco/RLS. Em produção, não permita que um usuário comum altere seu próprio `role`.

## 8. Fases 1 e 2 incluídas
Fase 1: splash, acesso, cadastro, login, recuperação, senha no Supabase Auth, confirmação por e-mail e Google preparado.

Fase 2: Minha Conta, edição de perfil, preferências de notificações, segurança, suporte/FAQ, avaliação, acessibilidade, tema claro/escuro, exclusão de conta e páginas de privacidade/termos.

## Observação acadêmica
O projeto é uma base funcional de frontend + integração Supabase. Antes de uma publicação real, revise LGPD, políticas de exclusão, SMTP, OAuth, Storage e regras administrativas com o responsável pelo sistema.
