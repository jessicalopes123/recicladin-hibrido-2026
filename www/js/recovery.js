import { supabase, isSupabaseConfigured } from './supabase.js';

const form = document.getElementById('recovery-form');
const message = document.getElementById('recovery-msg');
const submit = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = '';

  if (!isSupabaseConfigured()) {
    message.textContent = 'O serviço de recuperação de senha não está configurado.';
    return;
  }

  const email = document.getElementById('email').value.trim();
  const originalLabel = submit.textContent;
  submit.disabled = true;
  submit.textContent = 'Enviando link...';

  try {
    const redirectTo = new URL('nova-senha.html', window.location.href).href;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;

    message.textContent = 'Se o e-mail estiver cadastrado, enviaremos um link seguro para redefinir a senha.';
  } catch (error) {
    message.textContent = `Não foi possível enviar o link: ${error.message || error}`;
  } finally {
    submit.disabled = false;
    submit.textContent = originalLabel;
  }
});
