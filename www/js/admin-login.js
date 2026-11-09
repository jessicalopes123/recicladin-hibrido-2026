import { supabase, isSupabaseConfigured } from './supabase.js';

const form = document.querySelector('#admin-login-form');
const emailField = document.querySelector('#admin-email');
const passwordField = document.querySelector('#admin-password');
const submitButton = document.querySelector('#admin-login-submit');
const message = document.querySelector('#admin-login-message');

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
  message.classList.remove('hidden');
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isSupabaseConfigured()) {
    showMessage('O Supabase não está configurado neste projeto.', true);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Verificando acesso...';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailField.value.trim(),
      password: passwordField.value
    });
    if (error) throw error;
    if (!data.user) throw new Error('Não foi possível identificar a conta autenticada.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    if (profile?.role !== 'admin') {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      throw new Error('Esta conta não tem permissão de administrador.');
    }

    window.location.href = '../admin/index.html';
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Não foi possível entrar no painel administrativo.', true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Entrar no painel';
  }
});
