import { supabase, isSupabaseConfigured } from '../js/supabase.js';
import autoTable from 'jspdf-autotable';

const $ = selector => document.querySelector(selector);
const state = { user: null, profile: null, materials: [], partners: [], buyers: [], benefits: [], report: null, profileHistory: null, profileRequest: 0, reportRequest: 0, monitorChannel: null, monitorLive: false, monitorTimer: null, monitorTimeout: null, walletTimeout: null };
const collectionStatuses = [
  ['solicitada', 'Solicitada'],
  ['confirmada', 'Confirmada'],
  ['em_andamento', 'Em andamento'],
  ['concluida', 'Concluída'],
  ['cancelada', 'Cancelada']
];
let toastTimer;
let benefitPreviewUrl;

function toast(message, isError = false) {
  const element = $('#admin-toast');
  element.textContent = message;
  element.classList.toggle('error', isError);
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 4500);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function formatNumber(value, maximumFractionDigits = 1) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits });
}

function normalizeCollectionStatus(status) {
  const value = String(status || 'solicitada').trim().toLocaleLowerCase('pt-BR');
  const legacyStatuses = {
    solicitado: 'solicitada',
    pendente: 'solicitada',
    confirmado: 'confirmada',
    concluido: 'concluida',
    cancelado: 'cancelada'
  };
  return legacyStatuses[value] || value;
}

function collectionStatusLabel(status) {
  const value = normalizeCollectionStatus(status);
  return collectionStatuses.find(([key]) => key === value)?.[1] || String(status || 'Solicitada');
}

function dateKey(value) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

function dateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function reportRange() {
  const mode = $('#report-period').value;
  if (mode === 'day') {
    const start = $('#report-day').value;
    if (!start) throw new Error('Escolha o dia para o relatório.');
    const next = new Date(`${start}T00:00:00`);
    next.setDate(next.getDate() + 1);
    return { mode, start, end: dateInputValue(next) };
  }
  if (mode === 'month') {
    const month = $('#report-month').value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Escolha o mês para o relatório.');
    const [year, monthNumber] = month.split('-').map(Number);
    return { mode, start: `${month}-01`, end: dateInputValue(new Date(year, monthNumber, 1)) };
  }
  const year = Number($('#report-year').value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Informe um ano válido.');
  return { mode, start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

async function fetchAll(queryFactory) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await queryFactory().range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function initialize() {
  if (!isSupabaseConfigured()) throw new Error('O Supabase não está configurado.');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) {
    window.location.replace('../pages/admin-login.html');
    return;
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('id,full_name,role').eq('id', user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== 'admin') {
    window.location.replace('../pages/app.html');
    return;
  }
  state.user = user;
  state.profile = profile;
  const name = profile.full_name?.trim() || 'ReciclaDin';
  $('#admin-user-name').textContent = name;
  $('#admin-first-name').textContent = 'ReciclaDin';
  bind();
  await Promise.all([loadOverview(), loadPeople(), loadMaterials()]);
  await loadOperations();
  subscribeToOperations();
}

function bind() {
  const today = new Date();
  $('#report-year').value = String(today.getFullYear());
  $('#report-month').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  $('#report-day').value = dateInputValue(today);
  document.querySelectorAll('.admin-nav [data-section]').forEach(button => {
    button.addEventListener('click', () => showSection(button.dataset.section));
  });
  document.querySelectorAll('[data-open-section]').forEach(button => {
    button.addEventListener('click', () => showSection(button.dataset.openSection));
  });
  $('#admin-logout').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return toast(`Não foi possível sair: ${error.message}`, true);
    window.location.replace('../index.html');
  });
  $('#refresh-overview').addEventListener('click', loadOverview);
  $('#refresh-operations').addEventListener('click', loadOperations);
  $('#refresh-collections').addEventListener('click', loadCollectionRequests);
  $('#admin-collections-body').addEventListener('change', event => {
    if (!(event.target instanceof HTMLSelectElement) || !event.target.matches('[data-collection-status]')) return;
    updateCollectionRequestStatus(event.target);
  });
  $('#refresh-wallet').addEventListener('click', loadWallets);
  $('#wallet-partner-search').addEventListener('input', filterWallets);
  $('#material-form').addEventListener('submit', saveMaterial);
  $('#admin-order-form').addEventListener('submit', saveAdminOrder);
  $('#order-material').addEventListener('change', updateAdminOrderPrice);
  ['#order-quantity', '#order-price'].forEach(selector => $(selector).addEventListener('input', updateAdminOrderTotal));
  $('#materials-body').addEventListener('click', handleMaterialAction);
  $('#benefit-form').addEventListener('submit', saveBenefit);
  $('#benefits-body').addEventListener('click', handleBenefitAction);
  $('#benefit-image').addEventListener('change', previewBenefitImage);
  $('#operations-body').addEventListener('click', event => {
    const button = event.target.closest('[data-delete-table]');
    if (button) deleteOperationRecord(button);
  });
  $('#manual-weighing-form').addEventListener('submit', saveManualWeighing);
  ['#manual-weight', '#manual-price'].forEach(selector => $(selector).addEventListener('input', updateManualTotal));
  $('#manual-material').addEventListener('change', syncManualMaterialPrice);
  $('#partner-search').addEventListener('input', () => filterPeople('partner'));
  $('#buyer-search').addEventListener('input', () => filterPeople('buyer'));
  $('#admin-people').addEventListener('click', event => {
    const activeButton = event.target.closest('[data-toggle-profile-active]');
    if (activeButton) {
      updateProfileActiveStatus(activeButton);
      return;
    }
    const profileButton = event.target.closest('[data-profile-id]');
    if (profileButton) openProfileDetail(profileButton.dataset.profileId, profileButton.dataset.profileRole);
  });
  $('#profile-records-body').addEventListener('click', event => {
    const button = event.target.closest('[data-delete-profile-record]');
    if (button) deleteProfileRecord(button);
  });
  $('#profile-back').addEventListener('click', () => showSection('people'));
  $('#profile-export-pdf').addEventListener('click', exportProfilePdf);
  ['#profile-filter-year', '#profile-filter-month', '#profile-filter-week'].forEach(selector => $(selector).addEventListener('change', event => {
    if (event.currentTarget.id !== 'profile-filter-week') updateProfileFilterOptions();
    loadProfileHistory();
  }));
  const syncRange = () => {
    const mode = $('#report-period').value;
    $('#year-filter').hidden = mode !== 'year';
    $('#month-filter').hidden = mode !== 'month';
    $('#day-filter').hidden = mode !== 'day';
    loadReport();
  };
  $('#report-period').addEventListener('change', syncRange);
  ['#report-year', '#report-month', '#report-day'].forEach(selector => $(selector).addEventListener('change', loadReport));
  ['#report-buyer', '#report-partner'].forEach(selector => $(selector).addEventListener('input', renderReport));
  $('#export-pdf').addEventListener('click', exportReportPdf);
}

function showSection(section) {
  if (section !== 'profile' && state.profileHistory) state.profileRequest++;
  document.querySelectorAll('.admin-view').forEach(view => view.classList.toggle('active', view.id === `admin-${section}`));
  document.querySelectorAll('.admin-nav [data-section]').forEach(button => button.classList.toggle('active', button.dataset.section === section));
  const titles = { dashboard: 'Visão geral', 'manual-weighing': 'Cadastrar pesagem manual', people: 'Compradores e parceiros', profile: 'Perfil do cliente', collections: 'Coletas', wallet: 'Carteira Verde', materials: 'Materiais', benefits: 'Produtos e prêmios', reports: 'Relatórios' };
  $('#admin-page-title').textContent = titles[section] || 'Administração';
  if (section === 'collections') loadCollectionRequests();
  if (section === 'wallet') loadWallets();
  if (section === 'reports') loadReport();
  if (section === 'benefits') loadBenefits();
}

async function loadCollectionRequests() {
  const body = $('#admin-collections-body');
  const count = $('#collection-request-count');
  body.innerHTML = '<tr><td colspan="8">Carregando solicitações...</td></tr>';
  count.textContent = 'Carregando solicitações...';
  try {
    const [collections, oilCollections] = await Promise.all([
      fetchAll(() => supabase.from('collections')
        .select('id,partner_id,type,requested_date,requested_period,notes,status,created_at')
        .order('requested_date', { ascending: false }).order('id', { ascending: false })),
      fetchAll(() => supabase.from('oil_collections')
        .select('id,partner_id,liters,requested_date,requested_period,notes,status,created_at')
        .order('created_at', { ascending: false }).order('id', { ascending: false }))
    ]);
    const partnerIds = [...new Set([...collections, ...oilCollections].map(row => row.partner_id).filter(Boolean))];
    const partners = partnerIds.length
      ? await fetchAll(() => supabase.from('profiles').select('id,full_name').in('id', partnerIds).order('id'))
      : [];
    const names = new Map(partners.map(partner => [partner.id, partner.full_name || 'Sem nome']));
    const requests = [
      ...collections.map(row => ({
        table: 'collections',
        id: row.id,
        date: row.requested_date || row.created_at,
        partner: names.get(row.partner_id) || 'Parceiro não encontrado',
        operation: row.type || 'Retirada de Reciclagem',
        period: row.requested_period,
        quantity: '—',
        notes: row.notes,
        status: normalizeCollectionStatus(row.status)
      })),
      ...oilCollections.map(row => ({
        table: 'oil_collections',
        id: row.id,
        date: row.requested_date || row.created_at,
        partner: names.get(row.partner_id) || 'Parceiro não encontrado',
        operation: 'Retirada de Óleo Usado',
        period: row.requested_period,
        quantity: `${formatNumber(row.liters)} L`,
        notes: row.notes,
        status: normalizeCollectionStatus(row.status)
      }))
    ].sort((left, right) => dateKey(right.date).localeCompare(dateKey(left.date)));
    body.innerHTML = requests.map(row => {
      const date = dateKey(row.date);
      const displayDate = date ? new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR') : '—';
      const period = row.period === 'manha' ? 'Manhã' : row.period === 'tarde' ? 'Tarde' : '—';
      const currentStatus = normalizeCollectionStatus(row.status);
      const statusOptions = collectionStatuses.map(([value, label]) => `<option value="${value}" ${currentStatus === value ? 'selected' : ''}>${label}</option>`).join('');
      const unknownStatus = collectionStatuses.some(([value]) => value === currentStatus)
        ? ''
        : `<option value="${escapeHtml(currentStatus)}" selected>${escapeHtml(row.status)}</option>`;
      return `<tr><td>${escapeHtml(displayDate)}</td><td>${escapeHtml(row.partner)}</td><td>${escapeHtml(row.operation)}</td><td>${period}</td><td>${escapeHtml(row.quantity)}</td><td class="admin-collection-notes" title="${escapeHtml(row.notes || '')}">${escapeHtml(row.notes || '—')}</td><td><span class="admin-live-status">${escapeHtml(collectionStatusLabel(row.status))}</span></td><td><select class="admin-input" data-collection-status data-table="${row.table}" data-id="${Number(row.id)}" data-current-status="${escapeHtml(currentStatus)}" aria-label="Atualizar status da coleta">${unknownStatus}${statusOptions}</select></td></tr>`;
    }).join('') || '<tr><td colspan="8">Nenhuma solicitação de coleta registrada.</td></tr>';
    count.textContent = `${formatNumber(requests.length, 0)} solicitações`;
  } catch (error) {
    body.innerHTML = `<tr><td colspan="8">Falha ao carregar coletas: ${escapeHtml(error.message || error)}</td></tr>`;
    count.textContent = 'Não foi possível carregar';
    toast(`Falha ao carregar solicitações de coleta: ${error.message || error}`, true);
  }
}

async function updateCollectionRequestStatus(select) {
  const table = select.dataset.table;
  const id = Number(select.dataset.id);
  const status = normalizeCollectionStatus(select.value);
  const previousStatus = select.dataset.currentStatus;
  if (!['collections', 'oil_collections'].includes(table) || !Number.isSafeInteger(id) || id <= 0 ||
      !collectionStatuses.some(([value]) => value === status)) {
    toast('Não foi possível atualizar a coleta: dados de status inválidos.', true);
    select.value = previousStatus;
    return;
  }

  select.disabled = true;
  try {
    const { data, error } = await supabase.from(table).update({ status }).eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('A coleta não foi atualizada. Atualize a lista e tente novamente.');

    toast(status === 'confirmada' ? 'Coleta confirmada. O parceiro verá a confirmação.' : 'Status da coleta atualizado.');
    await loadCollectionRequests();
  } catch (error) {
    select.disabled = false;
    select.value = previousStatus;
    toast(`Não foi possível atualizar a coleta: ${error.message}`, true);
  }
}

async function loadWallets() {
  const body = $('#admin-wallet-body');
  $('#admin-wallet-redemptions-body').innerHTML = '<tr><td colspan="5">Carregando resgates...</td></tr>';
  body.innerHTML = '<tr><td colspan="3">Carregando saldos...</td></tr>';
  $('#wallet-partner-count').textContent = '…';
  $('#wallet-points-total').textContent = '…';
  try {
    const [partners, wallets] = await Promise.all([
      fetchAll(() => supabase.from('profiles').select('id,full_name').eq('role', 'partner').order('full_name').order('id')),
      fetchAll(() => supabase.from('green_wallet').select('partner_id,points_balance,updated_at').order('updated_at', { ascending: false }))
    ]);
    const balances = new Map(wallets.map(wallet => [wallet.partner_id, wallet]));
    const rows = partners.map(partner => ({
      name: partner.full_name || 'Sem nome',
      balance: balances.has(partner.id) ? Number(balances.get(partner.id).points_balance) : null,
      updatedAt: balances.get(partner.id)?.updated_at || ''
    })).sort((left, right) => right.balance - left.balance || left.name.localeCompare(right.name, 'pt-BR'));
    const initializedRows = rows.filter(row => row.balance !== null && Number.isFinite(row.balance));
    const missingWallets = rows.length - initializedRows.length;
    $('#wallet-partner-count').textContent = formatNumber(initializedRows.length, 0);
    $('#wallet-points-total').textContent = missingWallets
      ? '—'
      : formatNumber(initializedRows.reduce((sum, row) => sum + row.balance, 0), 2);
    body.innerHTML = rows.map(row => {
      const updatedAt = row.updatedAt ? new Date(row.updatedAt).toLocaleString('pt-BR') : 'Ainda sem movimentação';
      const balance = row.balance === null || !Number.isFinite(row.balance)
        ? 'Carteira não inicializada'
        : `${formatNumber(row.balance, 2)} pts`;
      return `<tr data-partner-name="${escapeHtml(row.name.toLocaleLowerCase('pt-BR'))}"><td>${escapeHtml(row.name)}</td><td class="admin-wallet-balance">${balance}</td><td>${escapeHtml(updatedAt)}</td></tr>`;
    }).join('') || '<tr><td colspan="3">Nenhum parceiro cadastrado.</td></tr>';
    filterWallets();
    await loadRecentBenefitRedemptions(partners);
    if (missingWallets) {
      toast(`${missingWallets} carteira(s) não inicializada(s). Aplique as migrações do Supabase.`, true);
    }
  } catch (error) {
    body.innerHTML = `<tr><td colspan="3">Falha ao carregar carteiras: ${escapeHtml(error.message || error)}</td></tr>`;
    $('#wallet-partner-count').textContent = '—';
    $('#wallet-points-total').textContent = '—';
    toast(`Falha ao carregar Carteiras Verdes: ${error.message || error}`, true);
  }
}

async function loadRecentBenefitRedemptions(partners) {
  const body = $('#admin-wallet-redemptions-body');
  try {
    const { data: redemptionsData, error: redemptionsError } = await supabase.from('benefit_redemptions')
      .select('id,partner_id,benefit_id,points_used,status,created_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(50);
    if (redemptionsError) throw redemptionsError;
    const redemptions = redemptionsData || [];
    const benefitIds = [...new Set(redemptions.map(redemption => redemption.benefit_id))];
    let benefitsById = new Map();
    if (benefitIds.length) {
      const { data, error } = await supabase.from('benefits').select('id,title,name').in('id', benefitIds);
      if (error) throw error;
      benefitsById = new Map((data || []).map(benefit => [benefit.id, benefit.title || benefit.name || 'Kit sem nome']));
    }
    const partnersById = new Map(partners.map(partner => [partner.id, partner.full_name || 'Sem nome']));
    const statusLabels = {
      solicitado: 'Solicitado',
      em_andamento: 'Em andamento',
      retirado: 'Retirado',
      retirada: 'Retirado',
      entregue: 'Entregue',
      concluido: 'Concluído',
      concluida: 'Concluída',
      cancelado: 'Cancelado',
      cancelada: 'Cancelada'
    };
    body.innerHTML = redemptions.map(redemption => {
      const status = String(redemption.status || 'solicitado').trim().toLocaleLowerCase('pt-BR');
      const createdAt = redemption.created_at ? new Date(redemption.created_at).toLocaleString('pt-BR') : '—';
      return `<tr><td>${escapeHtml(createdAt)}</td><td>${escapeHtml(partnersById.get(redemption.partner_id) || 'Parceiro não encontrado')}</td><td>${escapeHtml(benefitsById.get(redemption.benefit_id) || `Kit #${redemption.benefit_id}`)}</td><td>${formatNumber(redemption.points_used, 2)} pts</td><td>${escapeHtml(statusLabels[status] || redemption.status || 'Solicitado')}</td></tr>`;
    }).join('') || '<tr><td colspan="5">Nenhum kit resgatado ainda.</td></tr>';
  } catch (error) {
    body.innerHTML = `<tr><td colspan="5">Falha ao carregar resgates: ${escapeHtml(error.message || error)}</td></tr>`;
    toast(`Falha ao carregar os resgates dos parceiros: ${error.message || error}`, true);
  }
}

function filterWallets() {
  const query = $('#wallet-partner-search').value.trim().toLocaleLowerCase('pt-BR');
  document.querySelectorAll('#admin-wallet-body tr[data-partner-name]').forEach(row => {
    row.hidden = !row.dataset.partnerName.includes(query);
  });
}

const BENEFIT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const BENEFIT_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
]);

