import { supabase, isSupabaseConfigured } from './supabase.js';
import { bindPasswordRequirements, isPasswordValid } from './password-rules.js';

const form = document.getElementById('new-password-form');
const message = document.getElementById('new-msg');
const passwordField = document.getElementById('password');
const confirmField = document.getElementById('confirm');
const confirmMessage = document.getElementById('confirm-message');
const submit = form.querySelector('button[type="submit"]');

bindPasswordRequirements(passwordField, document.getElementById('password-requirements'));

function updateConfirmation() {
  const mismatch = confirmField.value.length > 0 && confirmField.value !== passwordField.value;
  confirmField.setCustomValidity(mismatch ? 'As senhas não conferem.' : '');
  confirmField.setAttribute('aria-invalid', String(mismatch));
  confirmMessage.textContent = mismatch ? 'As senhas não conferem.' : '';
}

passwordField.addEventListener('input', updateConfirmation);
confirmField.addEventListener('input', updateConfirmation);

async function initialize() {
  form.querySelectorAll('input, button').forEach(control => {
    control.disabled = true;
  });

  if (!isSupabaseConfigured()) {
    message.textContent = 'O serviço de redefinição de senha não está configurado.';
    return;
  }

  const params = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`);
  const linkError = params.get('error_description') || params.get('error');
  if (linkError) {
    message.textContent = `O link de redefinição não é válido: ${linkError}`;
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      message.textContent = 'O link está inválido ou expirou. Solicite um novo link para redefinir sua senha.';
      return;
    }

    form.querySelectorAll('input, button').forEach(control => {
      control.disabled = false;
    });
    passwordField.focus();
  } catch (error) {
    message.textContent = `Não foi possível validar o link: ${error.message || error}`;
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = '';
  updateConfirmation();

  if (!isSupabaseConfigured()) {
    message.textContent = 'O serviço de redefinição de senha não está configurado.';
    return;
  }
  if (!isPasswordValid(passwordField.value)) {
    message.textContent = 'A senha deve atender a todos os requisitos indicados.';
    passwordField.focus();
    return;
  }
  if (passwordField.value !== confirmField.value) {
    message.textContent = 'As senhas não conferem.';
    confirmField.focus();
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Salvando senha...';
  try {
    const { error } = await supabase.auth.updateUser({ password: passwordField.value });
    if (error) throw error;

    form.hidden = true;
    message.textContent = 'Senha alterada com sucesso. Você será encaminhado para entrar com a nova senha.';
    window.setTimeout(() => {
      window.location.replace('login.html?password=updated');
    }, 1200);
  } catch (error) {
    message.textContent = `Não foi possível atualizar a senha: ${error.message || error}`;
    submit.disabled = false;
    submit.textContent = 'Salvar nova senha';
  }
});

initialize();
