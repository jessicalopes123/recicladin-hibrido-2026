import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function jsonResponse(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Método não permitido.' });

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const recipient = Deno.env.get('RECICLADIN_NOTIFICATION_EMAIL');
  const sender = Deno.env.get('RESEND_FROM_EMAIL');

  if (!authorization || !supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(401, { error: 'Sessão inválida ou configuração Supabase ausente.' });
  }
  if (!resendApiKey || !recipient || !sender) {
    return jsonResponse(500, { error: 'Configure RESEND_API_KEY, RECICLADIN_NOTIFICATION_EMAIL e RESEND_FROM_EMAIL nos secrets da Edge Function.' });
  }

  let payload: { operation?: string; record_id?: number };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Corpo da solicitação inválido.' });
  }
  if (!['recycling', 'oil'].includes(payload.operation || '') ||
      !Number.isSafeInteger(payload.record_id) || Number(payload.record_id) < 1) {
    return jsonResponse(400, { error: 'Operação ou identificação do agendamento inválida.' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return jsonResponse(401, { error: 'Não foi possível validar a sessão do parceiro.' });

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('full_name,role').eq('id', user.id).maybeSingle();
  if (profileError) return jsonResponse(500, { error: 'Não foi possível validar o perfil do parceiro.' });
  if (profile?.role !== 'partner') return jsonResponse(403, { error: 'Apenas parceiros podem notificar novos agendamentos.' });

  const isOil = payload.operation === 'oil';
  const table = isOil ? 'oil_collections' : 'collections';
  const columns = isOil
    ? 'requested_date,requested_period,notes,liters'
    : 'requested_date,requested_period,notes,type';
  const { data: booking, error: bookingError } = await supabase
    .from(table).select(columns).eq('id', payload.record_id).eq('partner_id', user.id).maybeSingle();
  if (bookingError) return jsonResponse(500, { error: 'Não foi possível carregar o agendamento salvo.' });
  if (!booking) return jsonResponse(404, { error: 'Agendamento não encontrado para este parceiro.' });

  const date = String(booking.requested_date || 'Data não informada');
  const period = booking.requested_period === 'manha' ? 'Manhã' : booking.requested_period === 'tarde' ? 'Tarde' : 'Período não informado';
  const kind = isOil ? 'Retirada de Óleo Usado' : 'Retirada de Reciclagem';
  const quantity = isOil ? `Quantidade estimada: ${booking.liters} litros.` : '';
  const materials = booking.notes ? `Materiais/observações: ${booking.notes}` : '';
  const text = [
    `Atenção ReciclaDin: ${profile.full_name || 'Parceiro'} acabou de agendar uma coleta.`,
    `Condomínio/parceiro: ${profile.full_name || 'Nome não informado'}`,
    `Tipo: ${kind}`,
    `Data: ${date}`,
    `Período: ${period}`,
    quantity,
    materials,
    `E-mail da conta: ${user.email || 'não informado'}`
  ].filter(Boolean).join('\n');

  let emailResponse: Response;
  try {
    emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: `Novo agendamento ReciclaDin · ${kind}`,
        text
      })
    });
  } catch (error) {
    console.error('Falha de conexão com o provedor de e-mail:', error);
    return jsonResponse(502, { error: 'O agendamento foi salvo, mas não foi possível conectar ao provedor de e-mail.' });
  }
  if (!emailResponse.ok) {
    console.error(`Provedor de e-mail respondeu com HTTP ${emailResponse.status}.`);
    return jsonResponse(502, { error: 'O agendamento foi salvo, mas o provedor não aceitou o alerta por e-mail.' });
  }

  return jsonResponse(200, { message: 'Alerta de agendamento enviado.' });
});
