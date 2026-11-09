import { supabase, isSupabaseConfigured } from './supabase.js';
import { bindPasswordRequirements, isPasswordValid } from './password-rules.js';

const toast = (msg, error=false) => {
  const el=document.getElementById('toast'); if(!el)return;
  el.textContent=msg; el.className='toast'+(error?' error':''); el.classList.remove('hidden');
  setTimeout(()=>el.classList.add('hidden'),4200);
};
const form=document.getElementById('auth-form');
const modeLogin=document.getElementById('mode-login');
const modeSignup=document.getElementById('mode-signup');
const password=document.getElementById('password');
bindPasswordRequirements(document.getElementById('password'),document.getElementById('password-requirements'));
const confirmPassword=document.getElementById('confirm-password');
const nameField=document.getElementById('name');
const termsCheck=document.getElementById('terms-check');
const roleField=document.getElementById('role');
const submit=document.getElementById('submit-auth');
const signupOnly=document.querySelectorAll('.signup-only');
const title=document.getElementById('auth-title');
const subtitle=document.getElementById('auth-subtitle');
const togglePassword=document.getElementById('toggle-password');
const recovery=document.getElementById('recovery-link');
let isLogin=true;

function setMode(login){
 isLogin=login; modeLogin.classList.toggle('active',login); modeSignup.classList.toggle('active',!login);
 signupOnly.forEach(x=>x.classList.toggle('hidden',login));
 document.getElementById('login-password-guidance')?.classList.toggle('hidden',!login);
 password.autocomplete=login?'current-password':'new-password';
 if(login) password.setAttribute('aria-describedby','login-password-guidance');
 else password.setAttribute('aria-describedby','password-requirements');
 if(termsCheck) termsCheck.required=!login;
 title.textContent=login?'Bem-vinda de volta':'Crie sua conta';
 subtitle.textContent=login?'Acesse sua plataforma de reciclagem.':'Cadastre seu perfil para começar a usar o ReciclaDin.';
 submit.textContent=login?'Entrar':'Criar conta'; recovery.classList.toggle('hidden',!login);
}
async function redirectToUserDashboard(userId){
 const {data:profile,error}=await supabase.from('profiles').select('role,is_active').eq('id',userId).maybeSingle();
 if(error)throw error;
 if(profile?.is_active===false){
  const {error:signOutError}=await supabase.auth.signOut();
  if(signOutError)throw signOutError;
  location.replace('login.html?account=inactive');
  return;
 }
 location.href=profile?.role==='admin'?'../admin/index.html':'app.html';
}
modeLogin?.addEventListener('click',()=>setMode(true)); modeSignup?.addEventListener('click',()=>setMode(false));
togglePassword?.addEventListener('click',()=>{password.type=password.type==='password'?'text':'password';togglePassword.textContent=password.type==='password'?'◉':'◉̸'});

form?.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!isSupabaseConfigured()){toast('Falta colocar a Publishable Key em js/supabase.js.',true);return;}
 submit.disabled=true; submit.textContent='Aguarde...';
 try{
  const email=document.getElementById('email').value.trim();
  const pwd=password.value;
  if(!isLogin){
   if(!termsCheck?.checked) throw new Error('Aceite os Termos e a Política de Privacidade para continuar.');
   if(!isPasswordValid(pwd)) throw new Error('A senha deve atender a todos os requisitos indicados.');
   if(pwd!==confirmPassword.value) throw new Error('As senhas não conferem.');
   const {data,error}=await supabase.auth.signUp({email,password:pwd,options:{data:{full_name:nameField.value.trim(),role:roleField.value,accepted_terms:true}}});
   if(error)throw error;
   toast(data.session?'Cadastro realizado!':'Cadastro realizado. Verifique seu e-mail para confirmar a conta.');
   if(data.session) await redirectToUserDashboard(data.user.id);
  }else{
   const {data,error}=await supabase.auth.signInWithPassword({email,password:pwd}); if(error)throw error;
   await redirectToUserDashboard(data.user.id);
  }
 }catch(err){toast(err.message||'Não foi possível concluir a operação.',true)}
 finally{submit.disabled=false;submit.textContent=isLogin?'Entrar':'Criar conta'}
});

recovery?.addEventListener('click',()=>location.href='recuperar.html');
document.getElementById('terms-check')?.addEventListener('change',e=>{submit.disabled=!e.target.checked});

const authQuery = new URLSearchParams(location.search);
if(authQuery.get('account')==='inactive'||authQuery.get('account')==='deactivated'){
 const signOutFailed=authQuery.get('signout')==='failed';
 toast(signOutFailed
  ?'A conta foi desativada, mas a sessão não foi encerrada. Feche e abra o aplicativo novamente; fale com o administrador para reativá-la.'
  :'Esta conta está desativada. Fale com o administrador para solicitar a reativação.',true);
 authQuery.delete('account');
 authQuery.delete('signout');
}
if(authQuery.get('password')==='updated'){
 toast('Senha atualizada. Entre usando sua nova senha.');
 authQuery.delete('password');
}
if(location.search){
 const query=authQuery.toString();
 history.replaceState(null,'',`${location.pathname}${query?`?${query}`:''}${location.hash}`);
}
