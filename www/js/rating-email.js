const EMAILJS_SERVICE_ID = "service_450hjua";
const EMAILJS_TEMPLATE_ID = "template_0c5tlme";
const EMAILJS_PUBLIC_KEY = "wkdcuRTtGom34U51P";

export const isRatingEmailConfigured = () =>
  ![EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY].some((value) =>
    value.startsWith("COLE_"),
  );

async function sendEmail(templateParams) {
  if (!isRatingEmailConfigured()) {
    throw new Error("O serviço de e-mail ainda não foi configurado.");
  }

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `O serviço de e-mail recusou o envio (${response.status}): ${details}`,
    );
  }
}

export async function sendRatingEmail({
  name,
  email,
  profile,
  rating,
  comment,
  time,
  message,
}) {
  await sendEmail({
    name,
    email,
    profile,
    rating,
    comment: comment || "(sem comentário)",
    time,
    message: message || comment || "(sem comentário)",
  });
}

export async function sendRequestEmail({
  name,
  email,
  role,
  subject,
  type,
  requestedDate,
  item,
  quantity,
  notes,
  time,
}) {
  const message = [
    subject,
    `Nome: ${name}`,
    `Perfil: ${role}`,
    `E-mail de contato: ${email}`,
    type ? `Tipo de coleta: ${type}` : "",
    requestedDate ? `Data desejada: ${requestedDate}` : "",
    item ? `Material solicitado: ${item}` : "",
    quantity ? `Quantidade: ${quantity}` : "",
    `Observações: ${notes || "(sem observações)"}`,
    `Enviado em: ${time}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({
    name,
    email,
    profile: role,
    role,
    subject,
    event: subject,
    type: type || "",
    requested_date: requestedDate || "",
    item: item || "",
    quantity: quantity || "",
    notes: notes || "(sem observações)",
    rating: subject,
    comment: notes || "(sem observações)",
    time,
    message,
  });
}
