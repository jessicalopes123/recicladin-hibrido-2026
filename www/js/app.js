import { supabase, isSupabaseConfigured } from './supabase.js';
import { isRatingEmailConfigured, sendRatingEmail } from './rating-email.js';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';

const state={session:null,profile:null,role:'partner',walletBalance:null,buyerOrderHistory:[],buyerOrderChart:null,buyerCatalogChannel:null,buyerOrderPoll:null,adminReportData:null,adminReportRequestId:0,theme:localStorage.getItem('rd_theme')||'light',partnerActivityChannel:null,partnerActivityTimeout:null,partnerActivityPoll:null};
const SUPPORT_WHATSAPP_NUMBER='5511947630273';
const WIN_ANSI_SPECIALS={8364:128,8218:130,402:131,8222:132,8230:133,8224:134,8225:135,710:136,8240:137,352:138,8249:139,338:140,381:142,8216:145,8217:146,8220:147,8221:148,8226:149,8211:150,8212:151,732:152,8482:153,353:154,8250:155,339:156,382:158,376:159};
const $=s=>document.querySelector(s); const $$=s=>document.querySelectorAll(s);
function toast(msg,error=false){const t=$('#toast');t.textContent=msg;t.className='toast'+(error?' error':'');t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3500)}
function showAppTransitionError(message){
 const transition=$('#app-transition');
 transition.replaceChildren();
 const brand=document.createElement('div');
 brand.className='brand-mark';
 brand.setAttribute('aria-hidden','true');
 brand.textContent='♻';
 const detail=document.createElement('p');
 detail.textContent=message;
 const login=document.createElement('a');
 login.className='app-transition-login';
 login.href='login.html';
 login.textContent='Voltar para o login';
 transition.append(brand,detail,login);
}
function pdfTextHex(text){
 return Array.from(text,char=>{
  const code=char.codePointAt(0);
  const byte=code<=0x7e&&code>=0x20?code:code>=0xa0&&code<=0xff?code:WIN_ANSI_SPECIALS[code]||0x3f;
  return byte.toString(16).padStart(2,'0');
 }).join('').toUpperCase();
}
function wrapPdfText(text,maxChars){
 const words=text.trim().split(/\s+/);
 const lines=[];
 let line='';
 for(const word of words){
  if(!word)continue;
  const candidate=line?`${line} ${word}`:word;
  if(candidate.length>maxChars&&line){
   lines.push(line);
   line=word;
  }else line=candidate;
 }
 if(line)lines.push(line);
 return lines.length?lines:[''];
}
function createPdfDocument(elements){
 const records=[];
 elements.forEach(element=>{
  const heading=element.tagName==='H1'||element.tagName==='H2'||element.tagName==='H3';
  const fontSize=element.tagName==='H1'?18:heading?13:10;
  const maxChars=element.tagName==='H1'?52:heading?70:96;
  const text=element.textContent.replace(/\s+/g,' ').trim();
  if(!text)return;
  records.push({text:'',fontSize,spacing:heading?5:0});
  wrapPdfText(text,maxChars).forEach(line=>records.push({text:line,fontSize,bold:heading,spacing:0}));
  records.push({text:'',fontSize,spacing:heading?5:8});
 });
 const pages=[];
 let page=[];
 let y=790;
 records.forEach(record=>{
  if(record.text){
   if(y<55){pages.push(page);page=[];y=790}
   page.push(`BT /${record.bold?'F2':'F1'} ${record.fontSize} Tf 50 ${y} Td <${pdfTextHex(record.text)}> Tj ET`);
   y-=record.fontSize+5;
  }else y-=record.spacing;
 });
 if(page.length)pages.push(page);
 return createPdfFromStreams(pages.map(lines=>lines.join('\n')));
}
function createPdfFromStreams(streams){
 const objects=[null];
 const pageRefs=streams.map((_,index)=>5+index*2);
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objects[2]=`<< /Type /Pages /Kids [${pageRefs.map(id=>`${id} 0 R`).join(' ')}] /Count ${streams.length} >>`;
 objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
 streams.forEach((stream,index)=>{
  const pageId=pageRefs[index];
  const contentId=pageId+1;
  objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
  objects[contentId]=`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
 });
 let pdf='%PDF-1.4\n';
 const offsets=[0];
 for(let id=1;id<objects.length;id++){
  offsets[id]=pdf.length;
  pdf+=`${id} 0 obj\n${objects[id]}\nendobj\n`;
 }
 const xrefOffset=pdf.length;
 pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
 for(let id=1;id<objects.length;id++)pdf+=`${String(offsets[id]).padStart(10,'0')} 00000 n \n`;
 pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
 return new Blob([pdf],{type:'application/pdf'});
}
async function downloadLegalPdf(page,filename){
 try{
  const response=await fetch(new URL(page,location.href));
  if(!response.ok)throw new Error(`Não foi possível carregar o documento (${response.status}).`);
  const html=await response.text();
  const documentPage=new DOMParser().parseFromString(html,'text/html');
  const content=documentPage.querySelector('main .card');
  if(!content)throw new Error('O conteúdo do documento não foi encontrado.');
  const blob=createPdfDocument(Array.from(content.querySelectorAll('h1,h2,h3,p')));
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  toast(`Não foi possível baixar o PDF: ${message}`,true);
 }
}
function addLegalPdfButtons(){
 const card=Array.from($$('#section-support .card')).find(item=>item.querySelector('h3')?.textContent.trim()==='Privacidade, LGPD e termos');
 if(!card)return;
 const actions=document.createElement('div');
 actions.className='legal-downloads';
 [['privacidade.html','Baixar Política em PDF','politica-de-privacidade-recicladin.pdf'],['termos.html','Baixar Termos em PDF','termos-de-uso-recicladin.pdf']].forEach(([page,label,filename])=>{
  const button=document.createElement('button');
  button.type='button';
  button.className='btn btn-green';
  button.textContent=label;
  button.addEventListener('click',()=>downloadLegalPdf(page,filename));
  actions.append(button);
 });
 card.append(actions);
}
function roleName(r){return r==='buyer'?'Comprador':r==='admin'?'Administrativo':'Parceiro'}
function normalizeRole(role){
 const normalized=String(role||'').trim().toLocaleLowerCase('pt-BR');
 if(normalized==='buyer'||normalized==='comprador')return 'buyer';
 if(normalized==='admin'||normalized==='administrativo')return 'admin';
 if(normalized==='partner'||normalized==='parceiro')return 'partner';
 return null;
}
function initials(name='ReciclaDin'){return name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function formatPoints(value){return Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}
function collectionPeriodLabel(period){return period==='manha'?'Manhã':period==='tarde'?'Tarde':'Não informado'}
function collectionStatusLabel(status){
 const value=String(status||'solicitada').trim().toLocaleLowerCase('pt-BR');
 const labels={solicitada:'Solicitada',solicitado:'Solicitada',pendente:'Solicitada',confirmada:'Confirmada',confirmado:'Confirmada',em_andamento:'Em andamento',concluida:'Concluída',concluido:'Concluída',cancelada:'Cancelada',cancelado:'Cancelada'};
 return labels[value]||String(status||'Solicitada');
}
function safeHttpUrl(value){
 try{
  const url=new URL(value);
  return url.protocol==='https:'||url.protocol==='http:'?url.href:'';
 }catch{return ''}
}
function addProfileField(grid,id,labelText,type='text'){
 const field=document.createElement('div');
 if(id==='profile-cpf'||id==='profile-background-url')field.className='full';
 const label=document.createElement('label');
 label.className='label';
 label.htmlFor=id;
 label.textContent=labelText;
 const input=document.createElement('input');
 input.id=id;
 input.className='input';
 input.type=type;
 field.append(label,input);
 if(id==='profile-background-url'){
  const preview=document.createElement('div');
  preview.id='profile-background-preview';
  preview.className='profile-background-preview hidden';
  preview.setAttribute('aria-label','Pré-visualização da imagem de fundo');
  field.append(preview);
 }
 grid.append(field);
}
function addProfileControls(){
 const grid=$('#profile-form .form-grid');
 if(state.role==='partner'||state.role==='buyer'){
  $('#profile-email').setAttribute('aria-label','E-mail (somente leitura)');
  $('#profile-form').closest('.card').querySelector('.pill').textContent='E-mail somente leitura';
 }else{
  addProfileField(grid,'profile-cpf','CPF');
 }
 addProfileField(grid,'profile-avatar-url','URL da foto de perfil','url');
 addProfileField(grid,'profile-background-url','URL da imagem de fundo','url');
 const channelSelect=$('#notification-channel');
 const channelRow=channelSelect.closest('.settings-row');
 const frequencyRow=$('#notification-frequency').closest('.settings-row');
 const settingsContainer=channelRow.parentElement;
 const notificationPanel=document.createElement('div');
 notificationPanel.className='notification-panel';
 notificationPanel.setAttribute('aria-busy','true');
 notificationPanel.innerHTML='<h3>Notificações</h3><p class="muted">Escolha onde e quando quer receber os avisos.</p>';
 const notificationForm=document.createElement('form');
 notificationForm.id='notification-form';
 notificationForm.className='notification-form';
 const saveButton=document.createElement('button');
 saveButton.type='submit';
 saveButton.className='btn btn-green';
 saveButton.textContent='Salvar preferências';
 saveButton.disabled=true;
 const status=document.createElement('p');
 status.className='notification-status muted';
 status.setAttribute('aria-live','polite');
 notificationPanel.append(notificationForm);
 settingsContainer.insertBefore(notificationPanel,channelRow);
 notificationForm.append(channelRow,frequencyRow,status,saveButton);
 notificationForm.addEventListener('submit',event=>{
  event.preventDefault();
  saveNotificationPreferences();
 });
 const channels=document.createElement('div');
 channels.className='notification-channels';
 [['channel-email','E-mail'],['channel-whatsapp','WhatsApp']].forEach(([id,labelText])=>{
  const label=document.createElement('label');
  label.className='check';
  const checkbox=document.createElement('input');
  checkbox.id=id;
  checkbox.type='checkbox';
  label.append(checkbox,document.createTextNode(labelText));
  channels.append(label);
 });
 channelSelect.replaceWith(channels);
 const frequencySelect=$('#notification-frequency');
 frequencySelect.options[0].value='por_evento';
 frequencySelect.options[1].value='diario';
 frequencySelect.options[2].value='programado';
 frequencySelect.setAttribute('aria-label','Frequência das notificações');
 notificationForm.querySelectorAll('input,select').forEach(control=>control.disabled=true);
}
async function loadProfile(){
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError){showAppTransitionError(`Não foi possível iniciar a plataforma: ${userError.message}`);return}
 state.session=user; if(!user){location.href='login.html';return;}
 let {data:profile,error:profileError}=await supabase.from('profiles').select('id,full_name,cpf,avatar_url,background_url,channel_email,channel_whatsapp,notification_frequency,accepted_terms_at,role,is_active').eq('id',user.id).maybeSingle();
 if(profileError){showAppTransitionError(`Não foi possível carregar o perfil: ${profileError.message}`);return}
 if(profile?.is_active===false){
  const {error}=await supabase.auth.signOut();
  if(error){showAppTransitionError(`A conta está desativada e não foi possível encerrar a sessão: ${error.message}`);return}
  location.replace('login.html?account=inactive');
  return;
 }
 if(!profile){profile={id:user.id,full_name:user.user_metadata?.full_name||user.email?.split('@')[0]||'Usuário',role:normalizeRole(user.user_metadata?.role)||'partner',email:user.email};}
 const resolvedRole=normalizeRole(profile.role)||normalizeRole(user.user_metadata?.role)||'partner';
 if(resolvedRole==='admin'){location.replace('../admin/index.html');return}
 state.role=resolvedRole;
 state.profile={...profile,role:state.role};
 addProfileControls();
 $('#user-name').textContent=profile.full_name||'Usuário';$('#user-name-copy').textContent=(profile.full_name||'você').split(' ')[0];$('#user-role').textContent=roleName(state.role);$('#avatar').textContent=initials(profile.full_name);$('#profile-name').value=profile.full_name||'';$('#profile-email').value=user.email||'';if($('#profile-cpf'))$('#profile-cpf').value=profile.cpf||'';$('#profile-avatar-url').value=profile.avatar_url||'';$('#profile-background-url').value=profile.background_url||'';
 $('#dashboard-greeting-name').textContent=`Olá, ${(profile.full_name||'').trim().split(/\s+/)[0]||'bem-vindo(a)!'}`;
 $('#dashboard-greeting-subtitle').textContent=state.role==='partner'?'Sua parceria faz a diferença.':state.role==='buyer'?'Encontre materiais e acompanhe seus pedidos.':'Central administrativa ReciclaDin.';
 $('#channel-email').checked=profile.channel_email??true;
 $('#channel-whatsapp').checked=profile.channel_whatsapp??false;
 const legacyFrequencies={event:'por_evento',daily:'diario',scheduled:'programado'};
 const savedFrequency=legacyFrequencies[profile.notification_frequency]||profile.notification_frequency;
 $('#notification-frequency').value=['por_evento','diario','programado'].includes(savedFrequency)?savedFrequency:'por_evento';
 $('#notification-form').querySelectorAll('input,select,button').forEach(control=>control.disabled=false);
 $('#notification-form').closest('.notification-panel').setAttribute('aria-busy','false');
 $('#notification-form .notification-status').textContent='Preferências carregadas.';
 $('#account-status-label').textContent=profile.is_active===false?'Conta desativada':'Conta ativa';
 $('#account-status-note').textContent='Somente o administrador pode reativar uma conta desativada.';
 $('#toggle-account-active').textContent=profile.is_active===false?'Conta desativada':'Desativar conta';
 $('#toggle-account-active').disabled=profile.is_active===false;
 renderProfileImages(profile);
 renderRole(); await Promise.all([loadDashboard(),state.role==='partner'?loadWalletAndBenefits():Promise.resolve(),state.role==='admin'?loadAdminDashboardOverview():Promise.resolve()]);
 if(state.role==='partner')subscribePartnerActivity();
 if(state.role==='buyer')subscribeBuyerCatalog();
}
function schedulePartnerActivityRefresh(){
 clearTimeout(state.partnerActivityTimeout);
 state.partnerActivityTimeout=setTimeout(()=>Promise.all([
  loadDashboard(),
  loadWalletAndBenefits(),
  document.body.dataset.activeSection==='collections'?loadCollections():Promise.resolve(),
  document.body.dataset.activeSection==='weighings'?loadPartnerWeighings():Promise.resolve()
 ]),400);
}
function subscribePartnerActivity(){
 state.partnerActivityChannel=supabase.channel(`partner-activity-${state.profile.id}`)
  .on('postgres_changes',{event:'*',schema:'public',table:'weighings',filter:`partner_id=eq.${state.profile.id}`},schedulePartnerActivityRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'collections',filter:`partner_id=eq.${state.profile.id}`},schedulePartnerActivityRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'oil_collections',filter:`partner_id=eq.${state.profile.id}`},schedulePartnerActivityRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'benefit_redemptions',filter:`partner_id=eq.${state.profile.id}`},schedulePartnerActivityRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'green_wallet',filter:`partner_id=eq.${state.profile.id}`},schedulePartnerActivityRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'benefits'},schedulePartnerActivityRefresh)
  .subscribe();
 state.partnerActivityPoll=setInterval(()=>{
  if(!document.hidden)schedulePartnerActivityRefresh();
 },30000);
}
function subscribeBuyerCatalog(){
 state.buyerCatalogChannel=supabase.channel(`buyer-orders-${state.profile.id}`)
  .on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:`buyer_id=eq.${state.profile.id}`},()=>{
   if(state.role!=='buyer'||document.hidden)return;
   loadDashboard();
   if(document.body.dataset.activeSection==='materials')loadMaterials();
   if(document.body.dataset.activeSection==='collections')loadBuyerOrders();
  })
  .subscribe();
 state.buyerOrderPoll=setInterval(()=>{
  if(state.role!=='buyer'||document.hidden)return;
  loadDashboard();
  if(document.body.dataset.activeSection==='materials')loadMaterials();
  if(document.body.dataset.activeSection==='collections')loadBuyerOrders();
 },30000);
}
async function renderProfileImages(profile){
 const preview=$('#profile-avatar-preview');
 const headerAvatar=$('#avatar');
 const avatarUrl=safeHttpUrl(profile.avatar_url||'');
 if(avatarUrl){
  [preview,headerAvatar].forEach(element=>element.style.background=`url("${avatarUrl}") center/cover`);
 }else{
  [preview,headerAvatar].forEach(element=>element.style.background='');
 }
 const backgroundUrl=safeHttpUrl(profile.background_url||'');
 document.documentElement.style.setProperty('--profile-background-image',backgroundUrl?`url("${backgroundUrl}")`:'none');
 const backgroundPreview=$('#profile-background-preview');
 if(backgroundUrl){
  backgroundPreview.style.backgroundImage=`url("${backgroundUrl}")`;
  backgroundPreview.classList.remove('hidden');
 }else{
  backgroundPreview.style.backgroundImage='';
  backgroundPreview.classList.add('hidden');
 }
}
function renderRole(){
 document.body.dataset.role=state.role;
 $$('.role-label').forEach(e=>e.textContent=roleName(state.role));
 configureBuyerOrders();
 renderRoleDashboard();
 $('#open-oil').hidden=state.role!=='partner';
 $('#oil-admin-records').hidden=state.role!=='admin';
 $('.partner-dashboard-metrics').hidden=state.role==='admin';
 $('#metric-points-card').hidden=state.role==='buyer';
 $('#metric-wallet-card').hidden=state.role==='buyer';
 ['#section-points','#section-benefits','#section-impact'].forEach(selector=>{$(selector).hidden=state.role!=='partner'});
 const canRequestCollection=state.role==='partner';
 ['#new-collection','#open-collection'].forEach(selector=>{
  const button=$(selector);
  if(button)button.hidden=!canRequestCollection;
 });
 const nav=$('#nav');nav.innerHTML='';
 const partner=[['dashboard','⌂','Visão geral'],['materials','♻','Materiais recicláveis'],['collections','🚛','Solicitação de coleta'],['weighings','⚖','Pesagens'],['points','🏆','Carteira Verde'],['benefits','🎁','Pontos e benefícios'],['impact','🌱','Impacto ambiental'],['history','📊','Histórico'],['account','●','Minha conta'],['support','?','Ajuda e suporte']];
 const buyer=[['dashboard','⌂','Visão geral'],['materials','♻','Materiais disponíveis'],['collections','🛒','Minhas compras'],['history','☷','Histórico'],['account','●','Minha conta'],['support','?','Ajuda e suporte']];
 const admin=[['dashboard','⌂','Dashboard'],['partners','◉','Pessoas'],['orders','▤','Pedidos'],['materials','♻','Materiais'],['collections','🚛','Coletas'],['weighings','⚖','Pesagens'],['oil','🛢','Óleo'],['reports','▥','Relatórios'],['account','●','Minha conta'],['support','?','Ajuda e suporte']];
 (state.role==='buyer'?buyer:state.role==='admin'?admin:partner).forEach(([id,icon,label])=>{const b=document.createElement('button');b.className='nav-item';b.dataset.section=id;b.innerHTML=`<b>${icon}</b><span>${label}</span>`;b.onclick=()=>showSection(id);nav.appendChild(b)});
 const mobileSections=state.role==='admin'?[['dashboard','⌂','Início'],['partners','◉','Pessoas'],['orders','▤','Pedidos'],['collections','🚛','Coletas'],['account','●','Conta'],['support','?','Ajuda']]:state.role==='buyer'?[['dashboard','⌂','Início'],['materials','♻','Materiais'],['collections','🛒','Compras'],['history','☷','Histórico'],['account','●','Conta'],['support','?','Ajuda']]:[['dashboard','⌂','Visão geral'],['materials','♻','Materiais recicláveis'],['collections','🚛','Solicitação de coleta'],['weighings','⚖','Pesagens'],['points','🏆','Carteira Verde'],['benefits','🎁','Pontos e benefícios'],['impact','🌱','Impacto ambiental'],['history','📊','Histórico'],['account','●','Minha conta'],['support','?','Ajuda']];
 $('#mobile-nav').innerHTML='';mobileSections.forEach(([id,icon,label])=>{const b=document.createElement('button');b.dataset.section=id;b.setAttribute('aria-label',label);b.innerHTML=`<b>${icon}</b><span>${label}</span>`;b.onclick=()=>showSection(id);$('#mobile-nav').appendChild(b)});
 $$('.partner-dashboard-only').forEach(element=>element.classList.toggle('partner-dashboard-hidden',state.role!=='partner'));
 $$('#section-dashboard [data-open-section]').forEach(button=>{button.onclick=()=>showSection(button.dataset.openSection)});
 showSection('dashboard');
 document.body.dataset.appReady='true';
 $('#app-transition').hidden=true;
}
function renderRoleDashboard(){
 const panel=$('#role-dashboard-panel');
 panel.hidden=state.role==='partner';
 if(state.role==='admin'){
  panel.innerHTML='<div class="admin-welcome"><div><span class="partner-section-kicker">PAINEL DE CONTROLE · ADMINISTRATIVO</span><h2>Operação ReciclaDin</h2><p>Acompanhe pessoas, materiais e atividade em um só lugar. Os indicadores são atualizados com os dados do Supabase.</p><button type="button" class="btn btn-green" data-open-section="reports">Ver relatórios e gráficos</button></div><span class="admin-welcome-icon" aria-hidden="true">♻</span></div><section class="admin-overview" aria-label="Indicadores da operação"><div class="admin-overview-heading"><div><span class="partner-section-kicker">RESUMO DA OPERAÇÃO</span><h2>Indicadores gerais</h2></div><span class="pill">Atualizado ao entrar</span></div><div class="admin-overview-grid"><article class="admin-overview-card"><span>Parceiros</span><strong id="admin-overview-partners">—</strong><small>Contas cadastradas</small></article><article class="admin-overview-card"><span>Compradores</span><strong id="admin-overview-buyers">—</strong><small>Contas cadastradas</small></article><article class="admin-overview-card"><span>Pedidos</span><strong id="admin-overview-orders">—</strong><small>Solicitações de materiais</small></article><article class="admin-overview-card"><span>Coletas</span><strong id="admin-overview-collections">—</strong><small>Solicitações recebidas</small></article><article class="admin-overview-card"><span>Materiais pesados</span><strong id="admin-overview-weight">—</strong><small>Volume registrado em kg</small></article><article class="admin-overview-card"><span>Óleo coletado</span><strong id="admin-overview-oil">—</strong><small>Volume registrado em litros</small></article></div></section><div class="admin-quick-heading"><div><span class="partner-section-kicker">GESTÃO</span><h2>Acessos administrativos</h2></div><button type="button" class="btn btn-ghost" data-open-section="materials">Cadastrar material</button></div><div class="admin-quick-links admin-area-links"><article class="admin-area-card"><span class="admin-area-icon" aria-hidden="true">◉</span><h3>Parceiros</h3><p>Consulte parceiros e acompanhe coletas e pesagens.</p><button type="button" class="admin-area-action" data-open-section="partners">Abrir parceiros <span aria-hidden="true">→</span></button></article><article class="admin-area-card"><span class="admin-area-icon" aria-hidden="true">🛒</span><h3>Compradores</h3><p>Consulte compradores e os pedidos registrados.</p><button type="button" class="admin-area-action" data-open-section="partners">Abrir compradores <span aria-hidden="true">→</span></button></article><article class="admin-area-card"><span class="admin-area-icon" aria-hidden="true">♻</span><h3>Materiais</h3><p>Cadastre, edite, ative ou exclua materiais do catálogo.</p><button type="button" class="admin-area-action" data-open-section="materials">Gerenciar materiais <span aria-hidden="true">→</span></button></article><article class="admin-area-card"><span class="admin-area-icon" aria-hidden="true">▤</span><h3>Pedidos</h3><p>Revise pedidos dos compradores e atualize o status.</p><button type="button" class="admin-area-action" data-open-section="orders">Abrir pedidos <span aria-hidden="true">→</span></button></article><article class="admin-area-card"><span class="admin-area-icon" aria-hidden="true">🚛</span><h3>Coletas e pesagens</h3><p>Consulte as solicitações e registros operacionais.</p><div class="admin-area-actions"><button type="button" class="admin-area-action" data-open-section="collections">Coletas <span aria-hidden="true">→</span></button><button type="button" class="admin-area-action" data-open-section="weighings">Pesagens <span aria-hidden="true">→</span></button></div></article><article class="admin-area-card"><span class="admin-area-icon" aria-hidden="true">🛢</span><h3>Controle de óleo</h3><p>Acompanhe os registros de óleo usado.</p><button type="button" class="admin-area-action" data-open-section="oil">Abrir controle de óleo <span aria-hidden="true">→</span></button></article><article class="admin-area-card"><span class="admin-area-icon" aria-hidden="true">▥</span><h3>Relatórios e gráficos</h3><p>Filtre por dia, mês, ano, comprador e parceiro; exporte PDF ou CSV.</p><button type="button" class="admin-area-action" data-open-section="reports">Abrir relatórios <span aria-hidden="true">→</span></button></article></div>';
 }else if(state.role==='buyer'){
  panel.innerHTML='<div class="admin-welcome buyer-welcome"><div><span class="partner-section-kicker">ÁREA DO COMPRADOR</span><h2>Acompanhe seus materiais e transações.</h2><p>Consulte somente materiais e lançamentos registrados para sua conta pelo administrador.</p><div class="admin-area-actions"><button type="button" class="btn btn-green" data-open-section="materials">Ver materiais lançados</button><button type="button" class="btn btn-ghost" data-open-section="collections">Ver transações e relatórios</button></div></div><span class="admin-welcome-icon" aria-hidden="true">🛒</span></div>';
 }
 panel.querySelectorAll('[data-open-section]').forEach(button=>button.addEventListener('click',()=>showSection(button.dataset.openSection)));
}
function configureBuyerOrders(){
 const section=$('#section-collections');
 const heading=section.querySelector('.welcome h1');
 const description=section.querySelector('.welcome p');
 const tableCard=$('#collection-history-card');
 let orderCard=$('#buyer-order-card');
 if(!orderCard){
  orderCard=document.createElement('div');
  orderCard.id='buyer-order-card';
  orderCard.className='buyer-order-card';
  orderCard.hidden=true;
  orderCard.innerHTML='<div class="buyer-report-panel"><div class="buyer-report-heading"><div><span class="buyer-report-kicker">RELATÓRIO DO COMPRADOR</span><h2>Lançamentos registrados pelo administrador</h2><p>Visualize somente transações atribuídas à sua conta.</p></div><button type="button" id="buyer-export-pdf" class="btn btn-green buyer-report-export">Gerar relatório PDF</button></div><div class="buyer-report-filters"><div><label class="label" for="buyer-filter-year">Ano</label><select class="input" id="buyer-filter-year"><option value="">Todos os anos</option></select></div><div><label class="label" for="buyer-filter-month">Mês</label><select class="input" id="buyer-filter-month" disabled><option value="">Todos os meses</option></select></div><div><label class="label" for="buyer-filter-week">Semana</label><select class="input" id="buyer-filter-week" disabled><option value="">Todas as semanas</option></select></div></div><div class="buyer-report-metrics"><article><span>Quantidade registrada</span><strong id="buyer-filtered-weight">0 kg</strong></article><article><span>Valor lançado pelo administrador</span><strong id="buyer-filtered-total">—</strong></article></div><p class="buyer-report-note" id="buyer-report-note">Os valores exibidos são os registrados pelo administrador. Lançamentos antigos sem valor salvo aparecem como não informado.</p><section class="buyer-order-chart" aria-labelledby="buyer-order-chart-title"><div class="buyer-order-chart-heading"><h3 id="buyer-order-chart-title">Quantidade por material</h3><span id="buyer-order-chart-period">Todo o período</span></div><div class="buyer-order-chart-canvas"><canvas id="buyer-order-chart-bars" role="img" aria-label="Gráfico dos quilos registrados por material"></canvas></div></section><div class="card-head buyer-orders-heading"><h3>Transações registradas</h3><span class="pill" id="buyer-filtered-count">0 registros</span></div><div class="table-wrap buyer-orders-table-wrap"><table class="table buyer-orders-table"><thead><tr><th>Data</th><th>Material</th><th>Quantidade (kg)</th><th>Preço unitário lançado</th><th>Valor lançado</th><th>Status</th></tr></thead><tbody id="buyer-orders-body"></tbody></table></div></div>';
  section.insertBefore(orderCard,tableCard);
  ['#buyer-filter-year', '#buyer-filter-month', '#buyer-filter-week'].forEach(selector => {
   $(selector).addEventListener('change', event => {
    if (event.currentTarget.id !== 'buyer-filter-week') updateBuyerOrderFilterOptions();
    renderBuyerOrders();
   });
  });
  $('#buyer-export-pdf').addEventListener('click',exportBuyerOrdersPdf);
 }
 const isBuyer=state.role==='buyer';
 heading.textContent=isBuyer?'Minhas compras':'Solicitação de coleta';
 description.textContent=isBuyer?'Consulte as transações registradas pelo administrador para sua conta.':'Solicite uma retirada pelo formulário e acompanhe o andamento.';
 tableCard.hidden=isBuyer;
 orderCard.hidden=!isBuyer;
 $('#material-admin-form').hidden=state.role!=='admin';
 $('#material-form').onsubmit=saveMaterial;
}
function showSection(id){if(state.role==='buyer'&&['points','benefits','impact'].includes(id))id='dashboard';$$('.section').forEach(s=>s.classList.toggle('active',s.id==='section-'+id));$$('[data-section]').forEach(b=>{const active=b.dataset.section===id;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});document.body.dataset.activeSection=id;$('#dashboard-greeting').hidden=id!=='dashboard';$('#page-title').textContent=document.querySelector(`[data-section="${id}"] span`)?.textContent||'ReciclaDin';window.scrollTo({top:0,behavior:'smooth'});if(id==='history')loadHistory();if(id==='weighings')loadPartnerWeighings();if(id==='materials')loadMaterials();if(id==='reports')loadReports();if(id==='partners'&&state.role==='admin')loadPartners();if(id==='orders'&&state.role==='admin')loadAdminOrders();if(id==='oil'&&state.role==='admin')loadOilRecords();if(id==='collections'){if(state.role==='buyer')loadBuyerOrders();else loadCollections()}if((id==='points'||id==='benefits')&&state.role==='partner')loadWalletAndBenefits();if(id==='impact'&&state.role==='partner')loadPartnerImpact();}
function openCollectionRequest(){
 if(state.role!=='partner')return;
 showSection('collections');
 window.setTimeout(()=>{
  $('#partner-schedule-form').scrollIntoView({behavior:'smooth',block:'start'});
  $('#partner-collection-type').focus({preventScroll:true});
 },120);
}
async function loadDashboard(){
 let totalKg=0,totalPoints=0,collections=0;
 let weighingsError=null,collectionsError=null;
 const recentBody=$('#dashboard-collections-body');
 const materialsBody=$('#dashboard-materials-body');
 if(state.role==='partner'){
  const [weighingsResult,contributionsResult,collectionsResult,recentResult,materialsResult]=await Promise.all([
   supabase.from('weighings').select('total_kg,points').eq('partner_id',state.profile.id),
   supabase.from('weighings').select('created_at,material_name,total_kg,points').eq('partner_id',state.profile.id).order('created_at',{ascending:false}).limit(5),
   supabase.from('collections').select('id',{count:'exact',head:true}).eq('partner_id',state.profile.id),
   supabase.from('collections').select('type,requested_date,status').eq('partner_id',state.profile.id).order('requested_date',{ascending:false}).limit(5),
   supabase.from('materials').select('name,unit,reference_price').eq('active',true).order('name').limit(4)
  ]);
  weighingsError=weighingsResult.error;
  collectionsError=collectionsResult.error;
  if(weighingsError)toast(`Não foi possível carregar as pesagens: ${weighingsError.message}`,true);
  else (weighingsResult.data||[]).forEach(x=>{totalKg+=Number(x.total_kg||0);totalPoints+=Number(x.points||0)});
  $('#weighing-total').textContent=weighingsError?'—':`${totalKg.toLocaleString('pt-BR',{maximumFractionDigits:3})} kg`;
  $('#weighing-points').textContent=weighingsError?'—':formatPoints(totalPoints);
  if(collectionsError)toast(`Não foi possível carregar a contagem de coletas: ${collectionsError.message}`,true);
  else collections=collectionsResult.count||0;
  recentBody.innerHTML=recentResult.error
   ?`<tr><td colspan="3">${escapeHtml(recentResult.error.message)}</td></tr>`
   :(recentResult.data||[]).map(item=>`<tr><td>${item.requested_date?new Date(`${item.requested_date}T00:00:00`).toLocaleDateString('pt-BR'):'—'}</td><td>${escapeHtml(item.type)}</td><td><span class="pill">${escapeHtml(collectionStatusLabel(item.status))}</span></td></tr>`).join('')
    ||'<tr><td colspan="3">Nenhuma coleta registrada ainda.</td></tr>';
  $('#dashboard-contributions-body').innerHTML=contributionsResult.error
   ?`<tr><td colspan="4">${escapeHtml(contributionsResult.error.message)}</td></tr>`
   :(contributionsResult.data||[]).map(item=>`<tr><td>${new Date(item.created_at).toLocaleDateString('pt-BR')}</td><td>${escapeHtml(item.material_name||'Material reciclável')}</td><td>${Number(item.total_kg||0).toLocaleString('pt-BR',{maximumFractionDigits:3})} kg</td><td><strong class="partner-earned-points">+${formatPoints(item.points)} pts</strong></td></tr>`).join('')
    ||'<tr><td colspan="4">As contribuições e os pontos aparecem após a pesagem do administrador.</td></tr>';
  if(contributionsResult.error)toast(`Não foi possível carregar as contribuições: ${contributionsResult.error.message}`,true);
  materialsBody.innerHTML=materialsResult.error
   ?`<tr><td colspan="3">${escapeHtml(materialsResult.error.message)}</td></tr>`
   :(materialsResult.data||[]).map(item=>`<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.unit)}</td><td>R$ ${Number(item.reference_price||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`).join('')
    ||'<tr><td colspan="3">Nenhum material disponível.</td></tr>';
 } else if(state.role==='admin'){const w=await supabase.from('weighings').select('total_kg,points');const c=await supabase.from('collections').select('id',{count:'exact',head:true});weighingsError=w.error;collectionsError=c.error;if(weighingsError)toast(`Não foi possível carregar as pesagens: ${weighingsError.message}`,true);else(w.data||[]).forEach(x=>{totalKg+=Number(x.total_kg||0);totalPoints+=Number(x.points||0)});if(collectionsError)toast(`Não foi possível carregar a contagem de coletas: ${collectionsError.message}`,true);else collections=c.count||0;
 } else {
  try{
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(userError)throw userError;
   if(!user||user.id!==state.profile.id)throw new Error('Não foi possível confirmar a conta do comprador. Entre novamente.');
   const orders=await fetchAllRows(()=>supabase.from('orders').select('quantity_kg')
    .eq('buyer_id',user.id));
   collections=orders.length;
   totalKg=orders.reduce((sum,order)=>sum+Number(order.quantity_kg||0),0);
  }catch(error){
   collectionsError=error;
   toast(`Não foi possível carregar os lançamentos: ${error.message||error}`,true);
  }
 }
 const volumeError=state.role==='buyer'?collectionsError:weighingsError;
 $('#metric-kg-label').textContent=state.role==='buyer'?'Quantidade registrada':'Materiais pesados';
 $('#metric-collections-label').textContent=state.role==='buyer'?'Lançamentos do administrador':'Coletas realizadas';
 $('#metric-points-label').textContent=state.role==='buyer'?'Pontos não aplicáveis':'Pontos gerados';
 $('#metric-kg').textContent=volumeError?'—':totalKg.toFixed(1)+' kg';$('#metric-points').textContent=weighingsError?'—':Math.round(totalPoints).toLocaleString('pt-BR');$('#metric-collections').textContent=collectionsError?'—':collections;
 if(state.role==='buyer')$('#metric-points').textContent='—';
}
async function loadPartnerWeighings(){
 const body=$('#partner-weighings-body');
 if(state.role!=='partner'){
  body.innerHTML='<tr><td colspan="4">O histórico de pesagens está disponível para parceiros.</td></tr>';
  return;
 }
 body.innerHTML='<tr><td colspan="4">Carregando pesagens...</td></tr>';
 try{
  const weighings=await fetchAllRows(()=>supabase.from('weighings')
   .select('id,created_at,material_name,total_kg,points')
   .eq('partner_id',state.profile.id)
   .order('created_at',{ascending:false})
   .order('id',{ascending:false}));
  body.innerHTML=weighings.map(item=>`<tr>
   <td>${item.created_at?new Date(item.created_at).toLocaleDateString('pt-BR'):'—'}</td>
   <td>${escapeHtml(item.material_name||'Material reciclável')}</td>
   <td>${Number(item.total_kg||0).toLocaleString('pt-BR',{maximumFractionDigits:3})} kg</td>
   <td><strong class="partner-earned-points">+${formatPoints(item.points)} pts</strong></td>
  </tr>`).join('')||'<tr><td colspan="4">Nenhuma pesagem vinculada a esta conta. O histórico aparece após o administrador registrar uma pesagem para este parceiro.</td></tr>';
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  body.innerHTML=`<tr><td colspan="4">Não foi possível carregar as pesagens: ${escapeHtml(message)}</td></tr>`;
  toast(`Não foi possível carregar o histórico de pesagens: ${message}`,true);
 }
}
async function loadAdminDashboardOverview(){
 if(state.role!=='admin')return;
 try{
  const [partners,buyers,orders,collections,weighings,oil]=await Promise.all([
   supabase.from('profiles').select('id',{count:'exact',head:true}).eq('role','partner'),
   supabase.from('profiles').select('id',{count:'exact',head:true}).eq('role','buyer'),
   supabase.from('orders').select('id',{count:'exact',head:true}),
   supabase.from('collections').select('id',{count:'exact',head:true}),
   fetchAllRows(()=>supabase.from('weighings').select('id,total_kg').order('id',{ascending:true})),
   fetchAllRows(()=>supabase.from('oil_collections').select('id,liters').order('id',{ascending:true}))
  ]);
  const failed=[partners,buyers,orders,collections].find(result=>result.error);
  if(failed)throw failed.error;
  $('#admin-overview-partners').textContent=String(partners.count||0);
  $('#admin-overview-buyers').textContent=String(buyers.count||0);
  $('#admin-overview-orders').textContent=String(orders.count||0);
  $('#admin-overview-collections').textContent=String(collections.count||0);
  $('#admin-overview-weight').textContent=`${weighings.reduce((sum,row)=>sum+Number(row.total_kg||0),0).toLocaleString('pt-BR',{maximumFractionDigits:1})} kg`;
  $('#admin-overview-oil').textContent=`${oil.reduce((sum,row)=>sum+Number(row.liters||0),0).toLocaleString('pt-BR',{maximumFractionDigits:1})} L`;
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  ['partners','buyers','orders','collections','weight','oil'].forEach(metric=>{const element=$(`#admin-overview-${metric}`);if(element)element.textContent='—'});
  toast(`Não foi possível atualizar os indicadores administrativos: ${message}`,true);
 }
}
async function loadMaterials(){
 const body=$('#materials-body');
 const isAdmin=state.role==='admin';
 if(state.role==='buyer'){
  body.innerHTML='<tr><td colspan="4">Carregando materiais lançados para sua conta...</td></tr>';
  try{
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(userError)throw userError;
   if(!user||user.id!==state.profile?.id)throw new Error('Não foi possível confirmar a conta do comprador. Entre novamente.');
   const orders=await fetchAllRows(()=>supabase.from('orders')
    .select('material_name,price_per_kg,created_at')
    .eq('buyer_id',user.id)
    .order('created_at',{ascending:false}));
   const materials=[...new Map([...orders].reverse()
    .filter(order=>order.material_name)
    .map(order=>[order.material_name.trim().toLocaleLowerCase('pt-BR'),order])).values()]
    .sort((left,right)=>left.material_name.localeCompare(right.material_name,'pt-BR'));
   const table=body.closest('table');
   table.querySelector('thead th:last-child').hidden=true;
   body.innerHTML=materials.map(material=>`<tr>
    <td>${escapeHtml(material.material_name)}</td>
    <td>kg</td>
    <td>${material.price_per_kg===null||material.price_per_kg===undefined||!Number.isFinite(Number(material.price_per_kg))?'—':`R$ ${Number(material.price_per_kg).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`}</td>
    <td><span class="pill">Lançado pelo administrador</span></td>
   </tr>`).join('')||'<tr><td colspan="4">Nenhum material foi lançado para sua conta. O administrador ainda não registrou transações.</td></tr>';
  }catch(error){
   body.innerHTML=`<tr><td colspan="4">${escapeHtml(error.message||error)}</td></tr>`;
   toast(`Não foi possível carregar os materiais da sua conta: ${error.message||error}`,true);
  }
  return;
 }
 let query=supabase.from('materials').select('id,name,unit,reference_price,active').order('name');
 if(state.role==='partner')query=query.eq('active',true);
 const {data,error}=await query;
 const colspan=5;
 if(error){
  body.innerHTML=`<tr><td colspan="${colspan}">${escapeHtml(error.message)}</td></tr>`;
  toast(`Não foi possível carregar os materiais: ${error.message}`,true);
  return;
 }
 const materials=data||[];
 const table=body.closest('table');
 table.querySelector('thead th:last-child').hidden=false;
 table.querySelector('thead th:last-child').textContent='Ações';
 body.innerHTML=materials.map(material=>`<tr>
  <td>${escapeHtml(material.name)}</td>
  <td>${escapeHtml(material.unit)}</td>
  <td>R$ ${Number(material.reference_price||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
  <td>${isAdmin?`<button type="button" class="pill material-toggle" data-material-id="${Number(material.id)}" data-active="${material.active}">${material.active?'Ativo':'Inativo'} · alterar</button>`:`<span class="pill">${material.active?'Ativo':'Indisponível'}</span>`}</td>
  <td>${isAdmin?`<div class="material-row-actions"><button type="button" class="btn btn-ghost material-edit" data-material-id="${Number(material.id)}">Editar</button><button type="button" class="btn material-delete" title="Excluir material do catálogo" aria-label="Excluir ${escapeHtml(material.name)} do catálogo" data-material-id="${Number(material.id)}">Excluir material</button></div>`:'—'}</td>
 </tr>`).join('')||`<tr><td colspan="${colspan}">Nenhum material cadastrado.</td></tr>`;
 body.querySelectorAll('.material-toggle').forEach(button=>button.addEventListener('click',()=>toggleMaterial(Number(button.dataset.materialId),button.dataset.active!=='true')));
 body.querySelectorAll('.material-edit').forEach(button=>button.addEventListener('click',()=>startMaterialEdit(Number(button.dataset.materialId),materials.find(material=>Number(material.id)===Number(button.dataset.materialId)),button.closest('tr'))));
 body.querySelectorAll('.material-delete').forEach(button=>button.addEventListener('click',()=>deleteMaterial(Number(button.dataset.materialId),materials.find(material=>Number(material.id)===Number(button.dataset.materialId)))));
}
async function saveMaterial(event){event.preventDefault();if(state.role!=='admin')return toast('Apenas o administrativo pode cadastrar materiais.',true);const form=event.currentTarget;const submit=form.querySelector('button[type="submit"]');submit.disabled=true;try{const {error}=await supabase.from('materials').insert({name:$('#material-name').value.trim(),unit:$('#material-unit').value.trim(),reference_price:Number($('#material-price').value)});if(error)throw error;form.reset();$('#material-unit').value='kg';toast('Material cadastrado.');await loadMaterials();}catch(error){toast(`Não foi possível cadastrar o material: ${error.message||'erro desconhecido'}`,true)}finally{submit.disabled=false}}
async function toggleMaterial(id,active){if(state.role!=='admin')return toast('Apenas o administrativo pode alterar materiais.',true);try{const {error}=await supabase.from('materials').update({active:!active}).eq('id',id);if(error)throw error;await loadMaterials();}catch(error){toast(`Não foi possível atualizar o material: ${error.message||'erro desconhecido'}`,true)}}
function startMaterialEdit(id,material,row){if(state.role!=='admin'||!material||!row)return toast('Apenas o administrativo pode editar materiais.',true);row.innerHTML=`<td><input class="input material-edit-name" maxlength="100" aria-label="Nome do material" value="${escapeHtml(material.name)}"></td><td><input class="input material-edit-unit" maxlength="20" aria-label="Unidade" value="${escapeHtml(material.unit)}"></td><td><input class="input material-edit-price" type="number" min="0" step="0.01" aria-label="Valor de referência" value="${Number(material.reference_price)}"></td><td><span class="pill">${material.active?'Ativo':'Inativo'}</span></td><td><div class="material-row-actions"><button type="button" class="btn btn-green material-save">Salvar</button><button type="button" class="btn btn-ghost material-cancel">Cancelar</button></div></td>`;row.querySelector('.material-save').addEventListener('click',()=>saveMaterialEdit(id,row));row.querySelector('.material-cancel').addEventListener('click',loadMaterials);}
async function saveMaterialEdit(id,row){if(state.role!=='admin')return toast('Apenas o administrativo pode editar materiais.',true);const name=row.querySelector('.material-edit-name').value.trim(),unit=row.querySelector('.material-edit-unit').value.trim(),price=Number(row.querySelector('.material-edit-price').value);if(!name||!unit||!Number.isFinite(price)||price<0)return toast('Informe nome, unidade e valor válidos.',true);const button=row.querySelector('.material-save');button.disabled=true;try{const {error}=await supabase.from('materials').update({name,unit,reference_price:price}).eq('id',id);if(error)throw error;toast('Material atualizado.');await loadMaterials();}catch(error){toast(`Não foi possível editar o material: ${error.message||'erro desconhecido'}`,true);button.disabled=false}}
async function deleteMaterial(id,material){if(state.role!=='admin'||!material)return toast('Apenas o administrativo pode excluir materiais.',true);if(!confirm(`Excluir permanentemente "${material.name}" do catálogo? Os registros históricos serão preservados sem o vínculo com este material.`))return;try{const {error}=await supabase.rpc('delete_material_preserving_history',{p_material_id:id});if(error)throw error;toast('Material excluído do catálogo; os registros históricos foram preservados.');await loadMaterials();}catch(error){toast(`Não foi possível excluir o material: ${error.message||'erro desconhecido'}`,true)}}
async function loadWalletAndBenefits(){
 const benefitsList=$('#benefits-list');
 const redemptionBody=$('#redemptions-body');
 if(state.role!=='partner'){
  state.walletBalance=0;
  $('#metric-wallet').textContent='—';
  $('#metric-wallet-label').textContent='Carteira Verde';
  $('#points-big').textContent='0';
  $('#benefits-balance').textContent='0';
  benefitsList.innerHTML='<div class="empty">A carteira e os resgates estão disponíveis para parceiros.</div>';
  redemptionBody.innerHTML='<tr><td colspan="4">Disponível para parceiros.</td></tr>';
  return;
 }

 const [walletResult,benefitsResult,redemptionsResult]=await Promise.all([
  supabase.from('green_wallet').select('points_balance').eq('partner_id',state.profile.id).maybeSingle(),
  supabase.from('benefits').select('id,title,name,description,points_cost,photo_url').eq('active',true).order('points_cost'),
  supabase.from('benefit_redemptions').select('id,benefit_id,points_used,status,created_at').eq('partner_id',state.profile.id).order('created_at',{ascending:false}).limit(20)
 ]);

 if(walletResult.error){
  state.walletBalance=null;
  toast(`Não foi possível carregar a Carteira Verde: ${walletResult.error.message}`,true);
 }else if(!walletResult.data){
  state.walletBalance=null;
  toast('Carteira Verde não inicializada para este parceiro. Aplique as migrações do Supabase.',true);
 }else{
  const balance=Number(walletResult.data.points_balance);
  if(Number.isFinite(balance)){
   state.walletBalance=balance;
  }else{
   state.walletBalance=null;
   toast('O saldo retornado pela Carteira Verde é inválido.',true);
  }
 }
 const pointsText=state.walletBalance===null?'—':formatPoints(state.walletBalance);
 $('#metric-wallet').textContent=pointsText;
 $('#partner-wallet-balance').textContent=state.walletBalance===null?'— pts':`${pointsText} pts`;
 $('#points-big').textContent=pointsText;
 $('#benefits-balance').textContent=pointsText;

 if(benefitsResult.error){
  benefitsList.innerHTML=`<div class="empty">Não foi possível carregar os benefícios: ${escapeHtml(benefitsResult.error.message)}</div>`;
  toast(`Não foi possível carregar os benefícios: ${benefitsResult.error.message}`,true);
 }else{
  benefitsList.innerHTML=(benefitsResult.data||[]).map(benefit=>{
   const benefitName=benefit.name||benefit.title||'Produto sem nome';
   return `
   <article class="card benefit-card">
    ${benefit.photo_url?`<img class="benefit-product-image" src="${escapeHtml(benefit.photo_url)}" alt="${escapeHtml(benefitName)}" loading="lazy">`:'<div class="benefit-product-placeholder" aria-hidden="true">🎁</div>'}
    <h3>${escapeHtml(benefitName)}</h3>
    <p class="muted">${escapeHtml(benefit.description||'Benefício disponível para resgate.')}</p>
    <div class="benefit-footer"><span class="pill">${formatPoints(benefit.points_cost)} pontos</span>
     <button class="btn btn-green benefit-redeem" type="button" data-benefit-id="${Number(benefit.id)}" ${state.walletBalance===null||state.walletBalance<Number(benefit.points_cost)?'disabled':''}>Resgatar Kit</button>
    </div>
   </article>`;
  }).join('')||'<div class="empty">Nenhum benefício disponível no momento.</div>';
 }

 if(redemptionsResult.error){
  redemptionBody.innerHTML=`<tr><td colspan="4">Não foi possível carregar os resgates: ${escapeHtml(redemptionsResult.error.message)}</td></tr>`;
  toast(`Não foi possível carregar os resgates: ${redemptionsResult.error.message}`,true);
 }else{
  const redemptions=redemptionsResult.data||[];
  const benefitIds=[...new Set(redemptions.map(item=>item.benefit_id))];
  let benefitsById={};
  if(benefitIds.length){
   const {data,error}=await supabase.from('benefits').select('id,title,name').in('id',benefitIds);
   if(error){
    toast(`Não foi possível identificar os benefícios resgatados: ${error.message}`,true);
   }else{
    benefitsById=Object.fromEntries((data||[]).map(benefit=>[benefit.id,benefit.name||benefit.title||'Produto sem nome']));
   }
  }
  redemptionBody.innerHTML=redemptions.map(item=>`<tr><td>${new Date(item.created_at).toLocaleDateString('pt-BR')}</td><td>${escapeHtml(benefitsById[item.benefit_id]||`Benefício #${item.benefit_id}`)}</td><td>${formatPoints(item.points_used)}</td><td><span class="pill">${escapeHtml(item.status)}</span></td></tr>`).join('')||'<tr><td colspan="4">Você ainda não fez resgates.</td></tr>';
 }
}
async function redeemBenefit(benefitId,button){
 if(state.role!=='partner')return toast('Somente parceiros podem resgatar benefícios.',true);
 if(!Number.isSafeInteger(benefitId)||benefitId<1)return toast('Benefício inválido.',true);
 if(button.disabled)return;
 if(!confirm('Deseja confirmar o resgate deste benefício?'))return;
 button.disabled=true;
 button.dataset.originalLabel=button.textContent;
 button.textContent='Processando...';
 try{
  const {data,error}=await supabase.rpc('redeem_benefit',{p_benefit_id:benefitId});
  if(error)throw error;
  if(!Array.isArray(data)||data.length!==1||!Number.isSafeInteger(Number(data[0].redemption_id))||Number(data[0].redemption_id)<1||!Number.isFinite(Number(data[0].points_balance))){
   throw new Error('O servidor não confirmou o resgate. Atualize as migrações do Supabase e tente novamente.');
  }
  toast('Resgate realizado com sucesso!');
  await loadWalletAndBenefits();
 }catch(error){
  toast(`Não foi possível resgatar o benefício: ${error.message||'erro desconhecido'}`,true);
 }finally{
  if(button.isConnected){
   button.disabled=false;
   button.textContent=button.dataset.originalLabel||'Resgatar Kit';
   delete button.dataset.originalLabel;
  }
 }
}
const PARTNER_IMPACT_FACTORS={paperTreesPerKg:0.017,plasticWaterLitersPerKg:5.8,glassWaterLitersPerKg:0.05};
function formatImpactNumber(value,digits=1){
 return Number(value||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:digits});
}
function normalizedImpactStatus(value){
 return String(value||'').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
async function loadPartnerImpact(){
 const grid=$('#partner-impact-grid');
 if(state.role!=='partner'){
  grid.innerHTML='<article class="partner-impact-card"><strong>Indicadores disponíveis para parceiros.</strong></article>';
  return;
 }
 grid.querySelectorAll('.partner-impact-card strong').forEach(element=>element.textContent='…');
 try{
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user||user.id!==state.profile?.id)throw new Error('Não foi possível confirmar a conta do parceiro. Entre novamente.');
  const [weighings,redemptions]=await Promise.all([
   fetchAllRows(()=>supabase.from('weighings').select('material_name,total_kg').eq('partner_id',user.id).order('id')),
   fetchAllRows(()=>supabase.from('benefit_redemptions')
    .select('points_used')
    .eq('profile_id',user.id).order('id'))
  ]);
  let paperKg=0,plasticKg=0,glassKg=0;
  weighings.forEach(row=>{
   const name=normalizedImpactStatus(row.material_name);
   const kg=Number(row.total_kg);
   if(!Number.isFinite(kg)||kg<=0)return;
   if(name.includes('papel'))paperKg+=kg;
   if(name.includes('plast'))plasticKg+=kg;
   if(name.includes('vidro'))glassKg+=kg;
  });
  const trees=paperKg*PARTNER_IMPACT_FACTORS.paperTreesPerKg;
  const water=(plasticKg*PARTNER_IMPACT_FACTORS.plasticWaterLitersPerKg)+(glassKg*PARTNER_IMPACT_FACTORS.glassWaterLitersPerKg);
  const points=redemptions.reduce((sum,row)=>sum+Number(row.points_used||0),0);
  $('#impact-trees').textContent=`${formatImpactNumber(trees,2)} árvores`;
  $('#impact-water').textContent=`${formatImpactNumber(water,1)} L`;
  $('#impact-points-redeemed').textContent=`${formatImpactNumber(points,0)} pontos`;
  $('#impact-redemption-count').textContent=`${redemptions.length} ${redemptions.length===1?'resgate solicitado':'resgates solicitados'}`;
 }catch(error){
  grid.querySelectorAll('.partner-impact-card strong').forEach(element=>element.textContent='Indisponível');
  toast(`Não foi possível calcular seu impacto e benefícios: ${error.message||error}`,true);
 }
}
async function loadCollections(){
 const isAdmin=state.role==='admin';
 const columns='id,partner_id,type,requested_date,requested_period,status';
 const query=supabase.from('collections').select(columns).order('requested_date',{ascending:false});
 if(state.role==='partner')query.eq('partner_id',state.profile.id);
 const {data,error}=await query;
 const body=$('#collections-body');
 const header=body.closest('table').querySelector('thead tr');
 let partnerHeader=header.querySelector('.admin-collection-partner');
 if(isAdmin&&!partnerHeader){
  partnerHeader=document.createElement('th');
  partnerHeader.className='admin-collection-partner';
  partnerHeader.textContent='Parceiro';
  header.insertBefore(partnerHeader,header.firstElementChild);
 }else if(!isAdmin)partnerHeader?.remove();
 const colspan=isAdmin?'7':'6';
 if(error){
  body.innerHTML=`<tr><td colspan="${colspan}">${escapeHtml(error.message)}</td></tr>`;
  toast(`Não foi possível carregar as coletas: ${error.message}`,true);
  return;
 }
 let collections=data||[];
 if(state.role==='partner'){
  const oilResult=await supabase.from('oil_collections')
   .select('id,partner_id,liters,requested_date,requested_period,status')
   .eq('partner_id',state.profile.id).order('requested_date',{ascending:false});
  if(oilResult.error){
   toast(`Não foi possível carregar os agendamentos de óleo: ${oilResult.error.message}`,true);
  }else{
   const oilRequests=(oilResult.data||[]).map(row=>({
    ...row,
    collection_table:'oil_collections',
    type:`Retirada de Óleo Usado · ${formatImpactNumber(row.liters,1)} L`,
    status:row.status||'solicitada'
   }));
   collections=collections.map(row=>({...row,collection_table:'collections'}));
   collections=[...collections,...oilRequests].sort((a,b)=>String(b.requested_date||'').localeCompare(String(a.requested_date||'')));
  }
 }
 let partnerNames={};
 const partnerIds=[...new Set(collections.map(collection=>collection.partner_id))];
 if(isAdmin&&partnerIds.length){
  const profiles=await supabase.from('profiles').select('id,full_name').in('id',partnerIds);
  if(profiles.error)toast(`Não foi possível identificar os parceiros das coletas: ${profiles.error.message}`,true);
  else partnerNames=Object.fromEntries((profiles.data||[]).map(profile=>[profile.id,profile.full_name]));
 }
 body.innerHTML=collections.map(collection=>`<tr>${isAdmin?`<td>${escapeHtml(partnerNames[collection.partner_id]||'Parceiro')}</td>`:''}<td>—</td><td>${escapeHtml(collection.type)}</td><td>${escapeHtml(collection.requested_date||'—')}</td><td>${collectionPeriodLabel(collection.requested_period)}</td><td>${escapeHtml(collectionStatusLabel(collection.status))}</td><td>${isAdmin?`<select class="input collection-status" data-collection-table="${collection.collection_table||'collections'}" data-collection-id="${Number(collection.id)}" aria-label="Status da coleta">${[['solicitada','Solicitada'],['confirmada','Confirmada'],['em_andamento','Em andamento'],['concluida','Concluída'],['cancelada','Cancelada']].map(([value,label])=>`<option value="${value}" ${collectionStatusLabel(collection.status)===label?'selected':''}>${label}</option>`).join('')}</select>`:`<span class="pill">${escapeHtml(collectionStatusLabel(collection.status))}</span>`}</td></tr>`).join('')||`<tr><td colspan="${colspan}">Nenhuma coleta registrada.</td></tr>`;
 body.querySelectorAll('.collection-status').forEach(select=>select.addEventListener('change',()=>updateCollectionStatus(select)));
}
async function updateCollectionStatus(select){const id=Number(select.dataset.collectionId);const table=select.dataset.collectionTable==='oil_collections'?'oil_collections':'collections';const status=select.value;select.disabled=true;const {error}=await supabase.from(table).update({status}).eq('id',id);if(error){toast(`Não foi possível atualizar a coleta: ${error.message}`,true);await loadCollections();return}toast(status==='confirmada'?'Coleta confirmada.':'Status da coleta atualizado.');await loadCollections();}
async function loadBuyerOrders(){
 const body=$('#buyer-orders-body');
 if(state.role!=='buyer'||!state.profile?.id)return;
 state.buyerOrderHistory=[];
 $('#buyer-filtered-weight').textContent='…';
 $('#buyer-filtered-total').textContent='…';
 $('#buyer-filtered-count').textContent='Carregando…';
 body.innerHTML='<tr><td colspan="6">Carregando seu histórico...</td></tr>';
 try{
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user||user.id!==state.profile.id)throw new Error('Não foi possível confirmar a conta do comprador. Entre novamente.');
  const orders=await fetchAllRows(()=>supabase.from('orders')
   .select('id,buyer_id,material_name,quantity_kg,price_per_kg,total_value,status,created_at')
   .eq('buyer_id',user.id)
   .order('created_at',{ascending:false}).order('id',{ascending:false}));
  state.buyerOrderHistory=orders.map(order=>{
   const quantity=Number(order.quantity_kg);
   const price=order.price_per_kg===null?null:Number(order.price_per_kg);
   const total=order.total_value===null?null:Number(order.total_value);
   return {
    id:order.id,
    date:order.created_at,
    dateKey:localDateKey(order.created_at),
  material:order.material_name||'Material não identificado',
    quantity:Number.isFinite(quantity)?quantity:0,
  price:Number.isFinite(price)?price:null,
  subtotal:Number.isFinite(total)?total:null,
    status:order.status||'solicitado'
   };
  });
  updateBuyerOrderFilterOptions();
  renderBuyerOrders();
 }catch(error){
   $('#buyer-filtered-weight').textContent='—';
   $('#buyer-filtered-total').textContent='—';
   $('#buyer-filtered-count').textContent='Falha ao carregar';
   renderBuyerOrderChart([]);
   body.innerHTML=`<tr><td colspan="6">${escapeHtml(error.message||error)}</td></tr>`;
   toast(`Não foi possível carregar suas compras: ${error.message||error}`,true);
  }
}
function buyerIsoWeek(value){
 const date=new Date(`${value}T00:00:00Z`);
 date.setUTCDate(date.getUTCDate()+4-(date.getUTCDay()||7));
 const year=date.getUTCFullYear();
 const firstThursday=new Date(Date.UTC(year,0,4));
 firstThursday.setUTCDate(firstThursday.getUTCDate()+4-(firstThursday.getUTCDay()||7));
 const number=Math.round((date-firstThursday)/604800000)+1;
 return {year,number,key:`${year}-W${String(number).padStart(2,'0')}`};
}
function updateBuyerOrderFilterOptions(){
 const yearSelect=$('#buyer-filter-year');
 const monthSelect=$('#buyer-filter-month');
 const weekSelect=$('#buyer-filter-week');
 if(!yearSelect||!monthSelect||!weekSelect)return;
 const previousYear=yearSelect.value;
 const previousMonth=monthSelect.value;
 const previousWeek=weekSelect.value;
 const dates=state.buyerOrderHistory.map(order=>order.dateKey).filter(Boolean);
 const years=[...new Set(dates.map(date=>date.slice(0,4)))].sort().reverse();
 yearSelect.innerHTML='<option value="">Todos os anos</option>'+years.map(year=>`<option value="${year}">${year}</option>`).join('');
 if(years.includes(previousYear))yearSelect.value=previousYear;

 const year=yearSelect.value;
 const yearDates=dates.filter(date=>!year||date.startsWith(`${year}-`));
 const months=[...new Set(yearDates.map(date=>date.slice(5,7)))].sort();
 monthSelect.disabled=months.length===0;
 monthSelect.innerHTML='<option value="">Todos os meses</option>'+months.map(month=>{
  const label=new Date(Date.UTC(2020,Number(month)-1,1)).toLocaleDateString('pt-BR',{month:'long',timeZone:'UTC'});
  return `<option value="${Number(month)}">${label}</option>`;
 }).join('');
 if(months.includes(String(previousMonth).padStart(2,'0')))monthSelect.value=String(Number(previousMonth));

 const month=monthSelect.value;
 const weekDates=dates.filter(date=>(!year||date.startsWith(`${year}-`))&&(!month||Number(date.slice(5,7))===Number(month)));
 const weeks=[...new Map(weekDates.map(date=>{
  const week=buyerIsoWeek(date);
  return [week.key,week];
 }))].sort((a,b)=>a[1].year-b[1].year||a[1].number-b[1].number);
 weekSelect.disabled=weeks.length===0;
 weekSelect.innerHTML='<option value="">Todas as semanas</option>'+weeks.map(([key,week])=>`<option value="${key}">Semana ${String(week.number).padStart(2,'0')} · ${week.year}</option>`).join('');
 if(weeks.some(([key])=>key===previousWeek))weekSelect.value=previousWeek;
}
function buyerFilteredOrders(){
 const year=$('#buyer-filter-year').value;
 const month=$('#buyer-filter-month').value;
 const week=$('#buyer-filter-week').value;
 return state.buyerOrderHistory.filter(order=>{
  if(!order.dateKey)return !year&&!month&&!week;
  if(year&&!order.dateKey.startsWith(`${year}-`))return false;
  if(month&&Number(order.dateKey.slice(5,7))!==Number(month))return false;
  return !week||buyerIsoWeek(order.dateKey).key===week;
 });
}
function buyerCurrency(value){
 return `R$ ${Number(value||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}
function buyerReportPeriod(){
 const year=$('#buyer-filter-year').value;
 const month=$('#buyer-filter-month').value;
 const week=$('#buyer-filter-week').value;
 const parts=[];
 if(week){
  const [weekYear,weekNumber]=week.split('-W');
  parts.push(`Semana ${weekNumber} · ${weekYear}`);
 }
 if(month)parts.push(new Date(Date.UTC(2020,Number(month)-1,1)).toLocaleDateString('pt-BR',{month:'long',timeZone:'UTC'}));
 if(year)parts.push(year);
 return parts.length?parts.join(' · '):'Todo o período';
}
function renderBuyerOrders(){
 const rows=buyerFilteredOrders();
 const totalWeight=rows.reduce((sum,order)=>sum+order.quantity,0);
 const isCancelled=order=>['cancelado','cancelada','cancelados','canceladas'].includes(String(order.status).trim().toLocaleLowerCase('pt-BR'));
 const priced=rows.filter(order=>order.subtotal!==null&&!isCancelled(order));
 const totalValue=priced.reduce((sum,order)=>sum+Math.round(order.subtotal*100),0)/100;
 $('#buyer-filtered-weight').textContent=`${totalWeight.toLocaleString('pt-BR',{maximumFractionDigits:3})} kg`;
 $('#buyer-filtered-total').textContent=priced.length?buyerCurrency(totalValue):'—';
 $('#buyer-filtered-count').textContent=`${rows.length} ${rows.length===1?'registro':'registros'}`;
 $('#buyer-orders-body').innerHTML=rows.map(order=>`<tr>
  <td data-label="Data">${order.date?new Date(order.date).toLocaleDateString('pt-BR'):'—'}</td>
  <td data-label="Material">${escapeHtml(order.material)}</td>
  <td data-label="Quantidade">${order.quantity.toLocaleString('pt-BR',{maximumFractionDigits:3})} kg</td>
  <td data-label="Preço unitário">${order.price===null?'—':buyerCurrency(order.price)}</td>
  <td data-label="Valor lançado">${order.subtotal===null?'—':buyerCurrency(order.subtotal)}</td>
  <td data-label="Status"><span class="pill">${escapeHtml(order.status)}</span></td>
 </tr>`).join('')||'<tr><td colspan="6">Nenhum lançamento do administrador para este período.</td></tr>';
 renderBuyerOrderChart(rows);
}
function buyerMaterialTotals(rows){
 const totals=new Map();
 rows.forEach(order=>totals.set(order.material,(totals.get(order.material)||0)+order.quantity));
 return [...totals.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'pt-BR'));
}
function renderBuyerOrderChart(rows){
 const canvas=$('#buyer-order-chart-bars');
 if(!canvas)return;
 const totals=buyerMaterialTotals(rows);
 const chartContainer=canvas.parentElement;
 $('#buyer-order-chart-period').textContent=buyerReportPeriod();
 state.buyerOrderChart?.destroy();
 state.buyerOrderChart=null;
 chartContainer.querySelector('.buyer-order-chart-empty')?.remove();
 if(!totals.length){
  canvas.hidden=true;
  chartContainer.insertAdjacentHTML('beforeend','<p class="buyer-order-chart-empty">Não há lançamentos neste período para montar o gráfico.</p>');
  return;
 }
 canvas.hidden=false;
 state.buyerOrderChart=new Chart(canvas,{
  type:'bar',
  data:{
   labels:totals.map(([material])=>material),
   datasets:[{
    label:'Quantidade registrada (kg)',
    data:totals.map(([,quantity])=>quantity),
    backgroundColor:'#00c853',
    borderColor:'#00ff00',
    borderWidth:1,
    borderRadius:6
   }]
  },
  options:{
   responsive:true,
   maintainAspectRatio:false,
   indexAxis:'y',
   plugins:{legend:{display:false}},
   scales:{
    x:{beginAtZero:true,title:{display:true,text:'Quilogramas'}},
    y:{ticks:{autoSkip:false}}
   }
  }
 });
}
function exportBuyerOrdersPdf(){
 const JsPDF=window.jspdf?.jsPDF;
 if(!JsPDF)return toast('A biblioteca de PDF não foi carregada. Atualize a página e tente novamente.',true);
 const rows=buyerFilteredOrders();
 const doc=new JsPDF({orientation:'landscape',unit:'mm',format:'a4'});
 const totalWeight=rows.reduce((sum,order)=>sum+order.quantity,0);
 const normalizeStatus=value=>String(value).trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const isCancelled=order=>['cancelado','cancelada','cancelados','canceladas'].includes(normalizeStatus(order.status));
 const priced=rows.filter(order=>order.subtotal!==null&&!isCancelled(order));
 const totalCents=priced.reduce((sum,order)=>sum+Math.round(order.subtotal*100),0);
 const openCents=rows.filter(order=>['solicitado','solicitada','em_andamento','em andamento'].includes(normalizeStatus(order.status)))
  .reduce((sum,order)=>sum+(order.subtotal===null?0:Math.round(order.subtotal*100)),0);
 const completedCents=rows.filter(order=>['concluido','concluida'].includes(normalizeStatus(order.status)))
  .reduce((sum,order)=>sum+(order.subtotal===null?0:Math.round(order.subtotal*100)),0);
 doc.setFont('helvetica','bold');
 doc.setFontSize(20);
 doc.setTextColor(12,112,49);
 doc.text('ReciclaDin',14,18);
 doc.setFontSize(12);
 doc.setTextColor(25,35,28);
 doc.text('Relatório de transações registradas',14,27);
 doc.setFont('helvetica','normal');
 doc.setFontSize(10);
 doc.text(`Comprador: ${state.profile?.full_name||'Não informado'}`,14,35);
 doc.text(`CPF: ${state.profile?.cpf||'Não informado'}  ·  E-mail: ${state.session?.email||'Não informado'}`,14,41);
 doc.text(`Período: ${buyerReportPeriod()}`,14,47);
 autoTable(doc,{
  startY:54,
  head:[['Data','Tipo de material','Quantidade registrada (kg)','Preço unitário lançado (R$/kg)','Valor lançado (R$)','Status']],
  body:rows.map(order=>[
   order.date?new Date(order.date).toLocaleDateString('pt-BR'):'—',
   order.material,
   order.quantity.toLocaleString('pt-BR',{maximumFractionDigits:3}),
   order.price===null?'—':order.price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
   order.subtotal===null?'—':order.subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
   order.status
  ]),
  theme:'grid',
  headStyles:{fillColor:[0,135,55],textColor:[255,255,255]},
  styles:{font:'helvetica',fontSize:8,cellPadding:2.5,overflow:'linebreak'},
  margin:{left:14,right:14}
 });
 let footerY=(doc.lastAutoTable?.finalY||54)+9;
 const materialTotals=buyerMaterialTotals(rows);
 if(materialTotals.length){
  doc.setFont('helvetica','bold');
  doc.setFontSize(11);
  doc.text('Resumo por material',14,footerY);
  autoTable(doc,{
   startY:footerY+3,
   head:[['Material','Quantidade registrada (kg)']],
   body:materialTotals.map(([material,quantity])=>[material,quantity.toLocaleString('pt-BR',{maximumFractionDigits:3})]),
   theme:'grid',
   headStyles:{fillColor:[0,135,55],textColor:[255,255,255]},
   styles:{font:'helvetica',fontSize:8,cellPadding:2.5,overflow:'linebreak'},
   margin:{left:14,right:14}
  });
  footerY=(doc.lastAutoTable?.finalY||footerY)+9;
 }
 if(footerY>174){doc.addPage();footerY=20;}
 doc.setFont('helvetica','bold');
 doc.setFontSize(10);
 doc.setTextColor(25,35,28);
 doc.text(`Quantidade total registrada: ${totalWeight.toLocaleString('pt-BR',{maximumFractionDigits:3})} kg`,14,footerY);
 doc.text(`Total lançado pelo administrador (registros com valor informado): ${buyerCurrency(totalCents/100)}`,14,footerY+6);
 doc.setFont('helvetica','normal');
 doc.text(`Valor lançado em registros em aberto: ${buyerCurrency(openCents/100)}`,14,footerY+12);
 doc.text(`Valor lançado em registros concluídos: ${buyerCurrency(completedCents/100)}`,14,footerY+18);
 doc.setFontSize(8);
 doc.setTextColor(90,99,92);
 doc.text('Os dados e valores deste relatório correspondem aos registros lançados pelo administrador para o comprador. Valores ausentes não são estimados.',14,footerY+26,{maxWidth:265});
 doc.save('meu-relatorio-transacoes-recicladin.pdf');
}
async function loadAdminOrders(){const body=$('#admin-orders-body');const {data,error}=await supabase.from('orders').select('id,buyer_id,material_name,quantity_kg,status,created_at').order('created_at',{ascending:false});if(error){body.innerHTML=`<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;toast(`Não foi possível carregar os pedidos: ${error.message}`,true);return}const orders=data||[];const buyerIds=[...new Set(orders.map(order=>order.buyer_id))];let names={};if(buyerIds.length){const profiles=await supabase.from('profiles').select('id,full_name').in('id',buyerIds);if(profiles.error){toast(`Não foi possível carregar os compradores: ${profiles.error.message}`,true)}else names=Object.fromEntries((profiles.data||[]).map(profile=>[profile.id,profile.full_name]));}body.innerHTML=orders.map(order=>`<tr><td>${new Date(order.created_at).toLocaleDateString('pt-BR')}</td><td>${escapeHtml(names[order.buyer_id]||'Comprador')}</td><td>${escapeHtml(order.material_name||'Material')}</td><td>${Number(order.quantity_kg).toLocaleString('pt-BR')} kg</td><td><select class="input order-status" data-order-id="${Number(order.id)}" aria-label="Status do pedido">${[['solicitado','Solicitado'],['em_andamento','Em andamento'],['concluido','Concluído'],['cancelado','Cancelado']].map(([value,label])=>`<option value="${value}" ${order.status===value?'selected':''}>${label}</option>`).join('')}</select></td></tr>`).join('')||'<tr><td colspan="5">Nenhum pedido registrado.</td></tr>';body.querySelectorAll('.order-status').forEach(select=>select.addEventListener('change',()=>updateOrderStatus(Number(select.dataset.orderId),select.value)));}
async function updateOrderStatus(id,status){const {error}=await supabase.from('orders').update({status}).eq('id',id);if(error){toast(`Não foi possível atualizar o pedido: ${error.message}`,true);loadAdminOrders();return}toast('Status do pedido atualizado.');}
async function loadPartners(){
 const partnerBody=$('#partners-body');
 const buyerBody=$('#buyers-body');
 const [profilesResult,collectionsResult,weighingsResult,ordersResult]=await Promise.all([
  supabase.from('profiles').select('id,full_name,cpf,role').in('role',['partner','buyer']).order('full_name'),
  supabase.from('collections').select('partner_id'),
  supabase.from('weighings').select('partner_id'),
  supabase.from('orders').select('buyer_id')
 ]);
 const results=[
  ['perfis',profilesResult],
  ['coletas',collectionsResult],
  ['pesagens',weighingsResult],
  ['pedidos',ordersResult]
 ];
 const failed=results.find(([,result])=>result.error);
 if(failed){
  const [label,result]=failed;
  const error=result.error;
  partnerBody.innerHTML=`<tr><td colspan="4">Não foi possível carregar os dados: ${escapeHtml(error.message)}</td></tr>`;
  buyerBody.innerHTML=`<tr><td colspan="3">Não foi possível carregar os dados: ${escapeHtml(error.message)}</td></tr>`;
  toast(`Não foi possível carregar ${label}: ${error.message}`,true);
  return;
 }
 const profiles=profilesResult.data||[];
 const partners=profiles.filter(profile=>profile.role==='partner');
 const buyers=profiles.filter(profile=>profile.role==='buyer');
 const countById=rows=>rows.reduce((counts,row)=>{
  counts.set(row.partner_id||row.buyer_id,(counts.get(row.partner_id||row.buyer_id)||0)+1);
  return counts;
 },new Map());
 const collectionCounts=countById(collectionsResult.data||[]);
 const weighingCounts=countById(weighingsResult.data||[]);
 const orderCounts=countById(ordersResult.data||[]);
 $('#partner-count').textContent=String(partners.length);
 $('#buyer-count').textContent=String(buyers.length);
 partnerBody.innerHTML=partners.map(profile=>`<tr data-profile-name="${escapeHtml(profile.full_name||'Sem nome')}"><td>${escapeHtml(profile.full_name||'Sem nome')}</td><td>${escapeHtml(profile.cpf||'—')}</td><td>${collectionCounts.get(profile.id)||0}</td><td>${weighingCounts.get(profile.id)||0}</td></tr>`).join('')||'<tr><td colspan="4">Nenhum parceiro cadastrado.</td></tr>';
 buyerBody.innerHTML=buyers.map(profile=>`<tr data-profile-name="${escapeHtml(profile.full_name||'Sem nome')}"><td>${escapeHtml(profile.full_name||'Sem nome')}</td><td>${escapeHtml(profile.cpf||'—')}</td><td>${orderCounts.get(profile.id)||0}</td></tr>`).join('')||'<tr><td colspan="3">Nenhum comprador cadastrado.</td></tr>';
 filterProfileRows('partner');
 filterProfileRows('buyer');
}
async function loadOilRecords(){
 const body=$('#oil-admin-body');
 const {data,error}=await supabase.from('oil_collections').select('id,partner_id,liters,status').order('id',{ascending:false});
 if(error){body.innerHTML=`<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;toast(`Não foi possível carregar os registros de óleo: ${error.message}`,true);return}
 const records=data||[];
 const partnerIds=[...new Set(records.map(item=>item.partner_id))];
 let names={};
 if(partnerIds.length){
  const profiles=await supabase.from('profiles').select('id,full_name').in('id',partnerIds);
  if(profiles.error)toast(`Não foi possível identificar parceiros dos registros: ${profiles.error.message}`,true);
  else names=Object.fromEntries((profiles.data||[]).map(profile=>[profile.id,profile.full_name]));
 }
 body.innerHTML=records.map(item=>`<tr><td>—</td><td>${escapeHtml(names[item.partner_id]||'Parceiro')}</td><td>${Number(item.liters).toLocaleString('pt-BR')} L</td><td>${state.role==='admin'?`<select class="input oil-status" data-oil-id="${Number(item.id)}" aria-label="Status do registro de óleo">${[...new Set([item.status,'Pendente','Em andamento','Concluída','Cancelada'])].map(status=>`<option value="${escapeHtml(status)}" ${item.status===status?'selected':''}>${escapeHtml(status)}</option>`).join('')}</select>`:`<span class="pill">${escapeHtml(item.status)}</span>`}</td></tr>`).join('')||'<tr><td colspan="4">Nenhum registro de óleo encontrado.</td></tr>';
 body.querySelectorAll('.oil-status').forEach(select=>select.addEventListener('change',()=>updateOilStatus(Number(select.dataset.oilId),select.value)));
}
async function updateOilStatus(id,status){
 if(state.role!=='admin')return toast('Apenas o administrador pode atualizar registros de óleo.',true);
 const {error}=await supabase.from('oil_collections').update({status}).eq('id',id);
 if(error){toast(`Não foi possível atualizar o registro de óleo: ${error.message}`,true);await loadOilRecords();return}
 toast('Status do registro de óleo atualizado.');
}
async function loadHistory(){
 const body=$('#history-body');
 const header=body.closest('table').querySelector('thead tr');
 if(state.role==='partner'){
  header.innerHTML='<th>Data</th><th>Material</th><th>Peso registrado</th><th>Pontos recebidos</th>';
  const {data,error}=await supabase.from('weighings').select('created_at,material_name,total_kg,points').eq('partner_id',state.profile.id).order('created_at',{ascending:false}).limit(30);
  body.innerHTML=error?`<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`:(data||[]).map(item=>`<tr><td>${new Date(item.created_at).toLocaleDateString('pt-BR')}</td><td>${escapeHtml(item.material_name||'Material reciclável')}</td><td>${Number(item.total_kg||0).toLocaleString('pt-BR',{maximumFractionDigits:3})} kg</td><td><strong class="partner-earned-points">+${formatPoints(item.points)} pts</strong></td></tr>`).join('')||'<tr><td colspan="4">Nenhuma contribuição registrada. O histórico aparece depois que o administrador confirma uma pesagem.</td></tr>';
  if(error)toast(`Não foi possível carregar o histórico de contribuições: ${error.message}`,true);
  return;
 }
 if(state.role==='buyer'){
  header.innerHTML='<th>Data</th><th>Material</th><th>Quantidade</th><th>Status</th>';
  const {data,error}=await supabase.from('orders').select('created_at,material_name,quantity_kg,status').eq('buyer_id',state.profile.id).order('created_at',{ascending:false}).limit(30);
  body.innerHTML=error?`<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`:(data||[]).map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString('pt-BR')}</td><td>${escapeHtml(x.material_name||'Pedido')}</td><td>${Number(x.quantity_kg||0).toLocaleString('pt-BR',{maximumFractionDigits:3})} kg</td><td>${escapeHtml(x.status||'—')}</td></tr>`).join('')||'<tr><td colspan="4">Sem histórico.</td></tr>';
  return;
 }
 header.innerHTML='<th>Data</th><th>Coleta</th><th>Status</th><th>Observação</th>';
 const {data,error}=await supabase.from('collections').select('requested_date,type,status').order('requested_date',{ascending:false}).limit(30);
 body.innerHTML=error?`<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`:(data||[]).map(x=>`<tr><td>${x.requested_date?new Date(`${x.requested_date}T00:00:00`).toLocaleDateString('pt-BR'):'—'}</td><td>${escapeHtml(x.type)}</td><td>${escapeHtml(x.status)}</td><td>—</td></tr>`).join('')||'<tr><td colspan="4">Sem histórico.</td></tr>';
}
function getAdminReportRange(){
 const granularity=$('#report-granularity').value;
 let start;
 let end;
 if(granularity==='day'){
  start=$('#report-day').value;
  if(!start)throw new Error('Selecione o dia do relatório.');
  const next=new Date(`${start}T00:00:00`);
  next.setDate(next.getDate()+1);
  end=formatDateInput(next);
 }else if(granularity==='month'){
  const month=$('#report-month').value;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Selecione o mês do relatório.');
  start=`${month}-01`;
  const [year,monthNumber]=month.split('-').map(Number);
  end=formatDateInput(new Date(year,monthNumber,1));
 }else{
  const year=Number($('#report-year').value);
  if(!Number.isInteger(year)||year<2000||year>2100)throw new Error('Informe um ano válido entre 2000 e 2100.');
  start=`${year}-01-01`;
  end=`${year+1}-01-01`;
 }
 return {granularity,start,end};
}
function formatDateInput(date){
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function localDateKey(value){
 if(/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return String(value);
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return '';
 return formatDateInput(date);
}
async function fetchAllRows(queryFactory){
 const pageSize=1000;
 const rows=[];
 for(let offset=0;;offset+=pageSize){
  const {data,error}=await queryFactory().range(offset,offset+pageSize-1);
  if(error)throw error;
  rows.push(...(data||[]));
  if(!data||data.length<pageSize)return rows;
 }
}
function filterProfileRows(role){
 const body=$(`#${role==='partner'?'partners-body':'buyers-body'}`);
 const search=$(`#${role==='partner'?'partner-search':'buyer-search'}`).value.trim().toLocaleLowerCase('pt-BR');
 let visible=0;
 body.querySelectorAll('tr[data-profile-name]').forEach(row=>{
  const matches=row.dataset.profileName.toLocaleLowerCase('pt-BR').includes(search);
  row.hidden=!matches;
  if(matches)visible++;
 });
 const count=$(`#${role==='partner'?'partner-count':'buyer-count'}`);
 count.textContent=String(visible);
}
function reportMatchesPeriod(value,granularity,start){
 if(!value)return false;
 const date=localDateKey(value);
 if(!date)return false;
 return granularity==='year'?date.startsWith(start.slice(0,4)):granularity==='month'?date.startsWith(start.slice(0,7)):date===start;
}
function renderAdminReport(){
 const data=state.adminReportData;
 if(!data)return;
 const {granularity,start}=data.range;
 const buyerTerm=$('#report-buyer-search').value.trim().toLocaleLowerCase('pt-BR');
 const partnerTerm=$('#report-partner-search').value.trim().toLocaleLowerCase('pt-BR');
 const buyerIds=new Set(data.profiles.filter(profile=>profile.role==='buyer'&&(!buyerTerm||(profile.full_name||'').toLocaleLowerCase('pt-BR').includes(buyerTerm))).map(profile=>profile.id));
 const partnerIds=new Set(data.profiles.filter(profile=>profile.role==='partner'&&(!partnerTerm||(profile.full_name||'').toLocaleLowerCase('pt-BR').includes(partnerTerm))).map(profile=>profile.id));
 const orders=data.orders.filter(item=>buyerIds.has(item.buyer_id)&&reportMatchesPeriod(item.created_at,granularity,start));
 const collections=data.collections.filter(item=>partnerIds.has(item.partner_id)&&reportMatchesPeriod(item.requested_date,granularity,start));
 const weighings=data.weighings.filter(item=>partnerIds.has(item.partner_id)&&reportMatchesPeriod(item.created_at,granularity,start));
 const oil=data.oil.filter(item=>partnerIds.has(item.partner_id)&&reportMatchesPeriod(item.created_at,granularity,start));
 const totals={
  orders:orders.length,
  collections:collections.length,
  weighings:weighings.length,
  weight:weighings.reduce((sum,item)=>sum+Number(item.total_kg||0),0),
  oil:oil.reduce((sum,item)=>sum+Number(item.liters||0),0)
 };
 $('#report-buyers-total').textContent=String(buyerIds.size);
 $('#report-partners-total').textContent=String(partnerIds.size);
 $('#report-orders-total').textContent=String(totals.orders);
 $('#report-collections-total').textContent=String(totals.collections);
 $('#report-weight-total').textContent=`${totals.weight.toLocaleString('pt-BR',{maximumFractionDigits:1})} kg`;
 $('#report-oil-total').textContent=`${totals.oil.toLocaleString('pt-BR',{maximumFractionDigits:1})} L`;
 $('#report-period-caption').textContent=granularity==='year'?`Ano ${start.slice(0,4)}`:granularity==='month'?`Mês ${start.slice(0,7)}`:`Dia ${new Date(`${start}T00:00:00`).toLocaleDateString('pt-BR')}`;
 const grouped=new Map();
 const addToGroup=(key,metric,value=1)=>{
  let group=grouped.get(key);
  if(!group){group={key,label:key,orders:0,collections:0,weighings:0,weight:0,oil:0};grouped.set(key,group)}
  group[metric]+=value;
 };
 if(granularity==='day'){
  grouped.set(start,{key:start,label:new Date(`${start}T00:00:00`).toLocaleDateString('pt-BR'),orders:0,collections:0,weighings:0,weight:0,oil:0});
 }else if(granularity==='month'){
  const [year,month]=start.split('-').map(Number);
  const days=new Date(Date.UTC(year,month,0)).getUTCDate();
  for(let day=1;day<=days;day++){
   const key=`${start.slice(0,7)}-${String(day).padStart(2,'0')}`;
   grouped.set(key,{key,label:String(day),orders:0,collections:0,weighings:0,weight:0,oil:0});
  }
 }else{
  for(let month=1;month<=12;month++){
   const key=`${start.slice(0,4)}-${String(month).padStart(2,'0')}`;
   grouped.set(key,{key,label:new Date(Date.UTC(Number(start.slice(0,4)),month-1,1)).toLocaleDateString('pt-BR',{month:'short',timeZone:'UTC'}),orders:0,collections:0,weighings:0,weight:0,oil:0});
  }
 }
 const groupKey=value=>{const date=localDateKey(value);return granularity==='year'?date.slice(0,7):granularity==='month'?date:start};
 orders.forEach(item=>addToGroup(groupKey(item.created_at),'orders'));
 collections.forEach(item=>addToGroup(groupKey(item.requested_date),'collections'));
 weighings.forEach(item=>{
  const key=groupKey(item.created_at);
  addToGroup(key,'weighings');
  const group=grouped.get(key);
  if(group)group.weight+=Number(item.total_kg||0);
 });
 oil.forEach(item=>{
  const key=groupKey(item.created_at);
  addToGroup(key,'oil');
  const group=grouped.get(key);
  if(group)group.oil+=Number(item.liters||0);
 });
 const reportRows=[...grouped.values()];
 const materialTotals=new Map();
 weighings.forEach(item=>{
  const name=item.material_name||'Material não identificado';
  materialTotals.set(name,(materialTotals.get(name)||0)+Number(item.total_kg||0));
 });
 $('#report-list').innerHTML=[...materialTotals.entries()].sort((a,b)=>b[1]-a[1]).map(([name,weight])=>`<div class="quick"><div class="metric-icon">♻</div><div style="flex:1"><strong>${escapeHtml(name)}</strong><div class="muted">${weight.toLocaleString('pt-BR',{maximumFractionDigits:1})} kg</div></div></div>`).join('')||'<div class="empty">Sem pesagens para os filtros selecionados.</div>';
 $('#report-detail-body').innerHTML=reportRows.map(row=>`<tr><td>${escapeHtml(row.label)}</td><td>${row.orders}</td><td>${row.collections}</td><td>${row.weighings}</td><td>${row.weight.toLocaleString('pt-BR',{maximumFractionDigits:1})}</td><td>${row.oil.toLocaleString('pt-BR',{maximumFractionDigits:1})}</td></tr>`).join('');
 $('#report-record-count').textContent=`${orders.length+collections.length+weighings.length+oil.length} registros`;
 renderAdminReportChart(granularity,reportRows);
}
function renderAdminReportChart(granularity,rows){
 const chart=$('#admin-report-chart');
 if(granularity==='day'){
  const row=rows[0]||{orders:0,collections:0,weighings:0};
  const items=[['Pedidos',row.orders,'orders'],['Coletas',row.collections,'collections'],['Pesagens',row.weighings,'weighings']];
  const max=Math.max(1,...items.map(([,value])=>value));
  chart.innerHTML=`<div class="admin-day-chart">${items.map(([label,value,type])=>`<div class="admin-day-chart-item"><div class="admin-day-chart-value">${value}</div><div class="admin-day-chart-track"><span class="${type}" style="height:${Math.max(value?4:0,value/max*100)}%;width:100%"></span></div><strong>${label}</strong></div>`).join('')}</div>`;
  return;
 }
 const width=960,height=300,left=42,right=14,top=18,bottom=44;
 const plotWidth=width-left-right,plotHeight=height-top-bottom;
 const max=Math.max(1,...rows.flatMap(row=>[row.orders,row.collections,row.weighings]));
 const colors={orders:'#2f80ed',collections:'#19a565',weighings:'#f2a93b'};
 const step=plotWidth/Math.max(rows.length,1);
 const barWidth=Math.max(2,Math.min(13,(step-8)/3));
 const bars=rows.flatMap((row,index)=>{
  const values=[['orders',row.orders],['collections',row.collections],['weighings',row.weighings]];
  return values.map(([type,value],series)=>{
   const barHeight=value/max*plotHeight;
   const x=left+index*step+(step-barWidth*3)/2+series*barWidth;
   const y=top+plotHeight-barHeight;
   return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1,barWidth-2).toFixed(1)}" height="${Math.max(value?2:0,barHeight).toFixed(1)}" rx="2" fill="${colors[type]}"><title>${escapeHtml(row.label)} · ${type==='orders'?'Pedidos':type==='collections'?'Coletas':'Pesagens'}: ${value}</title></rect>`;
  });
 }).join('');
 const labelStride=Math.max(1,Math.ceil(rows.length/12));
 const labels=rows.filter((_,index)=>index%labelStride===0||index===rows.length-1).map(row=>{
  const index=rows.indexOf(row);
  return `<text x="${(left+index*step+step/2).toFixed(1)}" y="${height-14}" text-anchor="middle">${escapeHtml(row.label)}</text>`;
 }).join('');
 const grid=[0,0.5,1].map(ratio=>{
  const y=top+plotHeight*(1-ratio);
  return `<line x1="${left}" y1="${y.toFixed(1)}" x2="${width-right}" y2="${y.toFixed(1)}" class="chart-grid"/><text x="${left-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${Math.round(max*ratio)}</text>`;
 }).join('');
 chart.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Atividade de pedidos, coletas e pesagens">${grid}${bars}${labels}</svg>`;
}
async function loadReports(){
 if(state.role!=='admin')return;
 const requestId=++state.adminReportRequestId;
 try{
  const range=getAdminReportRange();
  const startIso=new Date(`${range.start}T00:00:00`).toISOString();
  const endIso=new Date(`${range.end}T00:00:00`).toISOString();
  const makeQuery=(table,columns,dateColumn,isDate=false)=>()=>{let query=supabase.from(table).select(columns);query=isDate?query.gte(dateColumn,range.start).lt(dateColumn,range.end):query.gte(dateColumn,startIso).lt(dateColumn,endIso);return query.order('id',{ascending:true})};
  const [profiles,orders,collections,weighings,oil]=await Promise.all([
   fetchAllRows(()=>supabase.from('profiles').select('id,full_name,role').in('role',['buyer','partner']).order('full_name').order('id')),
   fetchAllRows(makeQuery('orders','id,buyer_id,created_at,quantity_kg,status,material_name','created_at')),
   fetchAllRows(makeQuery('collections','id,partner_id,requested_date,type,status','requested_date',true)),
   fetchAllRows(makeQuery('weighings','id,partner_id,created_at,total_kg,material_name','created_at')),
   fetchAllRows(makeQuery('oil_collections','id,partner_id,created_at,liters,status','created_at'))
  ]);
  if(requestId!==state.adminReportRequestId)return;
  state.adminReportData={range,profiles,orders,collections,weighings,oil};
  renderAdminReport();
 }catch(error){
  if(requestId!==state.adminReportRequestId)return;
  const message=error instanceof Error?error.message:String(error);
  state.adminReportData=null;
  toast(`Não foi possível carregar os relatórios: ${message}`,true);
  $('#admin-report-chart').innerHTML=`<p class="empty">Falha ao carregar o gráfico: ${escapeHtml(message)}</p>`;
 }
}
function exportAdminReport(){
 if(state.role!=='admin'||!state.adminReportData)return toast('Carregue um relatório antes de exportar.',true);
 const data=state.adminReportData;
 const profileMap=new Map(data.profiles.map(profile=>[profile.id,profile]));
 const buyerTerm=$('#report-buyer-search').value.trim().toLocaleLowerCase('pt-BR');
 const partnerTerm=$('#report-partner-search').value.trim().toLocaleLowerCase('pt-BR');
 const buyerIds=new Set(data.profiles.filter(profile=>profile.role==='buyer'&&(!buyerTerm||(profile.full_name||'').toLocaleLowerCase('pt-BR').includes(buyerTerm))).map(profile=>profile.id));
 const partnerIds=new Set(data.profiles.filter(profile=>profile.role==='partner'&&(!partnerTerm||(profile.full_name||'').toLocaleLowerCase('pt-BR').includes(partnerTerm))).map(profile=>profile.id));
 const csvRows=[['Tipo','Data','Nome','Descrição','Quantidade','Unidade','Status']];
 data.orders.filter(item=>buyerIds.has(item.buyer_id)).forEach(item=>csvRows.push(['Pedido',item.created_at,profileMap.get(item.buyer_id)?.full_name||'Comprador',item.material_name||'',item.quantity_kg,'kg',item.status]));
 data.collections.filter(item=>partnerIds.has(item.partner_id)).forEach(item=>csvRows.push(['Coleta',item.requested_date,profileMap.get(item.partner_id)?.full_name||'Parceiro',item.type||'',1,'unidade',item.status]));
 data.weighings.filter(item=>partnerIds.has(item.partner_id)).forEach(item=>csvRows.push(['Pesagem',item.created_at,profileMap.get(item.partner_id)?.full_name||'Parceiro',item.material_name||'',item.total_kg,'kg','']));
 data.oil.filter(item=>partnerIds.has(item.partner_id)).forEach(item=>csvRows.push(['Óleo',item.created_at,profileMap.get(item.partner_id)?.full_name||'Parceiro','Óleo usado',item.liters,'L',item.status]));
 const csvCell=value=>{const text=String(value??'');const safe=/^[\t\r\n ]*[=+\-@]/.test(text)?`'${text}`:text;return `"${safe.replace(/"/g,'""')}"`};
 const csv='\uFEFF'+csvRows.map(row=>row.map(csvCell).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');
 link.href=url;
 link.download='relatorio-recicladin.csv';
 document.body.append(link);
 link.click();
 link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportAdminReportPdf(){
 if(state.role!=='admin'||!state.adminReportData)return toast('Carregue um relatório antes de exportar.',true);
 try{
  const reportSection=$('#section-reports');
  const rangeCaption=$('#report-period-caption').textContent;
  const buyerFilter=$('#report-buyer-search').value.trim()||'Todos';
  const partnerFilter=$('#report-partner-search').value.trim()||'Todos';
  const metricCards=Array.from(reportSection.querySelectorAll('.admin-report-metrics .card')).map(card=>({
   label:card.querySelector('.muted')?.textContent.trim()||'',
   value:card.querySelector('.metric')?.textContent.trim()||'—'
  }));
  const chartRows=Array.from($('#report-detail-body').rows).map(row=>{
   const cells=Array.from(row.cells).map(cell=>cell.textContent.trim());
   return {label:cells[0]||'',orders:Number(cells[1])||0,collections:Number(cells[2])||0,weighings:Number(cells[3])||0,weight:cells[4]||'0',oil:cells[5]||'0'};
  });
  const materialRows=Array.from($('#report-list').querySelectorAll('.quick')).map(row=>[
   row.querySelector('strong')?.textContent.trim()||'Material',
   row.querySelector('.muted')?.textContent.trim()||'0 kg'
  ]);
  const pages=[];
  let commands=[];
  let cursor=0;
  const text=(value,x,y,size=9,bold=false,color='0.12 0.2 0.15')=>{
   const safe=String(value??'').slice(0,140);
   commands.push(`${color} rg BT /${bold?'F2':'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td <${pdfTextHex(safe)}> Tj ET`);
  };
  const rectangle=(x,y,width,height,color)=>{
   commands.push(`${color} rg ${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re f`);
  };
  const line=(x1,y1,x2,y2,color='0.86 0.9 0.87')=>{
   commands.push(`${color} RG 0.6 w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
  };
  const finishPage=()=>{if(commands.length)pages.push(commands.join('\n'));commands=[]};
  const beginPage=title=>{
   if(commands.length)finishPage();
   text('ReciclaDin | Relatorio administrativo',44,805,17,true,'0.05 0.42 0.2');
   text(title,44,783,11,true);
   line(44,773,551,773,'0.55 0.75 0.62');
   cursor=755;
  };
  beginPage('Resumo operacional');
  text(`${rangeCaption} | Comprador: ${buyerFilter} | Parceiro: ${partnerFilter}`,44,cursor,8);
  cursor-=28;
  metricCards.forEach((metric,index)=>{
   const column=index%3,row=Math.floor(index/3);
   const x=44+column*171,y=cursor-row*52;
   rectangle(x,y-14,158,43,'0.94 0.97 0.95');
   text(metric.label,x+9,y+14,8,false,'0.3 0.38 0.33');
   text(metric.value,x+9,y-4,13,true,'0.05 0.42 0.2');
  });
  const chartTop=cursor-2*52-12;
  const chartBottom=chartTop-105;
  const chartLeft=60,chartRight=540;
  const chartHeight=chartTop-chartBottom;
  const maxValue=Math.max(1,...chartRows.flatMap(row=>[row.orders,row.collections,row.weighings]));
  [0,0.5,1].forEach(ratio=>{
   const y=chartBottom+chartHeight*ratio;
   line(chartLeft,y,chartRight,y,'0.88 0.91 0.89');
   text(String(Math.round(maxValue*ratio)),44,y-3,7,false,'0.4 0.45 0.42');
  });
  const step=(chartRight-chartLeft)/Math.max(chartRows.length,1);
  const barWidth=Math.max(1,Math.min(10,(step-5)/3));
  chartRows.forEach((row,index)=>{
   const values=[['orders',row.orders,'0.18 0.5 0.93'],['collections',row.collections,'0.1 0.65 0.4'],['weighings',row.weighings,'0.95 0.62 0.15']];
   values.forEach(([key,value,color],series)=>{
    const height=value/maxValue*chartHeight;
    const x=chartLeft+index*step+(step-barWidth*3)/2+series*barWidth;
    if(height>0)rectangle(x,chartBottom,Math.max(1,barWidth-1),height,color);
   });
  });
  const labelStride=Math.max(1,Math.ceil(chartRows.length/16));
  chartRows.forEach((row,index)=>{
   if(index%labelStride===0||index===chartRows.length-1){
    const x=chartLeft+index*step+step/2-8;
    text(row.label,x,chartBottom-12,7,false,'0.35 0.4 0.37');
   }
  });
  text('Pedidos',80,chartTop+8,8,false,'0.18 0.5 0.93');
  rectangle(65,chartTop+7,8,8,'0.18 0.5 0.93');
  text('Coletas',180,chartTop+8,8,false,'0.1 0.65 0.4');
  rectangle(165,chartTop+7,8,8,'0.1 0.65 0.4');
  text('Pesagens',280,chartTop+8,8,false,'0.95 0.62 0.15');
  rectangle(265,chartTop+7,8,8,'0.95 0.62 0.15');
  beginPage('Materiais e detalhamento');
  const drawTable=(title,headers,rows,widths)=>{
   const drawHeader=()=>{
    text(title,44,cursor,12,true,'0.05 0.42 0.2');
    cursor-=22;
    let x=44;
    headers.forEach((header,index)=>{text(header,x,cursor,8,true);x+=widths[index]});
    cursor-=8;
    line(44,cursor,551,cursor,'0.55 0.75 0.62');
    cursor-=14;
   };
   drawHeader();
   rows.forEach(row=>{
    if(cursor<55){beginPage(`${title} | continuacao`);drawHeader()}
    let x=44;
    row.forEach((value,index)=>{
     text(String(value??'').slice(0,index===0?55:22),x,cursor,8);
     x+=widths[index];
    });
    line(44,cursor-4,551,cursor-4,'0.9 0.92 0.9');
    cursor-=15;
   });
   cursor-=18;
  };
  drawTable('Volume pesado por material',['Material','Quantidade registrada'],materialRows.length?materialRows:[['Nenhum material pesado no periodo','0 kg']],[300,207]);
  drawTable('Atividade por periodo',['Periodo','Pedidos','Coletas','Pesagens','Peso kg','Oleo L'],chartRows.map(row=>[row.label,row.orders,row.collections,row.weighings,row.weight,row.oil]),[105,66,66,66,102,102]);
  finishPage();
  const blob=createPdfFromStreams(pages);
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  const period=state.adminReportData.range.start.replace(/-/g,'');
  link.href=url;
  link.download=`relatorio-recicladin-${period}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  toast(`Não foi possível gerar o PDF: ${message}`,true);
 }
}
async function saveCollection(event){
 event.preventDefault();
 if(state.role!=='partner')return toast('A solicitação de coleta está disponível apenas para parceiros.',true);
 const form=event.currentTarget;
 const operation=$('#partner-collection-type').value;
 const type=operation==='oil'?'Retirada de Óleo Usado':'Retirada de Reciclagem';
 const date=$('#partner-collection-date').value;
 const period=$('#partner-collection-period').value;
 const notes=$('#partner-collection-materials').value.trim();
 const weekday=$('#partner-collection-weekday').value;
 const liters=operation==='oil'?Number($('#partner-oil-liters').value):null;
 if(!date)return toast('Escolha uma data.',true);
 if(date<new Date().toISOString().slice(0,10))return toast('A data da coleta deve ser hoje ou futura.',true);
 if(!['manha','tarde'].includes(period))return toast('Escolha o período da coleta.',true);
 if(!['recycling','oil'].includes(operation))return toast('Escolha um tipo de operação válido.',true);
 if(!/^[0-6]$/.test(weekday)||new Date(`${date}T00:00:00`).getDay()!==Number(weekday))return toast('O dia da semana deve corresponder à data escolhida.',true);
 if(operation==='oil'&&(!Number.isFinite(liters)||liters<=0))return toast('Informe a quantidade de óleo em litros.',true);
 const button=form.querySelector('button[type="submit"]');
 button.disabled=true;
 button.textContent='Enviando solicitação...';
 try{
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw new Error(`Não foi possível confirmar o usuário logado: ${userError.message}`);
  if(!user)throw new Error('Sua sessão expirou. Entre novamente para solicitar uma coleta.');
  const {data:profile,error:profileError}=await supabase.from('profiles').select('id').eq('id',user.id).maybeSingle();
  if(profileError)throw new Error(`Não foi possível confirmar o perfil do parceiro: ${profileError.message}`);
  if(!profile)throw new Error('Não foi encontrado um perfil para esta conta. Confirme o cadastro do parceiro no Supabase antes de solicitar uma coleta.');
  let table,recordId;
  if(operation==='oil'){
   const {data,error}=await supabase.from('oil_collections').insert({
    partner_id:user.id,
    liters,
    requested_date:date,
    requested_period:period,
    notes:notes||null,
    status:'solicitada'
   }).select('id').single();
   if(error)throw error;
   table='oil_collections';
   recordId=data.id;
  }else{
   const {data,error}=await supabase.from('collections').insert({
    partner_id:user.id,
    type,
    requested_date:date,
    requested_period:period,
    notes:notes||null,
    status:'solicitada'
   }).select('id').single();
   if(error)throw error;
   table='collections';
   recordId=data.id;
  }
  form.reset();
  $('#partner-oil-quantity-field').hidden=true;
  $('#partner-oil-liters').required=false;
  let notificationError;
  try{
   ({error:notificationError}=await supabase.functions.invoke('notify-collection-request',{
    body:{operation:table==='oil_collections'?'oil':'recycling',record_id:recordId}
   }));
  }catch(error){
   notificationError=error;
  }
  if(notificationError){
   toast(`Agendamento salvo, mas o alerta por e-mail não foi enviado: ${notificationError.message||notificationError}. Avise a equipe ReciclaDin.`,true);
  }else{
   toast('Agendamento salvo e alerta enviado à equipe ReciclaDin.');
  }
  try{
   await Promise.all([loadCollections(),loadDashboard()]);
  }catch(error){
   toast(`Agendamento salvo, mas não foi possível atualizar os painéis: ${error.message||error}`,true);
  }
 }catch(error){
  toast(`Não foi possível salvar a solicitação: ${error.message||'erro desconhecido'}`,true);
 }finally{
  button.disabled=false;
  button.innerHTML='Solicitar Agendamento <span aria-hidden="true">→</span>';
 }
}
async function saveOil(){
 const quantidade=Number($('#oil-liters').value);
 if(!Number.isFinite(quantidade)||quantidade<=0)return toast('Informe uma quantidade válida em litros.',true);
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)return toast(`Não foi possível confirmar o usuário logado: ${userError.message}`,true);
 if(!user)return toast('Faça login para registrar a coleta de óleo.',true);
 const {error}=await supabase.from('oil_collections').insert({partner_id:user.id,liters:quantidade,status:'Pendente'});
 if(error)toast(`Erro ao salvar: ${error.message}`,true);
 else{toast('Coleta cadastrada com sucesso!');$('#oil-modal').classList.add('hidden');}
}
async function saveProfile(){
 const avatarUrl=$('#profile-avatar-url').value.trim();
 const backgroundUrl=$('#profile-background-url').value.trim();
 if(avatarUrl&&!safeHttpUrl(avatarUrl))return toast('A URL da foto deve começar com http:// ou https://.',true);
 if(backgroundUrl&&!safeHttpUrl(backgroundUrl))return toast('A URL da imagem de fundo deve começar com http:// ou https://.',true);
 const payload={
  full_name:$('#profile-name').value.trim(),
  avatar_url:avatarUrl||null,
  background_url:backgroundUrl||null
 };
 if(state.role!=='partner'&&state.role!=='buyer')payload.cpf=$('#profile-cpf').value.trim()||null;
 const {error}=await supabase.from('profiles').update(payload).eq('id',state.profile.id);
 if(error)return toast(error.message,true);
 Object.assign(state.profile,payload);
 $('#user-name').textContent=payload.full_name;
 $('#user-name-copy').textContent=(payload.full_name||'você').split(' ')[0];
 $('#avatar').textContent=initials(payload.full_name);
 await renderProfileImages(state.profile);
 toast('Perfil atualizado.');
}
async function deactivateAccount(){
 if(!state.profile?.id||state.profile.is_active===false)return;
 if(!confirm('Desativar sua conta? Você será desconectado e somente o administrador poderá reativá-la.'))return;
 const button=$('#toggle-account-active');
 button.disabled=true;
 try{
  const {data,error}=await supabase.from('profiles').update({is_active:false}).eq('id',state.profile.id).select('id,is_active').maybeSingle();
  if(error)throw error;
  if(!data)throw new Error('A conta não foi desativada. Atualize a página e tente novamente.');
 }catch(error){
  button.disabled=false;
  toast(`Não foi possível desativar a conta: ${error.message||error}`,true);
  return;
 }
 state.profile.is_active=false;
 const {error:signOutError}=await supabase.auth.signOut();
 location.replace(`login.html?account=deactivated${signOutError?'&signout=failed':''}`);
}
async function saveNotificationPreferences(){
 if(!state.session?.id)return toast('Faça login novamente para salvar suas preferências.',true);
 const button=$('#notification-form button[type="submit"]');
 button.disabled=true;
 button.textContent='Salvando...';
 const payload={
  channel_email:$('#channel-email').checked,
  channel_whatsapp:$('#channel-whatsapp').checked,
  notification_frequency:$('#notification-frequency').value
 };
 try{
  const {data,error}=await supabase.from('profiles').update(payload).eq('id',state.session.id).select('id').maybeSingle();
  if(error)return toast(`Não foi possível salvar as preferências: ${error.message}`,true);
  if(!data)return toast('Nenhum perfil foi atualizado. Verifique se o perfil existe e se a política RLS permite a alteração.',true);
  Object.assign(state.profile,payload);
  $('#notification-form .notification-status').textContent='Preferências salvas.';
  toast('Preferências de notificação salvas.');
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  toast(`Não foi possível salvar as preferências: ${message}`,true);
 }finally{
  button.disabled=false;
  button.textContent='Salvar preferências';
 }
}
function bind(){
 addLegalPdfButtons();
 const today=new Date();
 $('#report-year').value=String(today.getFullYear());
 $('#report-month').value=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
 $('#report-day').value=formatDateInput(today);
 const syncReportPeriod=()=>{
  const granularity=$('#report-granularity').value;
  $('#report-year-filter').hidden=granularity!=='year';
  $('#report-month-filter').hidden=granularity!=='month';
  $('#report-day-filter').hidden=granularity!=='day';
  loadReports();
 };
 $('#report-granularity').addEventListener('change',syncReportPeriod);
 ['#report-year','#report-month','#report-day'].forEach(selector=>$(selector).addEventListener('change',loadReports));
 ['#report-buyer-search','#report-partner-search'].forEach(selector=>$(selector).addEventListener('input',renderAdminReport));
 $('#partner-search').addEventListener('input',()=>filterProfileRows('partner'));
 $('#buyer-search').addEventListener('input',()=>filterProfileRows('buyer'));
 $('#export-admin-report').addEventListener('click',exportAdminReport);
 const pdfButton=document.createElement('button');
 pdfButton.id='export-admin-report-pdf';
 pdfButton.className='btn btn-ghost';
 pdfButton.type='button';
 pdfButton.style.width='auto';
 pdfButton.textContent='Baixar PDF';
 pdfButton.setAttribute('aria-label','Baixar relatório administrativo em PDF');
 pdfButton.addEventListener('click',exportAdminReportPdf);
 $('#export-admin-report').insertAdjacentElement('afterend',pdfButton);
 $('#logout').onclick=async()=>{await supabase.auth.signOut();location.href='login.html'};
 const todayForCollection=formatDateInput(new Date());
 $('#partner-collection-date').min=todayForCollection;
 $('#partner-schedule-form').addEventListener('submit',saveCollection);
 $('#new-collection').addEventListener('click',openCollectionRequest);
 $('#partner-schedule-open').addEventListener('click',openCollectionRequest);
 $('#open-collection').addEventListener('click',openCollectionRequest);
 $('#partner-collection-type').addEventListener('change',()=>{
  const oilSelected=$('#partner-collection-type').value==='oil';
  $('#partner-oil-quantity-field').hidden=!oilSelected;
  $('#partner-oil-liters').required=oilSelected;
 });
 $('#partner-collection-date').addEventListener('change',event=>{
  if(!event.currentTarget.value)return;
  const date=new Date(`${event.currentTarget.value}T00:00:00`);
  $('#partner-collection-weekday').value=String(date.getDay());
 });
 $('#open-oil').onclick=()=>$('#oil-modal').classList.remove('hidden');$('#close-oil').onclick=()=>$('#oil-modal').classList.add('hidden');$('#save-oil').onclick=saveOil;
 $('#benefits-list').addEventListener('click',event=>{const target=event.target;if(!(target instanceof Element))return;const button=target.closest('.benefit-redeem');if(button)redeemBenefit(Number(button.dataset.benefitId),button)});
 $('#profile-form').onsubmit=e=>{e.preventDefault();saveProfile()};
 $('#change-password').onclick=()=>location.href='recuperar.html';
 $('#theme-toggle-2').onclick=()=>$('#theme-toggle').click();
 $('#theme-toggle').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';localStorage.setItem('rd_theme',state.theme);document.body.dataset.theme=state.theme;toast(state.theme==='dark'?'Modo escuro ativado':'Modo claro ativado')};
 $('#font-size').onchange=e=>{document.documentElement.style.fontSize=e.target.value};
 $('#toggle-account-active').addEventListener('click',deactivateAccount);
 $('#support-form').onsubmit=e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const [subjectField,messageField]=form.querySelectorAll('input,textarea');
  const subject=subjectField.value.trim();
  const message=messageField.value.trim();
  if(!subject||!message)return toast('Preencha o assunto e a mensagem.',true);
  const text=[
   'Olá, equipe ReciclaDin!',
   `Nome: ${state.profile?.full_name||'Usuário'}`,
   `Assunto: ${subject}`,
   `Mensagem: ${message}`
  ].join('\n');
  const link=document.createElement('a');
  link.href=`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.click();
  toast('Conversa preparada no WhatsApp. Toque em Enviar para encaminhar a mensagem.');
 };
 $$('.star').forEach(s=>s.onclick=()=>{
  $$('.star').forEach(x=>x.classList.toggle('selected',x.dataset.value<=s.dataset.value));
  $('#rating-value').value=s.dataset.value;
 });
 $('#rating-form').onsubmit=async e=>{
  e.preventDefault();
  const rating=Number($('#rating-value').value);
  if(!Number.isInteger(rating)||rating<1||rating>5)return toast('Escolha uma nota de 1 a 5 estrelas.',true);
  if(!isRatingEmailConfigured())return toast('Configure o EmailJS conforme o README_WEB.md para enviar avaliações.',true);
  const form=e.currentTarget;
  const submit=form.querySelector('button[type="submit"]');
  submit.disabled=true;
  submit.textContent='Enviando...';
  try{
   await sendRatingEmail({
    name:state.profile?.full_name||'Usuário',
    email:state.session?.user?.email||'',
    profile:state.profile?.full_name||'Usuário',
    rating:`${rating} estrelas`,
    comment:$('#rating-comment').value.trim(),
    time:new Date().toLocaleString('pt-BR'),
    message:$('#rating-comment').value.trim()
   });
   form.reset();
   $('#rating-value').value='0';
   $$('.star').forEach(star=>star.classList.remove('selected'));
   toast('Avaliação enviada. Obrigado!');
  }catch(error){
   console.error('Falha ao enviar avaliação:',error);
   toast(error.message||'Não foi possível enviar sua avaliação. Tente novamente mais tarde.',true);
  }finally{
   submit.disabled=false;
   submit.textContent='Enviar avaliação';
  }
 };
}
if(!isSupabaseConfigured()){showAppTransitionError('Configure o acesso ao serviço para abrir a plataforma.')}
bind();loadProfile();
