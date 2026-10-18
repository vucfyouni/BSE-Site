import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleAPI} from '../server/portal.mjs';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')))sqlite.exec(readFileSync('drizzle/'+name,'utf8'));
 class Statement{constructor(sql){this.sql=sql;this.args=[];}bind(...args){this.args=args;return this;}async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}async all(){return{results:sqlite.prepare(this.sql).all(...this.args)};}async run(){return sqlite.prepare(this.sql).run(...this.args);}}
 const files=new Map(),env={ADMIN_EMAILS:'owner@example.test',DB:{prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const st of statements)results.push(await st.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}},BUCKET:{async put(key,bytes){files.set(key,new Uint8Array(bytes));},async get(key){return files.has(key)?{body:files.get(key)}:null;},async delete(key){files.delete(key);}}};
 const users={admin:['owner','owner@example.test'],crew1:['crew-1','one@example.test'],crew2:['crew-2','two@example.test'],pending:['pending','new@example.test']};
 async function request(path,{user,method='GET',data,form,origin='https://site.test'}={}){const headers={};if(user){headers['oai-authenticated-user-id']=users[user][0];headers['oai-authenticated-user-email']=users[user][1];}if(method==='POST')headers.origin=origin;if(data!==undefined)headers['content-type']='application/json';return handleAPI(new Request('https://site.test'+path,{method,headers,body:form||(data===undefined?undefined:JSON.stringify(data))}),env);}
 function approve(key,roles=['photo','video']){const[id,email]=users[key];sqlite.prepare('INSERT INTO members(user_id,email,name,status,disciplines,created_at) VALUES(?,?,?,?,?,?)').run(id,email,key,'approved',JSON.stringify(roles),new Date().toISOString());}
 return{sqlite,env,files,users,request,approve};
}
function application(age='yes',type='application/pdf'){
 const form=new FormData();form.set('name','Scene Photographer');form.set('email','contact@example.test');form.set('about','I photograph independent live music and want to contribute to BSE shows.');form.append('disciplines','photo');form.set('age_confirmed',age);form.set('portfolio',new File([type==='application/pdf'?'%PDF-1.7\nportfolio':'<script>unsafe</script>'],type==='application/pdf'?'work.pdf':'bad.html',{type}));return form;
}
test('authentication, administrator authorization and CSRF fail closed',async()=>{
 const{request}=fixture();assert.equal((await request('/api/me')).status,401);assert.equal((await request('/api/admin/applications',{user:'pending'})).status,403);assert.equal((await request('/api/applications',{user:'pending',method:'POST',form:application(),origin:'https://attacker.test'})).status,403);
});
test('18+ portfolios are validated, private, deduplicated and require admin approval',async()=>{
 const{request,files}=fixture();assert.equal((await request('/api/applications',{user:'pending',method:'POST',form:application('no')})).status,400);assert.equal(files.size,0);assert.equal((await request('/api/applications',{user:'pending',method:'POST',form:application('yes','text/html')})).status,415);
 const submitted=await request('/api/applications',{user:'pending',method:'POST',form:application()});assert.equal(submitted.status,201);const{id}=await submitted.json();assert.equal(files.size,1);assert.equal((await request('/api/applications',{user:'pending',method:'POST',form:application()})).status,409);assert.equal(files.size,1);
 assert.equal((await request('/api/portfolios/'+id,{user:'crew1'})).status,404);assert.equal((await request('/api/portfolios/'+id,{user:'pending'})).status,200);const download=await request('/api/portfolios/'+id,{user:'admin'});assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment/);assert.equal(download.headers.get('cache-control'),'private, no-store');
 assert.equal((await request('/api/admin/applications/'+id,{user:'pending',method:'POST',data:{status:'approved'}})).status,403);assert.equal((await request('/api/admin/applications/'+id,{user:'admin',method:'POST',data:{status:'approved'}})).status,200);assert.equal((await (await request('/api/me',{user:'pending'})).json()).role,'crew');assert.equal((await request('/api/shows',{user:'pending'})).status,404);
});
test('removed crew endpoints remain unavailable to anonymous visitors, crew and administrators',async()=>{
 const{request,approve,sqlite}=fixture();approve('crew1');
 for(const user of [undefined,'pending','crew1','admin'])for(const path of ['/api/shows','/api/shows/example/claim','/api/shows/example/release','/api/shows/example/status','/api/admin/members','/api/admin/members/crew-1'])for(const method of ['GET','POST'])assert.equal((await request(path,{user,method,...(method==='POST'?{data:{}}:{})})).status,404);
 assert.equal(sqlite.prepare('SELECT count(*) AS count FROM shows').get().count,0);
});
