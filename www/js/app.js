import { supabase, isSupabaseConfigured } from './supabase.js';

const state={session:null,profile:null,role:'partner',walletBalance:null,theme:localStorage.getItem('rd_theme')||'light'};
const SUPPORT_WHATSAPP_NUMBER='5511947630273';
const WIN_ANSI_SPECIALS={8364:128,8218:130,402:131,8222:132,8230:133,8224:134,8225:135,710:136,8240:137,352:138,8249:139,338:140,381:142,8216:145,8217:146,8220:147,8221:148,8226:149,8211:150,8212:151,732:152,8482:153,353:154,8250:155,339:156,382:158,376:159};
const $=s=>document.querySelector(s); const $$=s=>document.querySelectorAll(s);
function toast(msg,error=false){const t=$('#toast');t.textContent=msg;t.className='toast'+(error?' error':'');t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3500)}
function showRatingEmailFallback({rating,comment}){
 const notification=$('#toast');
 notification.textContent='O envio automático ainda não está ativo. Revise a avaliação no seu e-mail e toque em Enviar: ';
 notification.className='toast error';
 const link=document.createElement('a');
 const name=state.profile?.full_name||'Usuário';
 const email=state.session?.user?.email||'';
 const profile=state.role==='partner'?'Parceiro':'Comprador';
 const body=[
  'Nova avaliação do aplicativo ReciclaDin',
  '',
  `Nome: ${name}`,
  `E-mail: ${email}`,
  `Perfil: ${profile}`,
  `Nota: ${rating}/5`,
  '',
  'Comentário:',
  comment||'(sem comentário)'
 ].join('\n');
 link.href=`mailto:recicladin01@gmail.com?subject=${encodeURIComponent(`Nova avaliação ReciclaDin (${rating}/5)`)}&body=${encodeURIComponent(body)}`;
 link.textContent='Abrir e-mail';
 link.rel='noopener noreferrer';
 notification.append(link);
 notification.classList.remove('hidden');
 clearTimeout(notification.hideTimeout);
 notification.hideTimeout=setTimeout(()=>notification.classList.add('hidden'),12000);
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
 const objects=[null];
 const pageRefs=pages.map((_,index)=>5+index*2);
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objects[2]=`<< /Type /Pages /Kids [${pageRefs.map(id=>`${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
 objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
 pages.forEach((lines,index)=>{
  const pageId=pageRefs[index];
  const contentId=pageId+1;
  const stream=lines.join('\n');
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
function initials(name='ReciclaDin'){return name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function formatPoints(value){return Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}
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
 const {data:{user}}=await supabase.auth.getUser(); state.session=user; if(!user){location.href='login.html';return;}
 let {data:profile,error:profileError}=await supabase.from('profiles').select('id,full_name,cpf,avatar_url,background_url,channel_email,channel_whatsapp,notification_frequency,accepted_terms_at,role').eq('id',user.id).maybeSingle();
 if(profileError){toast(`Não foi possível carregar as preferências do perfil: ${profileError.message}`,true);return}
 if(!profile){profile={id:user.id,full_name:user.user_metadata?.full_name||user.email?.split('@')[0]||'Usuário',role:user.user_metadata?.role||'partner',email:user.email};}
 state.profile=profile;state.role=profile.role||'partner';
 addProfileControls();
 $('#user-name').textContent=profile.full_name||'Usuário';$('#user-name-copy').textContent=(profile.full_name||'você').split(' ')[0];$('#user-role').textContent=roleName(state.role);$('#avatar').textContent=initials(profile.full_name);$('#profile-name').value=profile.full_name||'';$('#profile-email').value=user.email||'';if($('#profile-cpf'))$('#profile-cpf').value=profile.cpf||'';$('#profile-avatar-url').value=profile.avatar_url||'';$('#profile-background-url').value=profile.background_url||'';
 $('#channel-email').checked=profile.channel_email??true;
 $('#channel-whatsapp').checked=profile.channel_whatsapp??false;
 const legacyFrequencies={event:'por_evento',daily:'diario',scheduled:'programado'};
 const savedFrequency=legacyFrequencies[profile.notification_frequency]||profile.notification_frequency;
 $('#notification-frequency').value=['por_evento','diario','programado'].includes(savedFrequency)?savedFrequency:'por_evento';
 $('#notification-form').querySelectorAll('input,select,button').forEach(control=>control.disabled=false);
 $('#notification-form').closest('.notification-panel').setAttribute('aria-busy','false');
 $('#notification-form .notification-status').textContent='Preferências carregadas.';
 renderProfileImages(profile);
 renderRole(); await Promise.all([loadDashboard(),loadWalletAndBenefits()]);
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
 $$('.role-label').forEach(e=>e.textContent=roleName(state.role));
 const canRequestCollection=state.role==='partner';
 ['#new-collection','#open-collection'].forEach(selector=>{
  const button=$(selector);
  if(button)button.hidden=!canRequestCollection;
 });
 const nav=$('#nav');nav.innerHTML='';
 const common=[['dashboard','⌂','Visão geral'],['materials','♻','Materiais'],['collections','🚛','Coletas'],['weighings','⚖','Pesagens'],['oil','🛢','Óleo'],['points','★','Pontos Verdes'],['benefits','🎁','Benefícios'],['impact','🌱','Impacto'],['history','☷','Histórico'],['account','●','Minha conta'],['support','?','Ajuda e suporte']];
 const buyer=[['dashboard','⌂','Visão geral'],['materials','♻','Materiais disponíveis'],['collections','🛒','Minhas compras'],['history','☷','Histórico'],['account','●','Minha conta'],['support','?','Ajuda e suporte']];
 const admin=[['dashboard','⌂','Dashboard'],['partners','◉','Parceiros'],['materials','♻','Materiais'],['collections','🚛','Coletas'],['weighings','⚖','Pesagens'],['oil','🛢','Óleo'],['reports','▥','Relatórios'],['account','●','Minha conta'],['support','?','Ajuda e suporte']];
 (state.role==='buyer'?buyer:state.role==='admin'?admin:common).forEach(([id,icon,label])=>{const b=document.createElement('button');b.className='nav-item';b.dataset.section=id;b.innerHTML=`<b>${icon}</b><span>${label}</span>`;b.onclick=()=>showSection(id);nav.appendChild(b)});
 $('#mobile-nav').innerHTML='';[['dashboard','⌂'],['collections','🚛'],['points','★'],['account','●'],['support','?']].forEach(([id,icon])=>{const b=document.createElement('button');b.dataset.section=id;b.innerHTML=`<b>${icon}</b><span>${id==='dashboard'?'Início':id==='collections'?'Coletas':id==='points'?'Pontos':id==='account'?'Conta':'Ajuda'}</span>`;b.onclick=()=>showSection(id);$('#mobile-nav').appendChild(b)});
 showSection('dashboard');
}
function showSection(id){$$('.section').forEach(s=>s.classList.toggle('active',s.id==='section-'+id));$$('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===id));$('#page-title').textContent=document.querySelector(`[data-section="${id}"] span`)?.textContent||'ReciclaDin';window.scrollTo({top:0,behavior:'smooth'}); if(id==='history')loadHistory();if(id==='materials')loadMaterials();if(id==='reports')loadReports();if(id==='collections')loadCollections();if(id==='points'||id==='benefits')loadWalletAndBenefits();}
async function loadDashboard(){
 let totalKg=0,totalPoints=0,collections=0;
 if(state.role==='partner'){
  const {data}=await supabase.from('weighings').select('total_kg,points').eq('partner_id',state.profile.id);(data||[]).forEach(x=>{totalKg+=Number(x.total_kg||0);totalPoints+=Number(x.points||0)});const c=await supabase.from('collections').select('id',{count:'exact',head:true}).eq('partner_id',state.profile.id);collections=c.count||0;
 } else if(state.role==='admin'){const w=await supabase.from('weighings').select('total_kg,points');(w.data||[]).forEach(x=>{totalKg+=Number(x.total_kg||0);totalPoints+=Number(x.points||0)});const c=await supabase.from('collections').select('id',{count:'exact',head:true});collections=c.count||0;
 } else {const o=await supabase.from('orders').select('id',{count:'exact',head:true}).eq('buyer_id',state.profile.id);collections=o.count||0;}
 $('#metric-kg').textContent=totalKg.toFixed(1)+' kg';$('#metric-points').textContent=Math.round(totalPoints).toLocaleString('pt-BR');$('#metric-collections').textContent=collections;
}
async function loadMaterials(){const {data,error}=await supabase.from('materials').select('*').order('name');const body=$('#materials-body');if(error){body.innerHTML=`<tr><td colspan="4">${error.message}</td></tr>`;return}body.innerHTML=(data||[]).map(m=>`<tr><td>${m.name}</td><td>${m.unit}</td><td>R$ ${Number(m.reference_price||0).toFixed(2)}</td><td><span class="pill">Ativo</span></td></tr>`).join('')||'<tr><td colspan="4">Nenhum material cadastrado.</td></tr>';}
async function loadWalletAndBenefits(){
 const benefitsList=$('#benefits-list');
 const redemptionBody=$('#redemptions-body');
 if(state.role!=='partner'){
  state.walletBalance=0;
  $('#wallet-value').textContent='0 pontos';
  $('#points-big').textContent='0';
  $('#benefits-balance').textContent='0';
  benefitsList.innerHTML='<div class="empty">A carteira e os resgates estão disponíveis para parceiros.</div>';
  redemptionBody.innerHTML='<tr><td colspan="4">Disponível para parceiros.</td></tr>';
  return;
 }

 const [walletResult,benefitsResult,redemptionsResult]=await Promise.all([
  supabase.from('green_wallet').select('points_balance').eq('partner_id',state.profile.id).maybeSingle(),
  supabase.from('benefits').select('id,name,description,points_cost').eq('active',true).order('points_cost'),
  supabase.from('benefit_redemptions').select('id,benefit_id,points_used,status,created_at').eq('partner_id',state.profile.id).order('created_at',{ascending:false}).limit(20)
 ]);

 if(walletResult.error){
  state.walletBalance=null;
  toast(`Não foi possível carregar a Carteira Verde: ${walletResult.error.message}`,true);
 }else{
  state.walletBalance=Number(walletResult.data?.points_balance||0);
 }
 const pointsText=state.walletBalance===null?'—':formatPoints(state.walletBalance);
 $('#wallet-value').textContent=`${pointsText} pontos`;
 $('#points-big').textContent=pointsText;
 $('#benefits-balance').textContent=pointsText;

 if(benefitsResult.error){
  benefitsList.innerHTML=`<div class="empty">Não foi possível carregar os benefícios: ${escapeHtml(benefitsResult.error.message)}</div>`;
  toast(`Não foi possível carregar os benefícios: ${benefitsResult.error.message}`,true);
 }else{
  benefitsList.innerHTML=(benefitsResult.data||[]).map(benefit=>`
   <article class="card benefit-card">
    <div class="metric-icon">🎁</div>
    <h3>${escapeHtml(benefit.name)}</h3>
    <p class="muted">${escapeHtml(benefit.description||'Benefício disponível para resgate.')}</p>
    <div class="benefit-footer"><span class="pill">${formatPoints(benefit.points_cost)} pontos</span>
     <button class="btn btn-green benefit-redeem" type="button" data-benefit-id="${Number(benefit.id)}" ${state.walletBalance===null||state.walletBalance<Number(benefit.points_cost)?'disabled':''}>Resgatar</button>
    </div>
   </article>`).join('')||'<div class="empty">Nenhum benefício disponível no momento.</div>';
 }

 if(redemptionsResult.error){
  redemptionBody.innerHTML=`<tr><td colspan="4">Não foi possível carregar os resgates: ${escapeHtml(redemptionsResult.error.message)}</td></tr>`;
  toast(`Não foi possível carregar os resgates: ${redemptionsResult.error.message}`,true);
 }else{
  const redemptions=redemptionsResult.data||[];
  const benefitIds=[...new Set(redemptions.map(item=>item.benefit_id))];
  let benefitsById={};
  if(benefitIds.length){
   const {data,error}=await supabase.from('benefits').select('id,name').in('id',benefitIds);
   if(error){
    toast(`Não foi possível identificar os benefícios resgatados: ${error.message}`,true);
   }else{
    benefitsById=Object.fromEntries((data||[]).map(benefit=>[benefit.id,benefit.name]));
   }
  }
  redemptionBody.innerHTML=redemptions.map(item=>`<tr><td>${new Date(item.created_at).toLocaleDateString('pt-BR')}</td><td>${escapeHtml(benefitsById[item.benefit_id]||`Benefício #${item.benefit_id}`)}</td><td>${formatPoints(item.points_used)}</td><td><span class="pill">${escapeHtml(item.status)}</span></td></tr>`).join('')||'<tr><td colspan="4">Você ainda não fez resgates.</td></tr>';
 }
}
async function redeemBenefit(benefitId,button){
 if(state.role!=='partner')return toast('Somente parceiros podem resgatar benefícios.',true);
 if(!Number.isSafeInteger(benefitId)||benefitId<1)return toast('Benefício inválido.',true);
 if(!confirm('Deseja confirmar o resgate deste benefício?'))return;
 button.disabled=true;
 try{
  const {error}=await supabase.rpc('redeem_benefit',{p_benefit_id:benefitId});
  if(error)throw error;
  toast('Resgate realizado com sucesso!');
  await loadWalletAndBenefits();
 }catch(error){
  toast(`Não foi possível resgatar o benefício: ${error.message||'erro desconhecido'}`,true);
 }finally{
  button.disabled=false;
 }
}
async function loadCollections(){const q=state.role==='partner'?supabase.from('collections').select('*').eq('partner_id',state.profile.id).order('created_at',{ascending:false}):supabase.from('collections').select('*').order('created_at',{ascending:false});const {data,error}=await q;$('#collections-body').innerHTML=error?`<tr><td colspan="5">${error.message}</td></tr>`:(data||[]).map(c=>`<tr><td>${new Date(c.created_at).toLocaleDateString('pt-BR')}</td><td>${c.type}</td><td>${c.requested_date||'—'}</td><td>${c.status}</td><td><span class="pill">${c.status}</span></td></tr>`).join('')||'<tr><td colspan="5">Nenhuma coleta registrada.</td></tr>';}
async function loadHistory(){let q=supabase.from('collections').select('created_at,type,status,notes').order('created_at',{ascending:false}).limit(30);if(state.role==='partner')q=q.eq('partner_id',state.profile.id);const {data,error}=await q;$('#history-body').innerHTML=error?`<tr><td colspan="4">${error.message}</td></tr>`:(data||[]).map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString('pt-BR')}</td><td>${x.type}</td><td>${x.status}</td><td>${x.notes||'—'}</td></tr>`).join('')||'<tr><td colspan="4">Sem histórico.</td></tr>';}
async function loadReports(){const {data}=await supabase.from('weighings').select('material_name,total_kg,points');const map={};(data||[]).forEach(x=>{map[x.material_name]=(map[x.material_name]||0)+Number(x.total_kg||0)});$('#report-list').innerHTML=Object.entries(map).map(([n,v])=>`<div class="quick"><div class="metric-icon">♻</div><div style="flex:1"><strong>${n}</strong><div class="muted">${v.toFixed(1)} kg</div></div></div>`).join('')||'<div class="empty">Ainda não há pesagens suficientes para o relatório.</div>';}
async function saveCollection(){
 if(state.role!=='partner')return toast('A solicitação de coleta está disponível apenas para parceiros.',true);
 const type=$('#collection-type').value,date=$('#collection-date').value,notes=$('#collection-notes').value;
 if(!date)return toast('Escolha uma data.',true);
 const {error}=await supabase.from('collections').insert({partner_id:state.profile.id,type,requested_date:date,notes,status:'solicitada'});
 if(error){
  const message=error.code==='42501'
   ?'O Supabase bloqueou a gravação por RLS. Confirme se seu perfil está como partner e se a política collections_insert está aplicada.'
   :error.message;
  return toast(`Não foi possível solicitar a coleta: ${message}`,true);
 }
 toast('Coleta solicitada com sucesso!');
 $('#collection-modal').classList.add('hidden');
 loadCollections();
 loadDashboard();
}
async function saveOil(){const liters=Number($('#oil-liters').value);if(!liters)return toast('Informe a quantidade em litros.',true);const {error}=await supabase.from('oil_collections').insert({partner_id:state.profile.id,liters,status:'registrado'});if(error)toast(error.message,true);else{toast('Registro de óleo salvo.');$('#oil-modal').classList.add('hidden');}}
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
 $('#logout').onclick=async()=>{await supabase.auth.signOut();location.href='login.html'};
 $('#open-collection').onclick=()=>$('#collection-modal').classList.remove('hidden');$('#close-collection').onclick=()=>$('#collection-modal').classList.add('hidden');$('#save-collection').onclick=saveCollection;
 $('#open-oil').onclick=()=>$('#oil-modal').classList.remove('hidden');$('#close-oil').onclick=()=>$('#oil-modal').classList.add('hidden');$('#save-oil').onclick=saveOil;
 $('#benefits-list').addEventListener('click',event=>{const button=event.target.closest('.benefit-redeem');if(button)redeemBenefit(Number(button.dataset.benefitId),button)});
 $('#profile-form').onsubmit=e=>{e.preventDefault();saveProfile()};
 $('#change-password').onclick=()=>location.href='recuperar.html';
 $('#theme-toggle-2').onclick=()=>$('#theme-toggle').click();
 $('#theme-toggle').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';localStorage.setItem('rd_theme',state.theme);document.body.dataset.theme=state.theme;toast(state.theme==='dark'?'Modo escuro ativado':'Modo claro ativado')};
 $('#font-size').onchange=e=>{document.documentElement.style.fontSize=e.target.value};
 $('#delete-account').onclick=()=>{if(confirm('Deseja realmente solicitar a exclusão da conta? Esta ação exige confirmação segura.'))toast('Solicitação registrada. Para exclusão definitiva, implemente a Edge Function administrativa no Supabase.',true)};
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
  const form=e.currentTarget;
  const submit=form.querySelector('button[type="submit"]');
  submit.disabled=true;
  submit.textContent='Enviando...';
  try{
   const {error}=await supabase.functions.invoke('send-rating-email',{
    body:{rating,comment:$('#rating-comment').value.trim()}
   });
   if(error)throw error;
   form.reset();
   $('#rating-value').value='0';
   $$('.star').forEach(star=>star.classList.remove('selected'));
   toast('Avaliação enviada. Obrigado!');
  }catch(error){
   console.error('Falha ao enviar avaliação:',error);
   if(error?.context?.status===404){
    showRatingEmailFallback({rating,comment:$('#rating-comment').value.trim()});
    return;
   }
   toast('Não foi possível enviar sua avaliação. Tente novamente mais tarde.',true);
  }finally{
   submit.disabled=false;
   submit.textContent='Enviar avaliação';
  }
 };
 $('#new-collection').onclick=()=>showSection('collections');
}
if(!isSupabaseConfigured()){toast('Configure a Publishable Key em js/supabase.js.',true)}
bind();loadProfile();