function previewBenefitImage(event) {
  const file = event.currentTarget.files[0];
  const preview = $('#benefit-image-preview');
  const image = $('#benefit-image-preview-img');
  if (benefitPreviewUrl) URL.revokeObjectURL(benefitPreviewUrl);
  benefitPreviewUrl = null;
  if (!file) {
    image.removeAttribute('src');
    preview.hidden = true;
    return;
  }
  if (!BENEFIT_IMAGE_TYPES.has(file.type) || file.size > BENEFIT_IMAGE_MAX_BYTES) {
    image.removeAttribute('src');
    preview.hidden = true;
    return;
  }
  benefitPreviewUrl = URL.createObjectURL(file);
  image.src = benefitPreviewUrl;
  preview.hidden = false;
}

async function saveBenefit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const name = $('#benefit-name').value.trim();
  const description = $('#benefit-description').value.trim();
  const pointsCost = Number($('#benefit-points').value);
  const retailValue = Number($('#benefit-retail-value').value || 0);
  const file = $('#benefit-image').files[0];
  if (!name || !Number.isSafeInteger(pointsCost) || pointsCost < 1 || !Number.isFinite(retailValue) || retailValue < 0 || !file) {
    toast('Informe nome, pontos inteiros positivos, valor estimado válido e uma foto do produto.', true);
    return;
  }
  const extension = BENEFIT_IMAGE_TYPES.get(file.type);
  if (!extension || file.size > BENEFIT_IMAGE_MAX_BYTES) {
    toast('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.', true);
    return;
  }

  button.disabled = true;
  button.textContent = 'Enviando foto e cadastrando...';
  let uploadedPath = null;
  let imageUploaded = false;
  try {
    uploadedPath = `benefits/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('produtos').upload(uploadedPath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false
    });
    if (uploadError) throw uploadError;
    imageUploaded = true;

    const { data: publicUrlData } = supabase.storage.from('produtos').getPublicUrl(uploadedPath);
    const photoUrl = publicUrlData?.publicUrl;
    if (!photoUrl) throw new Error('Não foi possível obter a URL pública da foto.');

    const { error: insertError } = await supabase.from('benefits').insert({
      title: name,
      name,
      description: description || null,
      points_cost: pointsCost,
      retail_value: retailValue,
      photo_url: photoUrl,
      active: true
    });
    if (insertError) throw insertError;

    form.reset();
    $('#benefit-image-preview-img').removeAttribute('src');
    $('#benefit-image-preview').hidden = true;
    if (benefitPreviewUrl) URL.revokeObjectURL(benefitPreviewUrl);
    benefitPreviewUrl = null;
    toast('Produto cadastrado no catálogo.');
    await loadBenefits();
  } catch (error) {
    let message = error.message || String(error);
    if (imageUploaded && uploadedPath) {
      try {
        const { error: cleanupError } = await supabase.storage.from('produtos').remove([uploadedPath]);
        if (cleanupError) message += `. Também não foi possível remover a foto enviada: ${cleanupError.message}`;
      } catch (cleanupError) {
        message += `. Também ocorreu um erro ao remover a foto enviada: ${cleanupError.message || cleanupError}`;
      }
    }
    toast(`Não foi possível cadastrar o produto: ${message}`, true);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Cadastrar produto <span>→</span>';
  }
}

async function loadBenefits() {
  const body = $('#benefits-body');
  body.innerHTML = '<tr><td colspan="7">Carregando produtos...</td></tr>';
  try {
    const { data, error } = await supabase.from('benefits')
      .select('id,title,name,description,points_cost,retail_value,photo_url,active')
      .order('title');
    if (error) throw error;
    state.benefits = (data || []).map(benefit => ({
      ...benefit,
      name: benefit.name || benefit.title || 'Produto sem nome'
    }));
    $('#benefit-count').textContent = formatNumber(state.benefits.length, 0);
    body.innerHTML = state.benefits.map(benefit => `<tr data-benefit-id="${Number(benefit.id)}">
      <td>${benefit.photo_url ? `<img class="admin-benefit-thumb" src="${escapeHtml(benefit.photo_url)}" alt="" loading="lazy">` : '<span class="admin-benefit-placeholder" aria-hidden="true">🎁</span>'}</td>
      <td>${escapeHtml(benefit.name)}</td>
      <td class="admin-benefit-description-cell" title="${escapeHtml(benefit.description || '')}">${escapeHtml(benefit.description || '—')}</td>
      <td>${formatNumber(benefit.points_cost, 0)} pts</td>
      <td>${Number(benefit.retail_value || 0) > 0 ? `R$ ${formatNumber(benefit.retail_value, 2)}` : 'Não informado'}</td>
      <td>${benefit.active ? 'Ativo' : 'Pausado'}</td>
      <td><button class="admin-benefit-toggle ${benefit.active ? 'active' : ''}" type="button" data-action="toggle-benefit" aria-label="${benefit.active ? 'Pausar' : 'Ativar'} ${escapeHtml(benefit.name)}">${benefit.active ? 'Pausar' : 'Ativar'}</button></td>
    </tr>`).join('') || '<tr><td colspan="7">Nenhum produto cadastrado.</td></tr>';
  } catch (error) {
    body.innerHTML = `<tr><td colspan="7">Não foi possível carregar o catálogo: ${escapeHtml(error.message || error)}</td></tr>`;
    toast(`Não foi possível carregar os produtos: ${error.message || error}`, true);
  }
}

async function handleBenefitAction(event) {
  const button = event.target.closest('[data-action="toggle-benefit"]');
  if (!button) return;
  const row = button.closest('[data-benefit-id]');
  const benefit = state.benefits.find(item => Number(item.id) === Number(row?.dataset.benefitId));
  if (!benefit) {
    toast('Produto não encontrado. Atualize o catálogo e tente novamente.', true);
    return;
  }
  button.disabled = true;
  try {
    const { error } = await supabase.from('benefits').update({ active: !benefit.active }).eq('id', benefit.id);
    if (error) throw error;
    toast(benefit.active ? 'Produto pausado no catálogo.' : 'Produto ativado no catálogo.');
    await loadBenefits();
  } catch (error) {
    button.disabled = false;
    toast(`Não foi possível alterar o produto: ${error.message || error}`, true);
  }
}

async function loadOverview() {
  const metrics = ['partners', 'buyers', 'orders', 'collections', 'weight', 'oil'];
  metrics.forEach(key => { $(`#overview-${key}`).textContent = '…'; });
  try {
    const [partners, buyers, orders, collections, weighings, oil] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'partner'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'buyer'),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('collections').select('id', { count: 'exact', head: true }),
      fetchAll(() => supabase.from('weighings').select('id,total_kg').order('id', { ascending: true })),
      fetchAll(() => supabase.from('oil_collections').select('id,liters').order('id', { ascending: true }))
    ]);
    const error = [partners, buyers, orders, collections].find(result => result.error)?.error;
    if (error) throw error;
    $('#overview-partners').textContent = formatNumber(partners.count, 0);
    $('#overview-buyers').textContent = formatNumber(buyers.count, 0);
    $('#overview-orders').textContent = formatNumber(orders.count, 0);
    $('#overview-collections').textContent = formatNumber(collections.count, 0);
    $('#overview-weight').textContent = `${formatNumber(weighings.reduce((sum, row) => sum + Number(row.total_kg || 0), 0))} kg`;
    $('#overview-oil').textContent = `${formatNumber(oil.reduce((sum, row) => sum + Number(row.liters || 0), 0))} L`;
  } catch (error) {
    metrics.forEach(key => { $(`#overview-${key}`).textContent = '—'; });
    toast(`Falha ao atualizar indicadores: ${error.message || error}`, true);
  }
}

