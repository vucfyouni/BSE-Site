(() => {
 const $=selector=>document.querySelector(selector);
 async function api(path,options={}){
  const response=await fetch(path,{cache:'no-store',...options});const payload=await response.json();if(!response.ok)throw Object.assign(new Error(payload.error||'The request could not be completed.'),{status:response.status});return payload;
 }
 let user;
 async function init(){
  try{user=await api('/api/me');}catch(error){if(error.status!==401){const target=$('#application-state');if(target)target.textContent=error.message;}return;}
  if($('#team-application'))await applicationPage();
 }
 async function applicationPage(){
  $('#application-auth').hidden=true;const form=$('#team-application');
  const {application}=await api('/api/my-application');if(application){$('#application-state').textContent='Your application is '+application.status+'.';return;}
  form.hidden=false;form.elements.email.value=user.email;
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const file=form.elements.portfolio.files[0];if(file?.size>8*1024*1024){$('#application-state').textContent='Please choose a portfolio of 8 MB or smaller.';return;}
   const data=new FormData(form);if(!data.getAll('disciplines').length){$('#application-state').textContent='Choose photography, videography or both.';return;}
   const submit=form.querySelector('[type=submit]');submit.disabled=true;$('#application-state').textContent='Uploading your application…';
   try{const result=await api('/api/applications',{method:'POST',body:data});$('#application-state').textContent=result.message;form.hidden=true;}catch(error){$('#application-state').textContent=error.message;}finally{submit.disabled=false;}
  });
 }
 init().catch(error=>{const target=$('#application-state');if(target)target.textContent=error.message;});
})();
