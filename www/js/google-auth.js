import { supabase, isSupabaseConfigured } from './supabase.js';

const button = document.getElementById('google-login');
const toast = document.getElementById('toast');

function showError(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast error';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4200);
}

async function signInWithGoogle() {
  if (!isSupabaseConfigured()) {
    showError('Configure a Publishable Key primeiro.');
    return;
  }

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Conectando ao Google...';

  try {
    const redirectTo = new URL('app.html', window.location.href).href;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (error) throw error;
  } catch (error) {
    showError(error.message || 'Não foi possível entrar com o Google.');
    button.disabled = false;
    button.textContent = originalText;
  }
}

button?.addEventListener('click', signInWithGoogle);