async function loadPeople() {
  const bodies = { partner: $('#partners-body'), buyer: $('#buyers-body') };
  try {
    const [profiles, collections, weighings, orders] = await Promise.all([
      fetchAll(() => supabase.from('profiles').select('id,full_name,cpf,role,is_active').in('role', ['partner', 'buyer']).order('full_name').order('id')),
      fetchAll(() => supabase.from('collections').select('partner_id').order('id')),
      fetchAll(() => supabase.from('weighings').select('partner_id').order('id')),
      fetchAll(() => supabase.from('orders').select('buyer_id').order('id'))
    ]);
    const counts = rows => rows.reduce((map, row) => {
      const id = row.partner_id || row.buyer_id;
      map.set(id, (map.get(id) || 0) + 1);
      return map;
    }, new Map());
    const collectionCounts = counts(collections);
    const weighingCounts = counts(weighings);
    const orderCounts = counts(orders);
    const partners = profiles.filter(profile => profile.role === 'partner');
    const buyers = profiles.filter(profile => profile.role === 'buyer');
    state.partners = partners;
    state.buyers = buyers;
    const partnerSelect = $('#manual-partner');
    const selectedPartner = partnerSelect.value;
    const activePartners = partners.filter(profile => profile.is_active !== false);
    partnerSelect.innerHTML = '<option value="">Selecione um parceiro...</option>' + activePartners.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.full_name || 'Parceiro sem nome')}</option>`).join('');
    if (activePartners.some(profile => profile.id === selectedPartner)) partnerSelect.value = selectedPartner;
    const buyerSelect = $('#order-buyer');
    const selectedBuyer = buyerSelect.value;
    const activeBuyers = buyers.filter(profile => profile.is_active !== false);
    buyerSelect.innerHTML = '<option value="">Selecione um comprador...</option>' + activeBuyers.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.full_name || 'Comprador sem nome')}</option>`).join('');
    if (activeBuyers.some(profile => profile.id === selectedBuyer)) buyerSelect.value = selectedBuyer;
    $('#partner-count').textContent = formatNumber(partners.length, 0);
    $('#buyer-count').textContent = formatNumber(buyers.length, 0);
    bodies.partner.innerHTML = partners.map(profile => {
      const active = profile.is_active !== false;
      return `<tr data-person-name="${escapeHtml(profile.full_name || '')}"><td><button class="admin-profile-link" type="button" data-profile-id="${escapeHtml(profile.id)}" data-profile-role="partner">${escapeHtml(profile.full_name || 'Sem nome')}</button></td><td>${escapeHtml(profile.cpf || '—')}</td><td>${collectionCounts.get(profile.id) || 0}</td><td>${weighingCounts.get(profile.id) || 0}</td><td>${active ? 'Ativa' : 'Desativada'}</td><td><button class="admin-status-button" type="button" data-toggle-profile-active data-profile-id="${escapeHtml(profile.id)}" data-profile-role="partner" data-active="${active}" aria-label="${active ? 'Desativar' : 'Reativar'} conta de ${escapeHtml(profile.full_name || 'parceiro')}">${active ? 'Desativar' : 'Reativar'}</button></td></tr>`;
    }).join('') || '<tr><td colspan="6">Nenhum parceiro cadastrado.</td></tr>';
    bodies.buyer.innerHTML = buyers.map(profile => {
      const active = profile.is_active !== false;
      return `<tr data-person-name="${escapeHtml(profile.full_name || '')}"><td><button class="admin-profile-link" type="button" data-profile-id="${escapeHtml(profile.id)}" data-profile-role="buyer">${escapeHtml(profile.full_name || 'Sem nome')}</button></td><td>${escapeHtml(profile.cpf || '—')}</td><td>${orderCounts.get(profile.id) || 0}</td><td>${active ? 'Ativa' : 'Desativada'}</td><td><button class="admin-status-button" type="button" data-toggle-profile-active data-profile-id="${escapeHtml(profile.id)}" data-profile-role="buyer" data-active="${active}" aria-label="${active ? 'Desativar' : 'Reativar'} conta de ${escapeHtml(profile.full_name || 'comprador')}">${active ? 'Desativar' : 'Reativar'}</button></td></tr>`;
    }).join('') || '<tr><td colspan="5">Nenhum comprador cadastrado.</td></tr>';
    filterPeople('partner');
    filterPeople('buyer');
  } catch (error) {
    Object.values(bodies).forEach((body, index) => {
      body.innerHTML = `<tr><td colspan="${index ? 5 : 6}">Não foi possível carregar os perfis: ${escapeHtml(error.message || error)}</td></tr>`;
    });
    toast(`Falha ao carregar compradores e parceiros: ${error.message || error}`, true);
  }
}

async function updateProfileActiveStatus(button) {
  const profileId = button.dataset.profileId;
  const role = button.dataset.profileRole;
  const active = button.dataset.active === 'true';
  if (!profileId || !['partner', 'buyer'].includes(role)) {
    toast('Não foi possível atualizar o perfil: dados inválidos.', true);
    return;
  }
  const nextActive = !active;
  const action = nextActive ? 'reativar' : 'desativar';
  if (!window.confirm(`Deseja ${action} esta conta?`)) return;

  button.disabled = true;
  try {
    const { data, error } = await supabase.from('profiles')
      .update({ is_active: nextActive })
      .eq('id', profileId)
      .eq('role', role)
      .select('id,is_active')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhuma conta foi atualizada. Atualize a lista e tente novamente.');

    toast(`Conta ${nextActive ? 'reativada' : 'desativada'} com sucesso.`);
    await loadPeople();
  } catch (error) {
    button.disabled = false;
    toast(`Não foi possível ${action} a conta: ${error.message || error}`, true);
  }
}

