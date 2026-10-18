const MAX_FILE=8*1024*1024,MAX_BODY=MAX_FILE+256*1024;
const now=()=>new Date().toISOString(),uid=()=>crypto.randomUUID();
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
function fail(status,message){throw Object.assign(new Error(message),{status});}
function text(value,max=200){return typeof value==='string'?value.trim().slice(0,max):'';}
function email(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
function disciplines(value){return [...new Set((Array.isArray(value)?value:[]).filter(v=>['photo','video'].includes(v)))];}
function identity(request,env){
 const id=request.headers.get('oai-authenticated-user-id'),address=request.headers.get('oai-authenticated-user-email');
 if(!id||!address)fail(401,'Sign in with ChatGPT to continue.');
 const admins=(env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 return {id,email:address,admin:admins.includes(address.toLowerCase())};
}
async function viewer(request,env){
 const user=identity(request,env);
 const member=await env.DB.prepare('SELECT * FROM members WHERE user_id=?').bind(user.id).first();
 return {...user,name:member?.name||user.email,status:user.admin?'admin':member?.status||'pending',disciplines:user.admin?['photo','video']:JSON.parse(member?.disciplines||'[]')};
}
function requireAdmin(user){if(!user.admin)fail(403,'Administrator access is required.');}
async function boundedBody(request,limit){
 if(Number(request.headers.get('content-length')||0)>limit)fail(413,'The upload is too large. Maximum portfolio size is 8 MB.');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();const parts=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();fail(413,'The request is too large.');}parts.push(value);}
 const body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.length;}return body;
}
async function readJSON(request){try{return JSON.parse(new TextDecoder().decode(await boundedBody(request,20000)));}catch(error){if(error.status)throw error;fail(400,'Please submit valid form data.');}}
async function limitWrites(env,user){
 const key=user.id+':'+now().slice(0,13);
 const row=await env.DB.prepare('INSERT INTO write_limits (key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key).first();
 if(row.count>40)fail(429,'Too many changes. Please try again later.');
}
function auditStatement(env,user,action,target){return env.DB.prepare('INSERT INTO audit (id,actor,action,target,created_at) VALUES (?,?,?,?,?)').bind(uid(),user.id,action,target,now());}
function detectFile(bytes){
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 const head=new TextDecoder().decode(bytes.slice(0,16));if(head.startsWith('%PDF-'))return 'application/pdf';if(head.startsWith('RIFF')&&head.slice(8,12)==='WEBP')return 'image/webp';return null;
}
async function application(request,env,user){
 if(await env.DB.prepare('SELECT id FROM applications WHERE user_id=?').bind(user.id).first())fail(409,'Your application has already been submitted. You can check its status on the Join the team page.');
 const bytes=await boundedBody(request,MAX_BODY);let form;
 try{form=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:bytes}).formData();}catch{fail(400,'The application could not be read.');}
 if(form.get('age_confirmed')!=='yes')fail(400,'You must confirm that you are at least 18 years old.');
 const name=text(form.get('name'),100),address=text(form.get('email'),200),about=text(form.get('about'),4000),roles=disciplines(form.getAll('disciplines'));
 if(name.length<2||!email(address)||about.length<30||!roles.length)fail(400,'Include your name, email, photography/video discipline and at least 30 characters about your work.');
 const link=text(form.get('portfolio_url'),500);if(link){try{if(new URL(link).protocol!=='https:')throw Error();}catch{fail(400,'Portfolio links must start with https://.');}}
 const file=form.get('portfolio');if(!file||typeof file.arrayBuffer!=='function'||!file.size)fail(400,'Upload a portfolio PDF, JPEG, PNG or WebP file.');
 if(file.size>MAX_FILE)fail(413,'The portfolio must be 8 MB or smaller.');
 const fileBytes=new Uint8Array(await file.arrayBuffer()),type=detectFile(fileBytes);
 if(!type)fail(415,'Please upload a PDF, JPEG, PNG or WebP portfolio.');
 const id=uid(),key='portfolios/'+uid(),fileName=text(file.name,120).replace(/[^a-zA-Z0-9._ -]/g,'_')||'portfolio';
 await env.BUCKET.put(key,fileBytes,{httpMetadata:{contentType:type}});
 try{
  await env.DB.batch([
   env.DB.prepare('INSERT INTO members (user_id,email,name,status,disciplines,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,email=excluded.email,disciplines=excluded.disciplines').bind(user.id,user.email,name,'pending',JSON.stringify(roles),now()),
   env.DB.prepare('INSERT INTO applications (id,user_id,name,email,disciplines,about,portfolio_url,age_confirmed,file_key,file_name,file_type,file_bytes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,user.id,name,address,JSON.stringify(roles),about,link||null,1,key,fileName,type,file.size,'pending',now()),
   auditStatement(env,user,'application_submitted',id)
  ]);
 }catch(error){await env.BUCKET.delete(key);if(String(error).includes('UNIQUE'))fail(409,'Your application has already been submitted.');throw error;}
 return json({id,status:'pending',message:'Application received. Your portfolio is private to you and the BSE administrator.'},201);
}
export async function handleAPI(request,env){
 try{
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/api/'))return json({error:'Not found.'},404);
  if(path==='/api/shows'||path.startsWith('/api/shows/')||path==='/api/admin/members'||path.startsWith('/api/admin/members/'))return json({error:'Not found.'},404);
  if(!env.DB||!env.BUCKET)return json({error:'The crew service is not configured yet.'},503);
  const user=await viewer(request,env);
  if(request.method==='POST'){
   if(request.headers.get('origin')!==new URL(request.url).origin)fail(403,'Please submit changes from this website.');
   await limitWrites(env,user);
  }else if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  if(path==='/api/me'&&request.method==='GET')return json({id:user.id,email:user.email,name:user.name,role:user.admin?'admin':user.status==='approved'?'crew':'pending',disciplines:user.disciplines});
  if(path==='/api/applications'&&request.method==='POST')return await application(request,env,user);
  if(path==='/api/my-application'&&request.method==='GET'){
   const record=await env.DB.prepare('SELECT id,status,name,created_at FROM applications WHERE user_id=?').bind(user.id).first();return json({application:record||null});
  }
  const portfolio=path.match(/^\/api\/portfolios\/([a-zA-Z0-9-]+)$/);
  if(portfolio&&request.method==='GET'){
   const record=await env.DB.prepare('SELECT * FROM applications WHERE id=?').bind(portfolio[1]).first();
   if(!record||(!user.admin&&record.user_id!==user.id))fail(404,'Portfolio not found.');
   const object=await env.BUCKET.get(record.file_key);if(!object)fail(404,'Portfolio file not found.');
   return new Response(object.body,{headers:{'content-type':record.file_type,'content-disposition':'attachment; filename="'+record.file_name.replace(/["\r\n]/g,'_')+'"','cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"sandbox; default-src 'none'"}});
  }
  if(path==='/api/admin/applications'&&request.method==='GET'){
   requireAdmin(user);const rows=(await env.DB.prepare('SELECT id,user_id,name,email,disciplines,about,portfolio_url,file_name,file_bytes,status,created_at FROM applications ORDER BY created_at DESC LIMIT 200').all()).results;return json({applications:rows.map(r=>({...r,disciplines:JSON.parse(r.disciplines)}))});
  }
  const review=path.match(/^\/api\/admin\/applications\/([a-zA-Z0-9-]+)$/);
  if(review&&request.method==='POST'){
   requireAdmin(user);const body=await readJSON(request);if(!['approved','declined'].includes(body.status))fail(400,'Choose approve or decline.');
   const record=await env.DB.prepare('SELECT * FROM applications WHERE id=?').bind(review[1]).first();if(!record)fail(404,'Application not found.');
   await env.DB.batch([env.DB.prepare('UPDATE applications SET status=?,reviewed_at=? WHERE id=?').bind(body.status,now(),record.id),env.DB.prepare('UPDATE members SET status=? WHERE user_id=?').bind(body.status,record.user_id),auditStatement(env,user,'application_'+body.status,record.id)]);return json({status:body.status});
  }
  return json({error:'Not found.'},404);
 }catch(error){if(error.status)return json({error:error.message},error.status);console.error('Application API error',error?.message);return json({error:'We could not complete that request. Please try again.'},500);}
}
