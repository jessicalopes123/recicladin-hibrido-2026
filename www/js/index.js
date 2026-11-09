import { supabase, isSupabaseConfigured } from './supabase.js';

const form = document.querySelector('#index-admin-form');
const emailField = document.querySelector('#index-admin-email');
const passwordField = document.querySelector('#index-admin-password');
const submitButton = document.querySelector('#index-admin-submit');
const message = document.querySelector('#index-admin-message');

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.classList.add('hidden');

  if (!isSupabaseConfigured()) {
    message.textContent = 'O Supabase não está configurado neste projeto.';
    message.classList.add('error');
    message.classList.remove('hidden');
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

    window.location.href = 'admin/index.html';
  } catch (error) {
    message.textContent = error instanceof Error
      ? error.message
      : 'Não foi possível entrar no painel administrativo.';
    message.classList.add('error');
    message.classList.remove('hidden');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Entrar como administrador';
  }
});
