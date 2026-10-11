import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStoreServer} from './server.js';
test('hosted owner provisioning is private and does not replace an existing owner',async()=>{
 const dataDir=mkdtempSync(join(tmpdir(),'desert-silk-hosted-test-'));
 const oldUser=process.env.OWNER_USERNAME,oldPassword=process.env.OWNER_PASSWORD;
 let server;
 try{
  for(const password of ['hosted-test-password-one','hosted-test-password-two']){
   process.env.OWNER_USERNAME='hosted-test';process.env.OWNER_PASSWORD=password;
   server=createStoreServer({dataDir,publicOrigin:'https://test.example'});
   await new Promise(r=>server.listen(0,'127.0.0.1',r));
   const base='http://127.0.0.1:'+server.address().port;
   const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify({username:'hosted-test',password:'hosted-test-password-one'})});
   assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/Secure/);
   assert.equal((await fetch(base+'/api/auth/setup',{method:'POST',headers:{Origin:'https://test.example'}})).status,403);
   await new Promise(r=>server.close(r));
  }
 }finally{
  if(server?.listening)await new Promise(r=>server.close(r));
  if(oldUser===undefined)delete process.env.OWNER_USERNAME;else process.env.OWNER_USERNAME=oldUser;
  if(oldPassword===undefined)delete process.env.OWNER_PASSWORD;else process.env.OWNER_PASSWORD=oldPassword;
  rmSync(dataDir,{recursive:true,force:true});
 }
});
test('owner access, persistence, inventory transactions and review moderation',async()=>{
 const dataDir=mkdtempSync(join(tmpdir(),'desert-silk-test-'));let server,base,cookie='',csrf='';
 async function start(){server=createStoreServer({dataDir,publicOrigin:''});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port}
 async function call(path,method='GET',body,extra={}){const response=await fetch(base+'/api/'+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf,...extra},body:body===undefined?undefined:JSON.stringify(body)});const json=await response.json();return {status:response.status,json,response}}
 try{await start();assert.equal((await call('admin/products')).status,401);
 const setup=await call('auth/setup','POST',{username:'test-owner',password:'isolated-test-password-only'});assert.equal(setup.status,201);cookie=setup.response.headers.get('set-cookie').split(';')[0];csrf=setup.json.csrf;assert.match(setup.response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
 assert.equal((await call('auth/setup','POST',{})).status,409);
 const product={name:'Test <perfume>',brand:'Test Brand',notes:'Oud · Amber',description:'A test fragrance.',category:'Woody',price:25.99,image:'oud-for-glory.jpg',size:100,stock:3,published:true,demo:true};
 assert.equal((await call('admin/products','POST',product,{'X-CSRF-Token':'bad'})).status,403);
 assert.equal((await call('admin/products','POST',product,{Origin:'https://evil.example'})).status,403);
 assert.equal((await call('admin/products','POST',{...product,stock:-1})).status,400);
 const created=await call('admin/products','POST',product);assert.equal(created.status,201);const id=created.json.id;
 const order={customer:'Test Customer',email:'test@example.com',address:'1 Test Street, Test City 10001',state:'NY',items:[{id,quantity:2}]};
 assert.equal((await call('admin/orders','POST',{...order,state:'HI'})).status,400);
 const reserved=await call('admin/orders','POST',order);assert.equal(reserved.status,201);
 assert.equal((await call('admin/orders','POST',order)).status,409);
 assert.equal((await call('admin/products')).json.find(p=>p.id===id).stock,1);
 const storedOrder=(await call('admin/orders')).json[0];assert.equal(storedOrder.totalCents,5897);assert.equal(storedOrder.paymentStatus,'unpaid');
 assert.equal((await call('admin/orders/'+reserved.json.id,'PATCH',{status:'shipped'})).status,400);
 for(let i=0;i<2;i++)assert.equal((await call('admin/orders/'+reserved.json.id,'PATCH',{status:'cancelled'})).status,200);
 assert.equal((await call('admin/products')).json.find(p=>p.id===id).stock,3);
 assert.equal((await call('products/'+id+'/reviews','POST',{name:'Test Reviewer',rating:5,message:'<script>test</script>'})).status,201);
 assert.equal((await call('products/'+id+'/reviews')).json.length,0);const review=(await call('admin/reviews')).json[0];await call('admin/reviews/'+review.id,'PATCH',{status:'approved'});assert.equal((await call('products/'+id+'/reviews')).json.length,1);
 assert.equal((await call('admin/uploads','POST',{data:Buffer.from('not an image').toString('base64')})).status,400);
 await new Promise(r=>server.close(r));await start();assert.equal((await call('admin/products')).json.find(p=>p.id===id).stock,3);
 await call('auth/logout','POST',{});assert.equal((await call('admin/products')).status,401);assert.equal((await call('auth/login','POST',{username:'test-owner',password:'incorrect-password'})).status,401);assert.equal((await call('auth/login','POST',{username:'test-owner',password:'isolated-test-password-only'})).status,200);
 }finally{if(server?.listening)await new Promise(r=>server.close(r));rmSync(dataDir,{recursive:true,force:true})}
});
