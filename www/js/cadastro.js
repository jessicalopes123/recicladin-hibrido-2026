import { supabase, isSupabaseConfigured } from './supabase.js';
import { bindPasswordRequirements, isPasswordValid } from './password-rules.js';

const form=document.getElementById('auth-form');
const toastEl=document.getElementById('toast');
const passwordField=document.getElementById('password');
bindPasswordRequirements(passwordField,document.getElementById('password-requirements'));
const toast=(message,error=false)=>{
  toastEl.textContent=message;
  toastEl.className='toast'+(error?' error':'');
  toastEl.classList.remove('hidden');
  setTimeout(()=>toastEl.classList.add('hidden'),4500);
};

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!isSupabaseConfigured())return toast('Configure a Publishable Key em js/supabase.js.',true);

  const password=document.getElementById('password').value;
  const confirmation=document.getElementById('confirm-password').value;
  if(!isPasswordValid(password))return toast('A senha deve atender a todos os requisitos indicados.',true);
  if(password!==confirmation)return toast('As senhas não conferem.',true);
  if(!document.getElementById('terms-check').checked)return toast('Aceite os Termos e a Política de Privacidade para continuar.',true);

  const submit=document.getElementById('submit-auth');
  submit.disabled=true;
  submit.textContent='Aguarde...';
  try{
    const {data,error}=await supabase.auth.signUp({
      email:document.getElementById('email').value.trim(),
      password,
      options:{data:{
        full_name:document.getElementById('name').value.trim(),
        role:document.getElementById('role').value,
        accepted_terms:true
      }}
    });
    if(error)throw error;
    toast(data.session?'Conta criada!':'Conta criada. Verifique seu e-mail para confirmar.');
    if(data.session)setTimeout(()=>location.href='app.html',800);
  }catch(error){
    toast(error.message||'Não foi possível criar a conta.',true);
  }finally{
    submit.disabled=false;
    submit.textContent='Criar conta';
  }
});