function filterPeople(role) {
  const body = $(`#${role === 'partner' ? 'partners-body' : 'buyers-body'}`);
  const search = $(`#${role === 'partner' ? 'partner-search' : 'buyer-search'}`).value.trim().toLocaleLowerCase('pt-BR');
  let visible = 0;
  body.querySelectorAll('tr[data-person-name]').forEach(row => {
    const matches = row.dataset.personName.toLocaleLowerCase('pt-BR').includes(search);
    row.hidden = !matches;
    if (matches) visible++;
  });
  $(`#${role === 'partner' ? 'partner-count' : 'buyer-count'}`).textContent = formatNumber(visible, 0);
}

function normalizeMaterialName(value) {
  return String(value || '').trim().toLocaleLowerCase('pt-BR');
}

function profileRecordQuery(role, profileId) {
  if (role === 'partner') {
    return supabase.from('weighings')
      .select('id,created_at,material_name,total_kg,price_per_kg')
      .eq('partner_id', profileId).order('created_at', { ascending: false }).order('id', { ascending: false });
  }
  return supabase.from('orders')
    .select('id,created_at,material_name,quantity_kg,material_id,price_per_kg,total_value')
    .eq('buyer_id', profileId).order('created_at', { ascending: false }).order('id', { ascending: false });
}

