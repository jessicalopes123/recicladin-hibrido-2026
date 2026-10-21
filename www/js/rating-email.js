const EMAILJS_SERVICE_ID = 'COLE_SEU_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'COLE_SEU_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'COLE_SUA_PUBLIC_KEY';

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
