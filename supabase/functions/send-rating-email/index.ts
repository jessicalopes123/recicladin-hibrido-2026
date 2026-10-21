import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, body: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Método não permitido." });
  }

  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return jsonResponse(401, { error: "É necessário entrar na conta para avaliar." });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Dados da avaliação inválidos." });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse(400, { error: "Dados da avaliação inválidos." });
  }

  const body = payload as Record<string, unknown>;
  const rating = body.rating;
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 2000) {
    return jsonResponse(400, { error: "Informe uma nota de 1 a 5 e um comentário de até 2000 caracteres." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const sender = Deno.env.get("RATING_NOTIFICATION_FROM");
  const recipient = Deno.env.get("RATING_NOTIFICATION_TO");
  if (!supabaseUrl || !supabaseAnonKey || !resendApiKey || !sender || !recipient) {
    console.error("Rating email is missing required Supabase or Resend configuration.");
    return jsonResponse(500, { error: "O envio de avaliações ainda não está configurado." });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user?.email) {
    return jsonResponse(401, { error: "Não foi possível validar sua conta." });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not load the rating author's profile:", profileError.message);
    return jsonResponse(500, { error: "Não foi possível carregar os dados da conta." });
  }
  if (!profile || !["partner", "buyer"].includes(profile.role)) {
    return jsonResponse(403, { error: "Somente parceiros e compradores podem enviar avaliações." });
  }

  const name = profile.full_name.trim() || authData.user.email;
  const text = [
    "Nova avaliação do aplicativo ReciclaDin",
    "",
    `Nome: ${name}`,
    `E-mail: ${authData.user.email}`,
    `Perfil: ${profile.role === "partner" ? "Parceiro" : "Comprador"}`,
    `Nota: ${rating}/5`,
    "",
    "Comentário:",
    comment || "(sem comentário)",
  ].join("\n");

  let mailResponse: Response;
  try {
    mailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: `Nova avaliação ReciclaDin (${rating}/5) — ${name}`,
        text,
      }),
    });
  } catch (error) {
    console.error("Could not reach the email provider:", error);
    return jsonResponse(502, { error: "Não foi possível conectar ao serviço de e-mail. Tente novamente mais tarde." });
  }

  if (!mailResponse.ok) {
    console.error("Resend rejected the rating notification:", mailResponse.status, await mailResponse.text());
    return jsonResponse(502, { error: "O serviço de e-mail não aceitou a avaliação. Tente novamente mais tarde." });
  }

  return jsonResponse(200, { message: "Avaliação enviada." });
});
