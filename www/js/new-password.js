import { supabase, isSupabaseConfigured } from './supabase.js';
import { bindPasswordRequirements, isPasswordValid } from './password-rules.js';
const form=document.getElementById('new-password-form'); const msg=document.getElementById('new-msg');
const passwordField=document.getElementById('password');
bindPasswordRequirements(passwordField,document.getElementById('password-requirements'));
form.addEventListener('submit',async e=>{e.preventDefault();if(!isSupabaseConfigured())return;const p=passwordField.value,c=document.getElementById('confirm').value;if(!isPasswordValid(p)||p!==c){msg.textContent='A senha deve atender aos requisitos indicados e as duas senhas devem ser iguais.';return;}const {error}=await supabase.auth.updateUser({password:p});msg.textContent=error?error.message:'Senha alterada com sucesso!';if(!error)setTimeout(()=>location.href='login.html',1200);});
