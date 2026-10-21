const EMAILJS_SERVICE_ID = 'service_450hjua';
const EMAILJS_TEMPLATE_ID = 'template_0c5t1me';
const EMAILJS_PUBLIC_KEY = 'wkdcuRTtGom34U51P';

export const isRatingEmailConfigured = () =>
  ![EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY].some(value => value.startsWith('COLE_'));

export async function sendRatingEmail({ name, email, profile, rating, comment }) {
  if (!isRatingEmailConfigured()) {
    throw new Error('O serviço de e-mail ainda não foi configurado.');
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        name,
        email,
        profile,
        rating,
        comment: comment || '(sem comentário)'
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`O serviço de e-mail recusou a avaliação (${response.status}): ${details}`);
  }
}
