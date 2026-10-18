(() => {
 const $=selector=>document.querySelector(selector);
 const element=(tag,content,className)=>{const el=document.createElement(tag);if(content!=null)el.textContent=content;if(className)el.className=className;return el;};
 const button=(label,callback)=>{const el=element('button',label,'button outline');el.type='button';el.addEventListener('click',async()=>{el.disabled=true;try{await callback();}catch(error){$('#crew-status').textContent=error.message;}finally{el.disabled=false;}});return el;};
 async function api(path,options={}){
  const response=await fetch(path,{cache:'no-store',...options});const payload=await response.json();if(!response.ok)throw Object.assign(new Error(payload.error||'The request could not be completed.'),{status:response.status});return payload;
 }
 const post=(path,data)=>api(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
 let user;
 async function init(){
  try{user=await api('/api/me');}catch(error){if(error.status!==401){const target=$('#application-state')||$('#crew-status');if(target)target.textContent=error.message;}return;}
  if($('#team-application'))await applicationPage();if($('#crew-account'))await crewPage();
 }
 async function applicationPage(){
  $('#application-auth').hidden=true;const form=$('#team-application');
  const {application}=await api('/api/my-application');if(application){$('#application-state').textContent='Your application is '+application.status+'. Check the crew portal for access.';return;}
  form.hidden=false;form.elements.email.value=user.email;
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const file=form.elements.portfolio.files[0];if(file?.size>8*1024*1024){$('#application-state').textContent='Please choose a portfolio of 8 MB or smaller.';return;}
   const data=new FormData(form);if(!data.getAll('disciplines').length){$('#application-state').textContent='Choose photography, videography or both.';return;}
   const submit=form.querySelector('[type=submit]');submit.disabled=true;$('#application-state').textContent='Uploading your application…';
   try{const result=await api('/api/applications',{method:'POST',body:data});$('#application-state').textContent=result.message;form.hidden=true;}catch(error){$('#application-state').textContent=error.message;}finally{submit.disabled=false;}
  });
 }
 async function crewPage(){
  $('#crew-auth').hidden=true;$('#crew-account').hidden=false;$('#crew-identity').textContent='Signed in as '+user.email;
  if(!['crew','admin'].includes(user.role)){
   const {application}=await api('/api/my-application');$('#crew-status').textContent=application?'Your application is '+application.status+'. Show access is available after BSE approval.':'Submit a team application to request crew access.';
   const link=element('a','Team application','text-link');link.href='join-the-team.html';$('#crew-status').after(link);return;
  }
  $('#approved-workspace').hidden=false;$('#refresh-shows').addEventListener('click',()=>loadShows().catch(error=>$('#crew-status').textContent=error.message));await loadShows();
  if(user.role==='admin'){
   $('#admin-workspace').hidden=false;await loadAdministration();
   $('#create-show').addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const data=Object.fromEntries(new FormData(form));data.eventDate=new Date(data.eventDate).toISOString();data.photographers=Number(data.photographers);data.videographers=Number(data.videographers);
    const submit=form.querySelector('[type=submit]');submit.disabled=true;
    try{await post('/api/shows',data);$('#show-form-status').textContent='Approved show posted.';form.reset();await loadShows();}catch(error){$('#show-form-status').textContent=error.message;}finally{submit.disabled=false;}
   });
  }
 }
 async function loadShows(){
  const {shows}=await api('/api/shows');const list=$('#show-list');list.replaceChildren();
  if(!shows.length){list.append(element('p','No approved shows have been posted yet.','muted'));return;}
  for(const show of shows){
   const card=element('article',null,'show-card');card.append(element('p',show.status==='open'?'OPEN FOR CREW':'CLOSED','eyebrow'),element('h3',show.title),element('p',new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Los_Angeles'}).format(new Date(show.event_date))+' · Las Vegas time','show-date'),element('p',show.venue),element('p',show.details,'show-details'));
   const own=show.slots.find(slot=>slot.mine);const actions=element('div',null,'show-actions');
   for(const [role,label]of [['photo','Photography'],['video','Videography']]){
    const available=show.slots.filter(slot=>slot.discipline===role&&slot.available).length;
    const total=show.slots.filter(slot=>slot.discipline===role).length;if(!total)continue;
    card.append(element('p',`${label}: ${available} of ${total} slots available`,'muted'));
    if(!own&&available&&show.status==='open'&&user.disciplines.includes(role))actions.append(button('Accept '+label.toLowerCase(),async()=>{await post('/api/shows/'+show.id+'/claim',{discipline:role});$('#crew-status').textContent='You accepted '+show.title+'.';await loadShows();}));
   }
   if(own){card.append(element('p','You’re assigned to '+(own.discipline==='photo'?'photography':'videography')+'.','assignment-status'));actions.append(button('Release my slot',async()=>{await post('/api/shows/'+show.id+'/release',{});$('#crew-status').textContent='Your slot was released.';await loadShows();}));}
   if(user.role==='admin'){
    const assigned=show.slots.filter(slot=>!slot.available);if(assigned.length)card.append(element('p','Assigned crew: '+assigned.map(slot=>(slot.memberName||'Crew member')+' ('+slot.discipline+')').join(', '),'muted'));
    actions.append(button(show.status==='open'?'Close signups':'Reopen signups',async()=>{await post('/api/shows/'+show.id+'/status',{status:show.status==='open'?'closed':'open'});await loadShows();}));
   }
   card.append(actions);list.append(card);
  }
 }
 async function loadAdministration(){
  const [{applications},{members}]=await Promise.all([api('/api/admin/applications'),api('/api/admin/members')]);
  const list=$('#application-list');list.replaceChildren();if(!applications.length)list.append(element('p','No applications to review.','muted'));
  applications.forEach(application=>{
   const card=element('article',null,'review-card');card.append(element('h4',application.name),element('p',application.email+' · '+application.disciplines.join(' / ')+' · '+application.status,'muted'),element('p',application.about));
   const download=element('a','Download private portfolio','text-link');download.href='/api/portfolios/'+application.id;download.target='_blank';download.rel='noopener';card.append(download);
   if(application.portfolio_url){const link=element('a','Portfolio website','text-link');link.href=application.portfolio_url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
   const actions=element('div',null,'show-actions');
   for(const [status,label]of [['approved','Approve crew access'],['declined','Decline application']])actions.append(button(label,async()=>{await post('/api/admin/applications/'+application.id,{status});$('#crew-status').textContent='Application '+status+'.';await loadAdministration();}));
   card.append(actions);list.append(card);
  });
  const crew=$('#member-list');crew.replaceChildren();if(!members.length)crew.append(element('p','Approved applicants will appear here.','muted'));
  members.forEach(member=>{const row=element('article',null,'review-card');row.append(element('h4',member.name),element('p',member.email+' · '+member.status+' · '+member.disciplines.join(' / '),'muted'));row.append(button(member.status==='approved'?'Revoke access':'Approve access',async()=>{await post('/api/admin/members/'+encodeURIComponent(member.user_id),{status:member.status==='approved'?'revoked':'approved',disciplines:member.disciplines});await loadAdministration();}));crew.append(row);});
 }
 init().catch(error=>{const target=$('#application-state')||$('#crew-status');if(target)target.textContent=error.message;});
})();