function dateKeyFromParts(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isoWeekNumber(value) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function selectedProfileDateRanges() {
  const yearValue = $('#profile-filter-year').value;
  const monthValue = $('#profile-filter-month').value;
  const weekValue = $('#profile-filter-week').value;
  if (!yearValue) return null;

  const year = Number(yearValue);
  let start = `${year}-01-01`;
  let end = `${year + 1}-01-01`;
  if (monthValue) {
    const month = Number(monthValue);
    start = dateKeyFromParts(year, month, 1);
    end = month === 12 ? `${year + 1}-01-01` : dateKeyFromParts(year, month + 1, 1);
  }
  if (!weekValue) return [{ start, end }];

  const ranges = [];
  let rangeStart = null;
  let previousKey = null;
  const cursor = new Date(`${start}T00:00:00Z`);
  const rangeEnd = new Date(`${end}T00:00:00Z`);
  while (cursor < rangeEnd) {
    const key = dateKeyFromParts(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate());
    if (isoWeekNumber(key) === Number(weekValue)) {
      if (!rangeStart) rangeStart = key;
      previousKey = key;
    } else if (rangeStart) {
      const nextDay = new Date(`${previousKey}T00:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      ranges.push({ start: rangeStart, end: dateKeyFromParts(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()) });
      rangeStart = null;
      previousKey = null;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (rangeStart && previousKey) {
    const nextDay = new Date(`${previousKey}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    ranges.push({ start: rangeStart, end: dateKeyFromParts(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()) });
  }
  return ranges;
}

function updateProfileFilterOptions() {
  const history = state.profileHistory;
  if (!history) return;
  const yearSelect = $('#profile-filter-year');
  const monthSelect = $('#profile-filter-month');
  const weekSelect = $('#profile-filter-week');
  const selectedYear = yearSelect.value;
  const selectedMonth = monthSelect.value;
  const selectedWeek = weekSelect.value;
  const yearKeys = [...new Set(history.dateKeys.map(key => key.slice(0, 4)))].sort().reverse();
  yearSelect.innerHTML = '<option value="">Todos os anos</option>' + yearKeys.map(year => `<option value="${year}">${year}</option>`).join('');
  if (yearKeys.includes(selectedYear)) yearSelect.value = selectedYear;

  const year = yearSelect.value;
  const matchingMonthDates = history.dateKeys.filter(key => !year || key.startsWith(`${year}-`));
  const monthKeys = [...new Set(matchingMonthDates.map(key => key.slice(5, 7)))].sort();
  monthSelect.disabled = !year;
  monthSelect.innerHTML = '<option value="">Todos os meses</option>' + monthKeys.map(month => {
    const label = new Date(Date.UTC(2020, Number(month) - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
    return `<option value="${Number(month)}">${label}</option>`;
  }).join('');
  if (monthKeys.includes(String(selectedMonth).padStart(2, '0'))) monthSelect.value = String(Number(selectedMonth));

  const month = monthSelect.value;
  const matchingWeekDates = history.dateKeys.filter(key =>
    (!year || key.startsWith(`${year}-`)) &&
    (!month || Number(key.slice(5, 7)) === Number(month))
  );
  const weekNumbers = [...new Set(matchingWeekDates.map(isoWeekNumber))].sort((a, b) => a - b);
  weekSelect.disabled = !year;
  weekSelect.innerHTML = '<option value="">Todas as semanas</option>' + weekNumbers.map(week => `<option value="${week}">Semana ${String(week).padStart(2, '0')}</option>`).join('');
  if (weekNumbers.includes(Number(selectedWeek))) weekSelect.value = selectedWeek;
}

async function openProfileDetail(profileId, role) {
  if (!['partner', 'buyer'].includes(role) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId || '')) {
    toast('Perfil inválido para consulta.', true);
    return;
  }
  const profile = (role === 'partner' ? state.partners : state.buyers).find(item => item.id === profileId);
  if (!profile) {
    toast('O perfil não está mais na lista. Atualize os cadastros e tente novamente.', true);
    return;
  }
  const requestId = ++state.profileRequest;
  state.profileHistory = { profile, role, dateKeys: [], rows: [] };
  $('#profile-kind').textContent = role === 'partner' ? 'PERFIL DO PARCEIRO · CONDOMÍNIO' : 'PERFIL DO COMPRADOR · FERRO-VELHO';
  $('#profile-name').textContent = profile.full_name || 'Sem nome';
  $('#profile-description').textContent = role === 'partner'
    ? 'Pesagens registradas, materiais recebidos e valores calculados.'
    : 'Transações e valores lançados pelo administrador. Compradores não acumulam pontos.';
  $('#profile-table-title').textContent = role === 'partner' ? 'Pesagens do parceiro' : 'Pedidos do comprador';
  $('#profile-table-description').textContent = role === 'partner'
    ? 'Preço unitário e total registrados em cada pesagem.'
    : 'Valores registrados diretamente no lançamento administrativo.';
  $('#profile-total-value-label').textContent = role === 'buyer' ? 'Valor lançado' : 'Valor calculado';
  $('#profile-estimate-note').hidden = true;
  $('#profile-filter-year').innerHTML = '<option value="">Todos os anos</option>';
  $('#profile-filter-year').value = '';
  $('#profile-filter-month').innerHTML = '<option value="">Todos os meses</option>';
  $('#profile-filter-month').value = '';
  $('#profile-filter-month').disabled = true;
  $('#profile-filter-week').innerHTML = '<option value="">Todas as semanas</option>';
  $('#profile-filter-week').value = '';
  $('#profile-filter-week').disabled = true;
  $('#profile-export-pdf').disabled = true;
  showSection('profile');
  $('#profile-records-body').innerHTML = '<tr><td colspan="6">Carregando registros do cliente...</td></tr>';
  $('#profile-record-count').textContent = '…';
  $('#profile-total-weight').textContent = '…';
  $('#profile-total-value').textContent = '…';
  try {
    const foreignKey = role === 'partner' ? 'partner_id' : 'buyer_id';
    const table = role === 'partner' ? 'weighings' : 'orders';
    const dates = await fetchAll(() => supabase.from(table).select('id,created_at')
      .eq(foreignKey, profileId).order('created_at').order('id'));
    if (requestId !== state.profileRequest) return;
    state.profileHistory.dateKeys = [...new Set(dates.map(row => dateKey(row.created_at)).filter(Boolean))].sort();
    updateProfileFilterOptions();
    await loadProfileHistory();
  } catch (error) {
    if (requestId !== state.profileRequest) return;
    $('#profile-records-body').innerHTML = `<tr><td colspan="6">Não foi possível carregar os filtros do perfil: ${escapeHtml(error.message || error)}</td></tr>`;
    $('#profile-export-pdf').disabled = false;
    toast(`Não foi possível abrir o perfil: ${error.message || error}`, true);
  }
}

async function loadProfileHistory() {
  const history = state.profileHistory;
  if (!history) return;
  const requestId = ++state.profileRequest;
  const ranges = selectedProfileDateRanges();
  $('#profile-export-pdf').disabled = true;
  $('#profile-records-body').innerHTML = '<tr><td colspan="6">Atualizando registros...</td></tr>';
  try {
    let records;
    if (!ranges) {
      records = await fetchAll(() => profileRecordQuery(history.role, history.profile.id));
    } else {
      const queries = ranges.map(range => {
        const fromTime = new Date(`${range.start}T00:00:00`).toISOString();
        const toTime = new Date(`${range.end}T00:00:00`).toISOString();
        return fetchAll(() => profileRecordQuery(history.role, history.profile.id)
          .gte('created_at', fromTime).lt('created_at', toTime));
      });
      records = (await Promise.all(queries)).flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (requestId !== state.profileRequest) return;

    const materialsById = new Map(state.materials.map(material => [String(material.id), material]));
    const materialsByName = new Map(state.materials.map(material => [normalizeMaterialName(material.name), material]));
    const rows = records.map(record => {
      const weight = Number(history.role === 'partner' ? record.total_kg : record.quantity_kg);
      const material = history.role === 'buyer'
        ? (materialsById.get(String(record.material_id)) || materialsByName.get(normalizeMaterialName(record.material_name)))
        : null;
      const priceValue = record.price_per_kg;
      const price = priceValue === null || priceValue === undefined || !Number.isFinite(Number(priceValue)) ? null : Number(priceValue);
      const totalValue = history.role === 'buyer' ? record.total_value : null;
      const total = history.role === 'buyer'
        ? (totalValue === null || totalValue === undefined || !Number.isFinite(Number(totalValue)) ? null : Number(totalValue))
        : (price === null ? null : Math.round(weight * price * 100) / 100);
      return {
        id: record.id,
        date: record.created_at,
        material: record.material_name || material?.name || 'Material não identificado',
        weight: Number.isFinite(weight) ? weight : 0,
        price,
        total
      };
    });
    history.rows = rows;
    renderProfileHistory();
  } catch (error) {
    if (requestId !== state.profileRequest) return;
    $('#profile-records-body').innerHTML = `<tr><td colspan="6">Falha ao carregar os registros: ${escapeHtml(error.message || error)}</td></tr>`;
    $('#profile-export-pdf').disabled = false;
    toast(`Não foi possível atualizar o perfil: ${error.message || error}`, true);
  }
}

function renderProfileHistory() {
  const history = state.profileHistory;
  if (!history) return;
  const rows = history.rows;
  const weight = rows.reduce((sum, row) => sum + row.weight, 0);
  const pricedRows = rows.filter(row => row.total !== null);
  const totalCents = pricedRows.reduce((sum, row) => sum + Math.round(row.total * 100), 0);
  const missingPrices = rows.length - pricedRows.length;
  $('#profile-record-count').textContent = formatNumber(rows.length, 0);
  $('#profile-total-weight').textContent = `${formatNumber(weight, 3)} kg`;
  $('#profile-total-value').textContent = rows.length && !pricedRows.length
    ? '—'
    : `R$ ${(totalCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${missingPrices ? ` + ${missingPrices} sem preço` : ''}`;
  $('#profile-value-note').textContent = history.role === 'buyer'
    ? 'Total salvo pelo administrador; não há cálculo de pontos para compradores.'
    : 'Calculado com o preço por kg da pesagem.';
  $('#profile-export-pdf').disabled = false;
  const table = history.role === 'partner' ? 'weighings' : 'orders';
  $('#profile-records-body').innerHTML = rows.map(row => `<tr>
    <td>${escapeHtml(new Date(row.date).toLocaleDateString('pt-BR'))}</td>
    <td>${escapeHtml(row.material)}</td>
    <td>${formatNumber(row.weight, 3)} kg</td>
    <td>${row.price === null ? '—' : `R$ ${formatNumber(row.price, 2)}`}</td>
    <td>${row.total === null ? '—' : `R$ ${formatNumber(row.total, 2)}`}</td>
    <td><button class="admin-icon-button" type="button" data-delete-profile-record data-delete-table="${table}" data-delete-id="${Number(row.id)}" aria-label="Excluir registro de ${escapeHtml(row.material)}" title="Excluir registro">${trashIcon()}</button></td>
  </tr>`).join('') || '<tr><td colspan="6">Nenhum registro encontrado para os filtros selecionados.</td></tr>';
}

function trashIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>';
}

async function deleteProfileRecord(button) {
  const history = state.profileHistory;
  const table = button.dataset.deleteTable;
  const id = button.dataset.deleteId;
  const expectedTable = history?.role === 'partner' ? 'weighings' : 'orders';
  if (!history || table !== expectedTable || !/^\d+$/.test(id || '')) {
    toast('Registro inválido para exclusão.', true);
    return;
  }
  const message = history.role === 'partner'
    ? 'Excluir esta pesagem? Os Pontos Verdes correspondentes serão removidos automaticamente do saldo do parceiro.'
    : 'Excluir este pedido? Esta ação não pode ser desfeita.';
  if (!window.confirm(message)) return;

  button.disabled = true;
  try {
    const { data, error } = await supabase.from(table).delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro foi excluído. Verifique as permissões administrativas.');

    const foreignKey = history.role === 'partner' ? 'partner_id' : 'buyer_id';
    let dateRows;
    try {
      dateRows = await fetchAll(() => supabase.from(table).select('id,created_at')
        .eq(foreignKey, history.profile.id).order('created_at').order('id'));
    } catch (datesError) {
      toast(`Registro excluído, mas não foi possível atualizar os filtros do perfil: ${datesError.message || datesError}`, true);
      await Promise.all([loadProfileHistory(), loadOverview(), loadOperations()]);
      return;
    }
    if (state.profileHistory !== history) return;
    history.dateKeys = [...new Set(dateRows.map(row => dateKey(row.created_at)).filter(Boolean))].sort();
    updateProfileFilterOptions();
    toast(history.role === 'partner'
      ? 'Pesagem excluída; a trigger do banco atualizou o saldo da carteira.'
      : 'Pedido excluído.');
    await Promise.all([
      loadProfileHistory(),
      loadOverview(),
      loadOperations(),
      history.role === 'partner' ? loadMaterials() : Promise.resolve()
    ]);
  } catch (error) {
    button.disabled = false;
    toast(`Não foi possível excluir o registro: ${error.message || error}`, true);
  }
}

function selectedProfilePeriodLabel() {
  const year = $('#profile-filter-year').value;
  const month = $('#profile-filter-month').value;
  const week = $('#profile-filter-week').value;
  if (!year) return 'Todo o período';
  if (week) return `Semana ${String(week).padStart(2, '0')} de ${year}${month ? ` · ${new Date(Date.UTC(2020, Number(month) - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })}` : ''}`;
  if (month) return `${new Date(Date.UTC(2020, Number(month) - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })} de ${year}`;
  return `Ano ${year}`;
}

function safeFilename(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cliente';
}

function exportProfilePdf() {
  const history = state.profileHistory;
  if (!history) {
    toast('Abra o perfil de um cliente antes de gerar o relatório.', true);
    return;
  }
  const JsPDF = window.jspdf?.jsPDF;
  if (!JsPDF) {
    toast('A biblioteca de PDF não foi carregada. Atualize a página e tente novamente.', true);
    return;
  }
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const period = selectedProfilePeriodLabel();
  const customerType = history.role === 'partner' ? 'Condomínio / parceiro' : 'Ferro-velho / comprador';
  const pricedRows = history.rows.filter(row => row.total !== null);
  const totalCents = pricedRows.reduce((sum, row) => sum + Math.round(row.total * 100), 0);
  const weight = history.rows.reduce((sum, row) => sum + row.weight, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(8, 86, 39);
  doc.text('ReciclaDin', 14, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 88, 78);
  doc.text('Relatório individual de operações', 14, 23);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(25, 38, 29);
  doc.text(`${customerType}: ${history.profile.full_name || 'Sem nome'}`, 14, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${period}`, 14, 38);

  autoTable(doc, {
    startY: 45,
    head: [['Data', 'Material', 'Peso (kg)', 'Preço unitário (R$/kg)', 'Valor lançado (R$)']],
    body: history.rows.map(row => [
      new Date(row.date).toLocaleDateString('pt-BR'),
      row.material,
      formatNumber(row.weight, 3),
      row.price === null ? '—' : formatNumber(row.price, 2),
      row.total === null ? '—' : formatNumber(row.total, 2)
    ]),
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, textColor: [35, 48, 39] },
    headStyles: { fillColor: [10, 83, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [242, 248, 243] },
    columnStyles: { 0: { cellWidth: 27 }, 1: { cellWidth: 72 }, 2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 45, halign: 'right' }, 4: { cellWidth: 48, halign: 'right' } },
    didDrawPage: () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 102);
      doc.text('ReciclaDin · Relatório administrativo', 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }
  });
  const summaryY = (doc.lastAutoTable?.finalY || 45) + 10;
  const summaryText = `Peso total: ${formatNumber(weight, 3)} kg     Valor lançado: R$ ${(totalCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${history.rows.length > pricedRows.length ? ` · ${history.rows.length - pricedRows.length} registro(s) sem valor` : ''}`;
  if (summaryY < doc.internal.pageSize.getHeight() - 16) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(8, 86, 39);
    doc.text(summaryText, 14, summaryY);
  } else {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(8, 86, 39);
    doc.text(summaryText, 14, 18);
  }
  if (history.role === 'buyer') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(85, 92, 87);
    const noteY = summaryY < doc.internal.pageSize.getHeight() - 16 ? summaryY + 6 : 24;
    doc.text('Valores do comprador correspondem aos totais salvos no lançamento administrativo.', 14, noteY);
  }
  const filename = `relatorio-${safeFilename(history.profile.full_name)}-${safeFilename(period)}.pdf`;
  doc.save(filename);
}

async function loadMaterials() {
  const body = $('#materials-body');
  try {
    const [materials, weighings] = await Promise.all([
      fetchAll(() => supabase.from('materials').select('id,name,unit,reference_price,active').order('name').order('id')),
      fetchAll(() => supabase.from('weighings').select('material_name,total_kg').order('id'))
    ]);
    state.materials = materials;
    const materialSelect = $('#manual-material');
    const selectedMaterial = materialSelect.value;
    materialSelect.innerHTML = '<option value="">Selecione um material...</option>' +
      materials.filter(material => material.active).map(material => `<option value="${Number(material.id)}">${escapeHtml(material.name)}</option>`).join('');
    if (materials.some(material => material.active && String(material.id) === selectedMaterial)) materialSelect.value = selectedMaterial;
    const orderMaterialSelect = $('#order-material');
    const selectedOrderMaterial = orderMaterialSelect.value;
    orderMaterialSelect.innerHTML = '<option value="">Selecione um material ativo...</option>' +
      materials.filter(material => material.active).map(material => `<option value="${Number(material.id)}">${escapeHtml(material.name)}</option>`).join('');
    if (materials.some(material => material.active && String(material.id) === selectedOrderMaterial)) orderMaterialSelect.value = selectedOrderMaterial;
    const totals = weighings.reduce((map, row) => {
      const name = row.material_name || 'Material não identificado';
      map.set(name, (map.get(name) || 0) + Number(row.total_kg || 0));
      return map;
    }, new Map());
    $('#material-count').textContent = formatNumber(materials.length, 0);
    body.innerHTML = materials.map(material => `<tr data-material-id="${Number(material.id)}">
      <td class="material-name">${escapeHtml(material.name)}</td><td class="material-unit">${escapeHtml(material.unit)}</td>
      <td class="material-price">R$ ${formatNumber(material.reference_price, 2)}</td>
      <td>${formatNumber(totals.get(material.name) || 0)} kg</td>
      <td><button class="admin-status-button ${material.active ? 'active' : ''}" data-action="toggle" type="button">${material.active ? 'Ativo' : 'Inativo'}</button></td>
      <td><div class="admin-row-actions"><button type="button" data-action="edit">Editar</button><button type="button" class="danger" data-action="delete" title="Excluir material do catálogo" aria-label="Excluir ${escapeHtml(material.name)} do catálogo">Excluir material</button></div></td>
    </tr>`).join('') || '<tr><td colspan="6">Nenhum material cadastrado.</td></tr>';
  } catch (error) {
    body.innerHTML = `<tr><td colspan="6">Não foi possível carregar o catálogo: ${escapeHtml(error.message || error)}</td></tr>`;
    toast(`Falha ao carregar materiais: ${error.message || error}`, true);
  }
}

function updateAdminOrderPrice() {
  const material = state.materials.find(item => String(item.id) === $('#order-material').value && item.active);
  if (material) $('#order-price').value = Number(material.reference_price || 0).toFixed(2);
  updateAdminOrderTotal();
}

function updateAdminOrderTotal() {
  const quantity = Number($('#order-quantity').value);
  const price = Number($('#order-price').value);
  const total = Number.isFinite(quantity) && quantity > 0 && Number.isFinite(price) && price >= 0
    ? Math.round(quantity * price * 100) / 100
    : 0;
  $('#order-total').textContent = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function saveAdminOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const buyerId = $('#order-buyer').value;
  const material = state.materials.find(item => String(item.id) === $('#order-material').value && item.active);
  const quantity = Number($('#order-quantity').value);
  const price = Number($('#order-price').value);
  const status = $('#order-status').value;
  if (!state.buyers.some(buyer => buyer.id === buyerId) || !material ||
      !Number.isFinite(quantity) || quantity <= 0 ||
      !Number.isFinite(price) || price < 0 ||
      !state.buyers.find(buyer => buyer.id === buyerId)?.is_active ||
      !['solicitado', 'em_andamento', 'concluido', 'cancelado'].includes(status)) {
    toast('Selecione um comprador, material ativo, quantidade, preço e status válidos.', true);
    return;
  }
  const total = Math.round(quantity * price * 100) / 100;
  button.disabled = true;
  button.textContent = 'Registrando...';
  try {
    const { data: savedOrder, error } = await supabase.from('orders').insert({
      buyer_id: buyerId,
      created_by: state.user.id,
      material_id: material.id,
      material_name: material.name,
      quantity_kg: quantity,
      price_per_kg: price,
      total_value: total,
      status
    }).select('id,buyer_id,created_by,material_name,quantity_kg,price_per_kg,total_value,status,created_at').single();
    if (error) throw error;
    if (!savedOrder || savedOrder.buyer_id !== buyerId || savedOrder.created_by !== state.user.id) {
      throw new Error('O lançamento não foi confirmado para o comprador selecionado. Atualize as migrações de permissões do Supabase.');
    }
    form.reset();
    $('#order-total').textContent = 'R$ 0,00';
    toast(`Transação #${savedOrder.id} registrada para ${state.buyers.find(buyer => buyer.id === buyerId)?.full_name || 'o comprador selecionado'}.`);
    await Promise.all([loadOperations(), loadOverview(), loadPeople()]);
  } catch (error) {
    toast(`Não foi possível registrar a transação: ${error.message || error}`, true);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Registrar transação <span>→</span>';
  }
}

function updateManualTotal() {
  const weight = Number($('#manual-weight').value);
  const price = Number($('#manual-price').value);
  const total = Number.isFinite(weight) && weight > 0 && Number.isFinite(price) && price >= 0 ? weight * price : 0;
  $('#manual-total').textContent = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const points = Number.isFinite(weight) && weight > 0 ? Math.round(weight * 10 * 100) / 100 : 0;
  $('#manual-points').textContent = `${formatNumber(points, 2)} Pontos Verdes · 10 por kg`;
}

function syncManualMaterialPrice(event) {
  const materialId = $('#manual-material').value;
  const material = state.materials.find(item => String(item.id) === materialId && item.active);
  if (material && event?.target?.id === 'manual-material') $('#manual-price').value = Number(material.reference_price || 0).toFixed(2);
  updateManualTotal();
}

async function saveManualWeighing(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const partnerId = $('#manual-partner').value;
  const materialId = $('#manual-material').value;
  const totalKg = Number($('#manual-weight').value);
  const pricePerKg = Number($('#manual-price').value);
  if (!partnerId || !materialId || !Number.isFinite(totalKg) || totalKg <= 0 || !Number.isFinite(pricePerKg) || pricePerKg < 0) {
    toast('Selecione o parceiro e informe material, peso e preço válidos.', true);
    return;
  }
  const material = state.materials.find(item => String(item.id) === materialId && item.active);
  if (!material) {
    toast('Selecione um material ativo do catálogo.', true);
    return;
  }
  const materialName = material.name;
  button.disabled = true;
  button.innerHTML = 'Salvando pesagem...';
  try {
    const { error } = await supabase.from('weighings').insert({
      partner_id: partnerId,
      material_id: material.id,
      material_name: materialName,
      total_kg: totalKg,
      price_per_kg: pricePerKg
    });
    if (error) throw error;
    const points = Math.round(totalKg * 10 * 100) / 100;
    form.reset();
    $('#manual-total').textContent = 'R$ 0,00';
    $('#manual-points').textContent = '0 Pontos Verdes · 10 por kg';
    toast(`Pesagem cadastrada. Total: R$ ${(totalKg * pricePerKg).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}; ${formatNumber(points, 2)} Pontos Verdes creditados.`);
    await Promise.all([loadOperations(), loadOverview(), loadMaterials()]);
  } catch (error) {
    toast(`Não foi possível cadastrar a pesagem: ${error.message || error}`, true);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Cadastrar Material <span>→</span>';
  }
}

function operationIsActive(status) {
  const normalized = String(status || '').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return !['cancelada', 'cancelado', 'concluida', 'concluido', 'finalizada', 'finalizado', 'entregue'].includes(normalized);
}

async function loadOperations() {
  const body = $('#operations-body');
  body.innerHTML = '<tr><td colspan="8">Atualizando registros operacionais...</td></tr>';
  try {
    const chartStart = new Date();
    chartStart.setHours(0, 0, 0, 0);
    chartStart.setDate(chartStart.getDate() - 29);
    const [collectionsResult, ordersResult, weighingsResult, chartWeighings] = await Promise.all([
      supabase.from('collections').select('id,partner_id,type,requested_date,status').order('requested_date', { ascending: false }).order('id', { ascending: false }).limit(100),
      supabase.from('orders').select('id,buyer_id,material_name,quantity_kg,total_value,status,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100),
      supabase.from('weighings').select('id,partner_id,material_name,total_kg,price_per_kg,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100),
      fetchAll(() => supabase.from('weighings').select('total_kg,created_at').gte('created_at', chartStart.toISOString()).order('created_at', { ascending: true }))
    ]);
    const recordsError = [collectionsResult, ordersResult, weighingsResult].find(result => result.error)?.error;
    if (recordsError) throw recordsError;
    const collections = collectionsResult.data || [];
    const orders = ordersResult.data || [];
    const weighings = weighingsResult.data || [];
    const profileIds = [...new Set([
      ...collections.map(row => row.partner_id),
      ...orders.map(row => row.buyer_id),
      ...weighings.map(row => row.partner_id)
    ])];
    const profilesResult = profileIds.length
      ? await fetchAll(() => supabase.from('profiles').select('id,full_name').in('id', profileIds).order('id'))
      : [];
    const names = new Map(profilesResult.map(profile => [profile.id, profile.full_name || 'Sem nome']));
    const entries = [
      ...collections.filter(row => operationIsActive(row.status)).map(row => ({
        table: 'collections', id: row.id, type: 'Coleta', date: row.requested_date,
        person: names.get(row.partner_id) || 'Parceiro', material: row.type || 'Material reciclável',
        quantity: 'Agendada', amount: '—', status: row.status || 'Solicitada'
      })),
      ...orders.filter(row => operationIsActive(row.status)).map(row => ({
        table: 'orders', id: row.id, type: 'Venda', date: row.created_at,
        person: names.get(row.buyer_id) || 'Comprador', material: row.material_name || 'Material',
        quantity: `${formatNumber(row.quantity_kg)} kg`, amount: row.total_value === null ? '—' : `R$ ${formatNumber(row.total_value, 2)}`, status: row.status || 'Solicitado'
      })),
      ...weighings.map(row => ({
        table: 'weighings', id: row.id, type: 'Pesagem', date: row.created_at,
        person: names.get(row.partner_id) || 'Parceiro', material: row.material_name || 'Material',
        quantity: `${formatNumber(row.total_kg)} kg`,
        amount: `R$ ${(Number(row.total_kg || 0) * Number(row.price_per_kg || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: 'Registrada'
      }))
    ].sort((left, right) => dateKey(right.date).localeCompare(dateKey(left.date))).slice(0, 150);
    body.innerHTML = entries.map(row => `<tr>
      <td><span class="admin-record-type">${escapeHtml(row.type)}</span></td>
      <td>${escapeHtml(row.date ? new Date(`${dateKey(row.date)}T00:00:00`).toLocaleDateString('pt-BR') : '—')}</td>
      <td>${escapeHtml(row.person)}</td><td>${escapeHtml(row.material)}</td>
      <td>${escapeHtml(row.quantity)}</td><td class="admin-record-total">${escapeHtml(row.amount)}</td>
      <td><span class="admin-live-status">${escapeHtml(row.status)}</span></td>
      <td><button class="admin-icon-button" type="button" data-delete-table="${row.table}" data-delete-id="${escapeHtml(row.id)}" aria-label="Excluir ${escapeHtml(row.type.toLocaleLowerCase('pt-BR'))} de ${escapeHtml(row.person)}" title="Excluir registro">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6"/></svg>
      </button></td>
    </tr>`).join('') || '<tr><td colspan="8">Nenhuma coleta ou pedido em andamento.</td></tr>';
    const liveEntries = entries.filter(row => row.type === 'Coleta' || row.type === 'Venda').slice(0, 8);
    $('#live-monitor').innerHTML = liveEntries.map(row => `<article class="admin-live-row">
      <span class="admin-live-type">${escapeHtml(row.type)}</span>
      <span><strong>${escapeHtml(row.person)} · ${escapeHtml(row.material)}</strong><small>${escapeHtml(row.date ? new Date(`${dateKey(row.date)}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem data')} · ${escapeHtml(row.quantity)}</small></span>
      <span class="admin-live-status">${escapeHtml(row.status)}</span>
    </article>`).join('') || '<p class="admin-empty">Nenhum agendamento ou pedido em andamento.</p>';
    renderAccumulationChart(chartWeighings);
    $('#monitor-status').textContent = state.monitorLive ? 'Tempo real conectado' : 'Sincronização periódica';
  } catch (error) {
    body.innerHTML = `<tr><td colspan="8">Falha ao carregar atividade: ${escapeHtml(error.message || error)}</td></tr>`;
    $('#monitor-status').textContent = 'Falha na conexão';
    toast(`Não foi possível atualizar coletas e pedidos: ${error.message || error}`, true);
  }
}

function renderAccumulationChart(weighings) {
  const chart = $('#accumulation-chart');
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 29; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.push({ key: dateInputValue(date), label: String(date.getDate()), kg: 0, accumulated: 0 });
  }
  const byDate = new Map(days.map(day => [day.key, day]));
  weighings.forEach(row => {
    const day = byDate.get(dateKey(row.created_at));
    if (day) day.kg += Number(row.total_kg || 0);
  });
  let total = 0;
  days.forEach(day => { total += day.kg; day.accumulated = total; });
  $('#accumulation-total').textContent = `${formatNumber(total)} kg`;
  $('#accumulation-caption').textContent = `${formatNumber(weighings.reduce((sum, row) => sum + Number(row.total_kg || 0), 0))} kg no histórico carregado · acumulado nos últimos 30 dias`;
  const width = 760, height = 210, left = 42, right = 12, top = 16, bottom = 26;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const max = Math.max(1, ...days.map(day => day.accumulated));
  const points = days.map((day, index) => ({
    x: left + (days.length < 2 ? 0 : index / (days.length - 1) * plotWidth),
    y: top + plotHeight - day.accumulated / max * plotHeight
  }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${(top + plotHeight).toFixed(1)} L${points[0].x.toFixed(1)},${(top + plotHeight).toFixed(1)} Z`;
  const grid = [0, .5, 1].map(ratio => {
    const y = top + plotHeight * (1 - ratio);
    return `<line class="accumulation-grid" x1="${left}" y1="${y.toFixed(1)}" x2="${width - right}" y2="${y.toFixed(1)}"/><text x="${left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${formatNumber(max * ratio)}</text>`;
  }).join('');
  const labels = days.filter((_, index) => index % 5 === 0 || index === days.length - 1).map(day => {
    const index = days.indexOf(day);
    return `<text x="${points[index].x.toFixed(1)}" y="${height - 5}" text-anchor="middle">${day.label}</text>`;
  }).join('');
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Peso acumulado de ${formatNumber(total)} quilogramas nos últimos 30 dias"><defs><linearGradient id="admin-accumulation-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#39f77c" stop-opacity=".35"/><stop offset="100%" stop-color="#39f77c" stop-opacity="0"/></linearGradient></defs>${grid}<path class="accumulation-area" d="${area}"/><path class="accumulation-line" d="${line}"/>${labels}</svg>`;
}

function scheduleMonitorRefresh() {
  clearTimeout(state.monitorTimeout);
  state.monitorTimeout = setTimeout(() => {
    refreshMonitor();
  }, 450);
}

function refreshMonitor() {
  if (document.hidden) return;
  void Promise.all([loadOperations(), loadOverview()]);
}

function startMonitorFallback() {
  if (state.monitorTimer) return;
  state.monitorTimer = setInterval(refreshMonitor, 30000);
}

function stopMonitorFallback() {
  clearInterval(state.monitorTimer);
  state.monitorTimer = null;
}

function scheduleWalletRefresh() {
  if (!$('#admin-wallet').classList.contains('active')) return;
  clearTimeout(state.walletTimeout);
  state.walletTimeout = setTimeout(loadWallets, 450);
}

function subscribeToOperations() {
  state.monitorChannel = supabase.channel('admin-operations-monitor')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, scheduleMonitorRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleMonitorRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'weighings' }, scheduleMonitorRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'green_wallet' }, scheduleWalletRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'benefit_redemptions' }, scheduleWalletRefresh)
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        state.monitorLive = true;
        stopMonitorFallback();
        $('#monitor-status').textContent = 'Tempo real conectado';
        refreshMonitor();
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        state.monitorLive = false;
        $('#monitor-status').textContent = 'Sincronização periódica';
        startMonitorFallback();
      }
    });
}

async function deleteOperationRecord(button) {
  const table = button.dataset.deleteTable;
  const id = button.dataset.deleteId;
  if (!['collections', 'orders', 'weighings'].includes(table) || !/^\d+$/.test(id || '')) {
    toast('Registro inválido para exclusão.', true);
    return;
  }
  if (!window.confirm('Excluir este registro operacional? Esta ação não pode ser desfeita.')) return;
  button.disabled = true;
  try {
    const { data, error } = await supabase.from(table).delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro foi excluído. Verifique as permissões administrativas.');
    toast('Registro excluído.');
    await Promise.all([loadOperations(), loadOverview(), table === 'weighings' ? loadMaterials() : Promise.resolve()]);
  } catch (error) {
    button.disabled = false;
    toast(`Não foi possível excluir o registro: ${error.message || error}`, true);
  }
}

async function saveMaterial(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const payload = {
    name: $('#material-name').value.trim(),
    unit: $('#material-unit').value.trim(),
    reference_price: Number($('#material-price').value),
    active: true
  };
  if (!payload.name || !payload.unit || !Number.isFinite(payload.reference_price) || payload.reference_price < 0) {
    toast('Informe nome, unidade e preço válidos.', true);
    return;
  }
  button.disabled = true;
  try {
    const { error } = await supabase.from('materials').insert(payload);
    if (error) throw error;
    form.reset();
    $('#material-unit').value = 'kg';
    toast('Material cadastrado.');
    await loadMaterials();
    loadOverview();
  } catch (error) {
    toast(`Não foi possível cadastrar o material: ${error.message || error}`, true);
  } finally {
    button.disabled = false;
  }
}

function beginMaterialEdit(row, material) {
  row.innerHTML = `<td><input class="admin-inline-input edit-name" maxlength="100" aria-label="Nome" value="${escapeHtml(material.name)}"></td>
    <td><input class="admin-inline-input edit-unit" maxlength="20" aria-label="Unidade" value="${escapeHtml(material.unit)}"></td>
    <td><input class="admin-inline-input edit-price" type="number" min="0" step="0.01" aria-label="Preço" value="${Number(material.reference_price)}"></td>
    <td></td><td>${material.active ? 'Ativo' : 'Inativo'}</td>
    <td><div class="admin-row-actions"><button type="button" data-action="save">Salvar</button><button type="button" data-action="cancel">Cancelar</button></div></td>`;
}

async function handleMaterialAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const row = button.closest('tr');
  const material = state.materials.find(item => Number(item.id) === Number(row.dataset.materialId));
  if (!material) return;
  const action = button.dataset.action;
  if (action === 'edit') return beginMaterialEdit(row, material);
  if (action === 'cancel') return loadMaterials();
  if (action === 'save') {
    const payload = {
      name: row.querySelector('.edit-name').value.trim(),
      unit: row.querySelector('.edit-unit').value.trim(),
      reference_price: Number(row.querySelector('.edit-price').value)
    };
    if (!payload.name || !payload.unit || !Number.isFinite(payload.reference_price) || payload.reference_price < 0) {
      toast('Informe nome, unidade e preço válidos.', true);
      return;
    }
    button.disabled = true;
    const { error } = await supabase.from('materials').update(payload).eq('id', material.id);
    if (error) {
      button.disabled = false;
      toast(`Não foi possível salvar o material: ${error.message}`, true);
      return;
    }
    toast('Material atualizado.');
    await loadMaterials();
    return;
  }
  if (action === 'toggle') {
    const { error } = await supabase.from('materials').update({ active: !material.active }).eq('id', material.id);
    if (error) return toast(`Não foi possível alterar o status: ${error.message}`, true);
    await loadMaterials();
    return;
  }
  if (action === 'delete') {
    if (!window.confirm(`Excluir permanentemente "${material.name}"? O histórico das pesagens e dos pedidos será mantido sem o vínculo ao material.`)) return;
    button.disabled = true;
    const { error } = await supabase.rpc('delete_material_preserving_history', { p_material_id: material.id });
    if (error) {
      button.disabled = false;
      toast(`Não foi possível excluir o material. Verifique se a migração administrativa foi aplicada: ${error.message}`, true);
      return;
    }
    toast('Material excluído; histórico preservado.');
    await loadMaterials();
    loadOverview();
  }
}

function matchesDate(value, range) {
  const key = dateKey(value);
  return key >= range.start && key < range.end;
}

async function loadReport() {
  if (!state.profile) return;
  const requestId = ++state.reportRequest;
  try {
    const range = reportRange();
    const fromTime = new Date(`${range.start}T00:00:00`).toISOString();
    const toTime = new Date(`${range.end}T00:00:00`).toISOString();
    const timeQuery = (table, fields, column) => () => supabase.from(table).select(fields)
      .gte(column, fromTime).lt(column, toTime).order('id');
    const dateQuery = (table, fields, column) => () => supabase.from(table).select(fields)
      .gte(column, range.start).lt(column, range.end).order('id');
    const [profiles, orders, collections, weighings, oil] = await Promise.all([
      fetchAll(() => supabase.from('profiles').select('id,full_name,role').in('role', ['buyer', 'partner']).order('id')),
      fetchAll(timeQuery('orders', 'id,buyer_id,created_at,quantity_kg,material_name,status', 'created_at')),
      fetchAll(dateQuery('collections', 'id,partner_id,requested_date,type,status', 'requested_date')),
      fetchAll(timeQuery('weighings', 'id,partner_id,created_at,total_kg,material_name', 'created_at')),
      fetchAll(timeQuery('oil_collections', 'id,partner_id,created_at,liters,status', 'created_at'))
    ]);
    if (requestId !== state.reportRequest) return;
    state.report = { range, profiles, orders, collections, weighings, oil };
    renderReport();
  } catch (error) {
    if (requestId !== state.reportRequest) return;
    state.report = null;
    $('#report-chart').innerHTML = `<p>Falha ao carregar relatório: ${escapeHtml(error.message || error)}</p>`;
    toast(`Não foi possível gerar o relatório: ${error.message || error}`, true);
  }
}

function renderReport() {
  if (!state.report) return;
  const data = state.report;
  const buyerSearch = $('#report-buyer').value.trim().toLocaleLowerCase('pt-BR');
  const partnerSearch = $('#report-partner').value.trim().toLocaleLowerCase('pt-BR');
  const buyerIds = new Set(data.profiles.filter(profile => profile.role === 'buyer' && (!buyerSearch || (profile.full_name || '').toLocaleLowerCase('pt-BR').includes(buyerSearch))).map(profile => profile.id));
  const partnerIds = new Set(data.profiles.filter(profile => profile.role === 'partner' && (!partnerSearch || (profile.full_name || '').toLocaleLowerCase('pt-BR').includes(partnerSearch))).map(profile => profile.id));
  const orders = data.orders.filter(row => buyerIds.has(row.buyer_id));
  const collections = data.collections.filter(row => partnerIds.has(row.partner_id));
  const weighings = data.weighings.filter(row => partnerIds.has(row.partner_id));
  const oil = data.oil.filter(row => partnerIds.has(row.partner_id));
  const weight = weighings.reduce((sum, row) => sum + Number(row.total_kg || 0), 0);
  const liters = oil.reduce((sum, row) => sum + Number(row.liters || 0), 0);
  $('#report-orders').textContent = formatNumber(orders.length, 0);
  $('#report-collections').textContent = formatNumber(collections.length, 0);
  $('#report-weighings').textContent = formatNumber(weighings.length, 0);
  $('#report-weight').textContent = `${formatNumber(weight)} kg`;
  $('#report-oil').textContent = `${formatNumber(liters)} L`;
  $('#report-caption').textContent = data.range.mode === 'year' ? `Ano ${data.range.start.slice(0, 4)}` : data.range.mode === 'month' ? `Mês ${data.range.start.slice(0, 7)}` : `Dia ${new Date(`${data.range.start}T00:00:00`).toLocaleDateString('pt-BR')}`;
  const groups = makeGroups(data.range);
  const groupKey = value => {
    const key = dateKey(value);
    return data.range.mode === 'year' ? key.slice(0, 7) : data.range.mode === 'month' ? key : data.range.start;
  };
  orders.forEach(row => { const group = groups.get(groupKey(row.created_at)); if (group) group.orders++; });
  collections.forEach(row => { const group = groups.get(groupKey(row.requested_date)); if (group) group.collections++; });
  weighings.forEach(row => { const group = groups.get(groupKey(row.created_at)); if (group) { group.weighings++; group.weight += Number(row.total_kg || 0); } });
  oil.forEach(row => { const group = groups.get(groupKey(row.created_at)); if (group) group.oil += Number(row.liters || 0); });
  const rows = [...groups.values()];
  const materialTotals = weighings.reduce((map, row) => {
    const name = row.material_name || 'Material não identificado';
    map.set(name, (map.get(name) || 0) + Number(row.total_kg || 0));
    return map;
  }, new Map());
  $('#report-materials').innerHTML = [...materialTotals.entries()].sort((a, b) => b[1] - a[1])
    .map(([name, kg]) => `<tr><td>${escapeHtml(name)}</td><td>${formatNumber(kg)} kg</td></tr>`).join('')
    || '<tr><td colspan="2">Sem pesagens no período selecionado.</td></tr>';
  $('#report-details').innerHTML = rows.map(row => `<tr><td>${escapeHtml(row.label)}</td><td>${row.orders}</td><td>${row.collections}</td><td>${row.weighings}</td><td>${formatNumber(row.weight)}</td><td>${formatNumber(row.oil)}</td></tr>`).join('');
  $('#report-row-count').textContent = `${orders.length + collections.length + weighings.length + oil.length} registros`;
  data.filtered = { orders, collections, weighings, oil, rows, materialTotals };
  drawChart(rows);
}

function makeGroups(range) {
  const groups = new Map();
  const add = (key, label) => groups.set(key, { key, label, orders: 0, collections: 0, weighings: 0, weight: 0, oil: 0 });
  if (range.mode === 'year') {
    for (let month = 1; month <= 12; month++) {
      const key = `${range.start.slice(0, 4)}-${String(month).padStart(2, '0')}`;
      add(key, new Date(Date.UTC(Number(range.start.slice(0, 4)), month - 1, 1)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }));
    }
  } else if (range.mode === 'month') {
    const [year, month] = range.start.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const key = `${range.start.slice(0, 7)}-${String(day).padStart(2, '0')}`;
      add(key, String(day));
    }
  } else {
    add(range.start, new Date(`${range.start}T00:00:00`).toLocaleDateString('pt-BR'));
  }
  return groups;
}

function drawChart(rows) {
  const chart = $('#report-chart');
  const width = 960, height = 270, left = 42, right = 15, top = 18, bottom = 38;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const max = Math.max(1, ...rows.flatMap(row => [row.orders, row.collections, row.weighings]));
  const step = plotWidth / Math.max(rows.length, 1);
  const barWidth = Math.max(1, Math.min(13, (step - 7) / 3));
  const colors = ['#347ce5', '#17a65a', '#eca633'];
  const rects = rows.flatMap((row, index) => [row.orders, row.collections, row.weighings].map((value, series) => {
    const barHeight = value / max * plotHeight;
    const x = left + index * step + (step - barWidth * 3) / 2 + series * barWidth;
    const y = top + plotHeight - barHeight;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, barWidth - 2).toFixed(1)}" height="${Math.max(value ? 2 : 0, barHeight).toFixed(1)}" rx="2" fill="${colors[series]}"><title>${escapeHtml(row.label)} · ${value}</title></rect>`;
  })).join('');
  const stride = Math.max(1, Math.ceil(rows.length / 12));
  const labels = rows.filter((row, index) => index % stride === 0 || index === rows.length - 1).map(row => {
    const index = rows.indexOf(row);
    return `<text x="${(left + index * step + step / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle">${escapeHtml(row.label)}</text>`;
  }).join('');
  const grid = [0, 0.5, 1].map(ratio => {
    const y = top + plotHeight * (1 - ratio);
    return `<line class="grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"/><text x="${left - 8}" y="${y + 4}" text-anchor="end">${Math.round(max * ratio)}</text>`;
  }).join('');
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de pedidos, coletas e pesagens">${grid}${rects}${labels}</svg>`;
}

function asciiHex(value) {
  const safe = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?');
  return Array.from(safe, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function pdfDocument(streams) {
  const pageRefs = streams.map((_, index) => 5 + index * 2);
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map(id => `${id} 0 R`).join(' ')}] /Count ${streams.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  streams.forEach((stream, index) => {
    const page = pageRefs[index];
    objects[page] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${page + 1} 0 R >>`;
    objects[page + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function exportReportPdf() {
  if (!state.report?.filtered) return toast('Carregue um relatório antes de exportar.', true);
  const data = state.report;
  const { rows, materialTotals } = data.filtered;
  const pages = [];
  let commands = [];
  let y = 0;
  const text = (value, x, baseline, size = 9, bold = false, color = '0.12 0.2 0.15') => {
    commands.push(`${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${baseline.toFixed(1)} Td <${asciiHex(value).slice(0, 240)}> Tj ET`);
  };
  const line = (x1, y1, x2, y2) => commands.push(`0.87 0.91 0.88 RG 0.5 w ${x1} ${y1} m ${x2} ${y2} l S`);
  const rect = (x, baseline, width, height, color) => commands.push(`${color} rg ${x.toFixed(1)} ${baseline.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re f`);
  const finishPage = () => { pages.push(commands.join('\n')); commands = []; };
  const startPage = title => {
    if (commands.length) finishPage();
    text('ReciclaDin | Relatorio administrativo', 42, 805, 16, true, '0.05 0.42 0.2');
    text(title, 42, 783, 11, true);
    line(42, 774, 553, 774);
    y = 755;
  };
  startPage('Resumo e atividade operacional');
  text($('#report-caption').textContent, 42, y, 9);
  text(`Comprador: ${$('#report-buyer').value.trim() || 'Todos'} | Parceiro: ${$('#report-partner').value.trim() || 'Todos'}`, 42, y - 15, 8);
  const metrics = [
    ['Pedidos', $('#report-orders').textContent], ['Coletas', $('#report-collections').textContent],
    ['Pesagens', $('#report-weighings').textContent], ['Peso (kg)', $('#report-weight').textContent],
    ['Oleo (L)', $('#report-oil').textContent]
  ];
  metrics.forEach(([label, value], index) => {
    const x = 42 + (index % 3) * 171;
    const baseline = y - 65 - Math.floor(index / 3) * 51;
    rect(x, baseline, 158, 39, '0.94 0.97 0.95');
    text(label, x + 8, baseline + 24, 8);
    text(value, x + 8, baseline + 8, 12, true, '0.05 0.42 0.2');
  });
  const chartTop = y - 142;
  const chartBottom = chartTop - 112;
  const chartLeft = 56, chartRight = 545, chartHeight = chartTop - chartBottom;
  const max = Math.max(1, ...rows.flatMap(row => [row.orders, row.collections, row.weighings]));
  [0, 0.5, 1].forEach(ratio => {
    const baseline = chartBottom + chartHeight * ratio;
    line(chartLeft, baseline, chartRight, baseline);
    text(String(Math.round(max * ratio)), 41, baseline - 3, 7);
  });
  const step = (chartRight - chartLeft) / Math.max(rows.length, 1);
  const barWidth = Math.max(1, Math.min(10, (step - 5) / 3));
  const colors = ['0.2 0.49 0.9', '0.08 0.63 0.35', '0.92 0.61 0.15'];
  rows.forEach((row, index) => {
    [row.orders, row.collections, row.weighings].forEach((value, series) => {
      const height = value / max * chartHeight;
      if (!height) return;
      const x = chartLeft + index * step + (step - barWidth * 3) / 2 + series * barWidth;
      rect(x, chartBottom, Math.max(1, barWidth - 1), height, colors[series]);
    });
    if (index % Math.max(1, Math.ceil(rows.length / 14)) === 0 || index === rows.length - 1) {
      text(row.label, chartLeft + index * step, chartBottom - 11, 7);
    }
  });
  text('Pedidos', 75, chartTop + 11, 8); rect(60, chartTop + 8, 8, 8, colors[0]);
  text('Coletas', 170, chartTop + 11, 8); rect(155, chartTop + 8, 8, 8, colors[1]);
  text('Pesagens', 265, chartTop + 11, 8); rect(250, chartTop + 8, 8, 8, colors[2]);
  startPage('Materiais e detalhamento por período');
  const table = (title, headers, dataRows, widths) => {
    const drawHeader = () => {
      text(title, 42, y, 11, true, '0.05 0.42 0.2');
      y -= 22;
      let x = 42;
      headers.forEach((header, index) => { text(header, x, y, 7, true); x += widths[index]; });
      y -= 8;
      line(42, y, 553, y);
      y -= 14;
    };
    drawHeader();
    dataRows.forEach(row => {
      if (y < 52) { startPage(`${title} (continuacao)`); drawHeader(); }
      let x = 42;
      row.forEach((value, index) => { text(String(value), x, y, 7); x += widths[index]; });
      line(42, y - 4, 553, y - 4);
      y -= 15;
    });
    y -= 20;
  };
  const materials = [...materialTotals.entries()].sort((a, b) => b[1] - a[1]);
  table('Volume pesado por material', ['Material', 'Quantidade'], materials.length ? materials.map(([name, kg]) => [name, `${formatNumber(kg)} kg`]) : [['Sem pesagens no periodo', '0 kg']], [320, 191]);
  table('Atividade por período', ['Data', 'Pedidos', 'Coletas', 'Pesagens', 'Kg', 'Oleo L'], rows.map(row => [row.label, row.orders, row.collections, row.weighings, formatNumber(row.weight), formatNumber(row.oil)]), [95, 65, 65, 65, 100, 121]);
  finishPage();
  const blob = pdfDocument(pages);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-recicladin-${data.range.start.replace(/-/g, '')}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

initialize().catch(error => toast(`Não foi possível abrir a área administrativa: ${error.message || error}`, true));
