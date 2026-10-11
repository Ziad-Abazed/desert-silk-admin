import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {products as seed} from '../seed-catalog.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
const date=()=>new Date().toISOString();
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const text=(v,max=200,required=true)=>{if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))fail('Check the required fields and their length.');return v.trim()};
const integer=(v,min,max)=>{if(!Number.isInteger(v)||v<min||v>max)fail('Invalid numeric value.');return v};
const safeEqual=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};

export function createStoreServer({dataDir=resolve(root,'data'),publicOrigin=process.env.APP_ORIGIN||'',host=process.env.HOST||'127.0.0.1'}={}){
 mkdirSync(dataDir,{recursive:true});mkdirSync(join(dataDir,'uploads'),{recursive:true});
 const db=new DatabaseSync(join(dataDir,'store.sqlite'));db.exec('PRAGMA journal_mode=WAL;');db.exec(readFileSync(join(root,'backend/schema.sql'),'utf8'));
 if(!db.prepare('SELECT username FROM owners LIMIT 1').get()&&(process.env.OWNER_USERNAME||process.env.OWNER_PASSWORD)){
  const username=text(process.env.OWNER_USERNAME,80),password=text(process.env.OWNER_PASSWORD,200);
  if(password.length<12)throw new Error('OWNER_PASSWORD must contain at least 12 characters.');
  const salt=randomBytes(32).toString('hex');
  db.prepare('INSERT INTO owners VALUES(?,?,?)').run(username,salt,scryptSync(password,salt,64).toString('hex'));
 }
 if(!db.prepare("SELECT value FROM metadata WHERE key='seeded'").get()){
  db.exec('BEGIN IMMEDIATE');try{for(const p of seed)db.prepare('INSERT INTO products(id,data,stock,published) VALUES(?,?,NULL,1)').run(p.id,JSON.stringify({...p,brand:p.real?'Lattafa':'Concept collection',description:'',demo:true}));db.prepare("INSERT INTO metadata VALUES('seeded','1')").run();db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 }
 const audit=(action,details)=>db.prepare('INSERT INTO audit(action,details,created) VALUES(?,?,?)').run(action,JSON.stringify(details),date());
 const product=row=>({...JSON.parse(row.data),id:row.id,stock:row.stock,published:Boolean(row.published)});
 const order=row=>({...JSON.parse(row.data),id:row.id,status:row.status,tracking:row.tracking,created:row.created});
 const limits=new Map();
 function rate(req,key,max,period){const k=key+req.socket.remoteAddress,now=Date.now();let entry=limits.get(k);if(!entry||entry.until<now)entry={count:0,until:now+period};entry.count++;limits.set(k,entry);if(limits.size>2000)for(const [id,value]of limits)if(value.until<now)limits.delete(id);if(entry.count>max)fail('Too many attempts. Please try again later.',429)}
 function session(req){const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ds_session='));if(!cookie)return null;const token=cookie.slice(11);return db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(hash(token),Date.now())||null}
 function auth(req,write=false){const s=session(req);if(!s)fail('Sign in to continue.',401);if(write&&!safeEqual(req.headers['x-csrf-token'],s.csrf))fail('Refresh and sign in again.',403);return s}
 function origin(req){const supplied=req.headers.origin;const allowed=publicOrigin?[publicOrigin]:[`http://${req.headers.host}`];const hostName=(req.headers.host||'').split(':')[0];if(!publicOrigin&&!['127.0.0.1','localhost'].includes(hostName))fail('Host is not allowed.',403);if(!supplied||!allowed.includes(supplied))fail('Request origin is not allowed.',403)}
 function cookie(res,token,clear=false){const secure=publicOrigin.startsWith('https://')?'; Secure':'';res.setHeader('Set-Cookie',`ds_session=${clear?'':token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:28800}${secure}`)}
 function issue(res){const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),csrf,Date.now()+28800000);cookie(res,token);return {authenticated:true,csrf}}
 async function body(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>7*1024*1024)fail('File or request is too large.',413);chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail('Invalid JSON request.')}}
 function validateProduct(p){
  const price=Number(p.price);if(!Number.isFinite(price)||price<0||price>10000||Math.abs(price*100-Math.round(price*100))>1e-7)fail('Price must be a valid USD amount.');
  if(!['Woody','Sweet','Floral'].includes(p.category))fail('Choose a scent family.');
  const image=text(p.image,300);if(!/^(?:[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)|\/uploads\/[a-f0-9]+\.(?:jpg|png|webp))$/.test(image))fail('Use a local photo or upload a JPEG, PNG, or WebP.');
  const brand=text(p.brand,80);return {name:text(p.name,120),brand,notes:text(p.notes,300),description:text(p.description||'',2000,false),category:p.category,price:Math.round(price*100)/100,image,size:integer(Number(p.size),1,2000),real:brand!=='Concept collection',label:brand.toUpperCase(),demo:Boolean(p.demo)};
 }
 const server=http.createServer(async(req,res)=>{
  const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value))};
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method;
  try{
   if(path.startsWith('/api/')){
    res.setHeader('Cache-Control','no-store');
    if(!['GET','POST','PUT','PATCH'].includes(method))fail('Method not allowed.',405);
    if(method!=='GET')origin(req);
    if(path==='/api/health'&&method==='GET')return send({ok:true});
    if(path==='/api/products'&&method==='GET')return send(db.prepare('SELECT * FROM products WHERE published=1 ORDER BY id').all().map(product));
    if(path==='/api/auth/session'&&method==='GET'){const s=session(req);return send({authenticated:Boolean(s),csrf:s?.csrf,needsSetup:!db.prepare('SELECT username FROM owners LIMIT 1').get(),username:s?db.prepare('SELECT username FROM owners LIMIT 1').get().username:undefined})}
    if(path==='/api/auth/setup'&&method==='POST'){
     if(publicOrigin||!['127.0.0.1','localhost'].includes(host)||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))fail('Owner setup is available only on the local server.',403);
     if(db.prepare('SELECT username FROM owners LIMIT 1').get())fail('Owner account already exists.',409);
     rate(req,'setup',5,900000);const b=await body(req),username=text(b.username,80),password=text(b.password,200);if(password.length<12)fail('Use a password with at least 12 characters.');
     if(db.prepare('SELECT username FROM owners LIMIT 1').get())fail('Owner account already exists.',409);
     const salt=randomBytes(32).toString('hex');db.prepare('INSERT INTO owners VALUES(?,?,?)').run(username,salt,scryptSync(password,salt,64).toString('hex'));audit('owner.created',{username});return send(issue(res),201);
    }
    if(path==='/api/auth/login'&&method==='POST'){rate(req,'login',8,900000);const b=await body(req),username=text(b.username,80),password=text(b.password,200),owner=db.prepare('SELECT * FROM owners WHERE username=?').get(username);const actual=scryptSync(password,owner?.salt||'missing-owner-dummy-salt',64).toString('hex');if(!owner||!safeEqual(actual,owner.password_hash))fail('Incorrect username or password.',401);return send(issue(res))}
    if(path==='/api/auth/logout'&&method==='POST'){const s=auth(req,true);db.prepare('DELETE FROM sessions WHERE token_hash=?').run(s.token_hash);cookie(res,'',true);return send({ok:true})}
    const reviewMatch=path.match(/^\/api\/products\/(\d+)\/reviews$/);
    if(reviewMatch){const id=Number(reviewMatch[1]);if(!db.prepare('SELECT id FROM products WHERE id=? AND published=1').get(id))fail('Product not found.',404);
     if(method==='GET')return send(db.prepare("SELECT name,rating,message,created FROM reviews WHERE product_id=? AND status='approved' ORDER BY id DESC").all(id));
     if(method==='POST'){rate(req,'review',10,3600000);const b=await body(req);db.prepare('INSERT INTO reviews(product_id,name,rating,message,created) VALUES(?,?,?,?,?)').run(id,text(b.name,60),integer(Number(b.rating),1,5),text(b.message,1500),date());return send({message:'Thank you. Your review is waiting for store approval.'},201)}
    }
    if(path.startsWith('/api/admin/')){
     auth(req,method!=='GET');
     if(path==='/api/admin/products'&&method==='GET')return send(db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(product));
     if(path==='/api/admin/products'&&method==='POST'){const b=await body(req),p=validateProduct(b),stock=b.stock===null?null:integer(Number(b.stock),0,1000000);db.exec('BEGIN IMMEDIATE');try{const result=db.prepare('INSERT INTO products(data,stock,published) VALUES(?,?,?)').run(JSON.stringify(p),stock,b.published?1:0);audit('product.created',{id:Number(result.lastInsertRowid),stock});db.exec('COMMIT');return send({id:Number(result.lastInsertRowid)},201)}catch(e){db.exec('ROLLBACK');throw e}}
     const edit=path.match(/^\/api\/admin\/products\/(\d+)$/);
     if(edit&&method==='PUT'){const id=Number(edit[1]),old=db.prepare('SELECT * FROM products WHERE id=?').get(id);if(!old)fail('Product not found.',404);const b=await body(req),p=validateProduct(b),stock=b.stock===null?null:integer(Number(b.stock),0,1000000);db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE products SET data=?,stock=?,published=? WHERE id=?').run(JSON.stringify(p),stock,b.published?1:0,id);audit('product.updated',{id,previousStock:old.stock,stock});db.exec('COMMIT');return send({ok:true})}catch(e){db.exec('ROLLBACK');throw e}}
     if(path==='/api/admin/uploads'&&method==='POST'){const b=await body(req);if(typeof b.data!=='string'||b.data.length>7000000)fail('Choose an image under 5 MB.');const bytes=Buffer.from(b.data,'base64');if(bytes.length>5*1024*1024)fail('Choose an image under 5 MB.');let type='';if(bytes.subarray(0,3).equals(Buffer.from([255,216,255])))type='jpg';else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))type='png';else if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')type='webp';if(!type)fail('Only JPEG, PNG, and WebP images are supported.');const filename=randomBytes(16).toString('hex')+'.'+type;writeFileSync(join(dataDir,'uploads',filename),bytes,{flag:'wx'});audit('photo.uploaded',{filename});return send({image:'/uploads/'+filename},201)}
     if(path==='/api/admin/orders'&&method==='GET')return send(db.prepare('SELECT * FROM orders ORDER BY id DESC').all().map(order));
     if(path==='/api/admin/orders'&&method==='POST'){
      const b=await body(req);if(!Array.isArray(b.items)||!b.items.length||b.items.length>20)fail('Add 1–20 line items.');const customer=text(b.customer,120),email=text(b.email,200),address=text(b.address,600),state=text(b.state,2).toUpperCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email.');if(!'AL AZ AR CA CO CT DE FL GA ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ').includes(state))fail('Shipping is limited to the 48 contiguous states.');
      const quantities=new Map();for(const item of b.items){const id=integer(Number(item.id),1,1e9),qty=integer(Number(item.quantity),1,100);quantities.set(id,(quantities.get(id)||0)+qty)}
      db.exec('BEGIN IMMEDIATE');try{const items=[];let subtotalCents=0;for(const[id,quantity]of quantities){const row=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(id);if(!row)fail('A product is unavailable.');const p=product(row);if(p.stock===null)fail('Set the product stock before recording an order.');if(p.stock<quantity)fail('Insufficient stock for '+p.name,409);const priceCents=Math.round(p.price*100);items.push({id,name:p.name,quantity,priceCents});subtotalCents+=priceCents*quantity;db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(quantity,id);audit('stock.reserved',{id,quantity})}const data={customer,email,address,state,items,subtotalCents,shippingCents:699,totalCents:subtotalCents+699,paymentStatus:'unpaid',source:'manual'};const result=db.prepare('INSERT INTO orders(data,created) VALUES(?,?)').run(JSON.stringify(data),date());audit('order.created',{id:Number(result.lastInsertRowid)});db.exec('COMMIT');return send({id:Number(result.lastInsertRowid)},201)}catch(e){db.exec('ROLLBACK');throw e}
     }
     const updateOrder=path.match(/^\/api\/admin\/orders\/(\d+)$/);
     if(updateOrder&&method==='PATCH'){const id=Number(updateOrder[1]),row=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!row)fail('Order not found.',404);const b=await body(req),status=text(b.status,20),tracking=text(b.tracking||'',250,false);if(!['new','processing','shipped','cancelled'].includes(status))fail('Invalid order status.');if(row.status==='cancelled'&&status!=='cancelled')fail('A cancelled order cannot be reopened.');if(row.status==='shipped'&&status!=='shipped')fail('A shipped order cannot move backwards.');if(status==='shipped'&&!tracking)fail('Add a carrier and tracking number first.');db.exec('BEGIN IMMEDIATE');try{if(status==='cancelled'&&row.status!=='cancelled')for(const item of JSON.parse(row.data).items){db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(item.quantity,item.id);audit('stock.released',{id:item.id,quantity:item.quantity})}db.prepare('UPDATE orders SET status=?,tracking=? WHERE id=?').run(status,tracking,id);audit('order.updated',{id,status,tracking});db.exec('COMMIT');return send({ok:true})}catch(e){db.exec('ROLLBACK');throw e}}
     if(path==='/api/admin/reviews'&&method==='GET')return send(db.prepare('SELECT r.*,p.data AS product_data FROM reviews r JOIN products p ON p.id=r.product_id ORDER BY r.id DESC').all().map(r=>({...r,productName:JSON.parse(r.product_data).name,product_data:undefined})));
     const moderate=path.match(/^\/api\/admin\/reviews\/(\d+)$/);
     if(moderate&&method==='PATCH'){const id=Number(moderate[1]),b=await body(req);if(!['approved','rejected','pending'].includes(b.status))fail('Invalid review status.');if(!db.prepare('SELECT id FROM reviews WHERE id=?').get(id))fail('Review not found.',404);db.prepare('UPDATE reviews SET status=? WHERE id=?').run(b.status,id);audit('review.moderated',{id,status:b.status});return send({ok:true})}
     if(path==='/api/admin/audit'&&method==='GET')return send(db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all());
    }
    fail('Endpoint not found.',404);
   }
   if(method!=='GET'&&method!=='HEAD')fail('Method not allowed.',405);
   let base=join(root,'dist'),relative=decodeURIComponent(path).replace(/^\/+/,''),file;
   if(path.startsWith('/uploads/')){base=join(dataDir,'uploads');relative=path.slice(9);if(!/^[a-f0-9]+\.(jpg|png|webp)$/.test(relative))fail('Not found.',404)}
   if(path==='/'||path==='/admin')relative=path==='/admin'?'admin.html':'index.html';
   file=resolve(base,relative);if(!file.startsWith(resolve(base)+sep)||!existsSync(file)||!statSync(file).isFile()||!mime[extname(file)])fail('Not found.',404);
   res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':extname(file)==='.html'?'no-store':'public, max-age=3600'});res.end(method==='HEAD'?undefined:readFileSync(file));
  }catch(e){if(!res.headersSent)send({error:e.status?e.message:'The server could not complete this request.'},e.status||500);else res.end()}
 });
 server.on('close',()=>db.close());return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||8787);
 if(!['127.0.0.1','localhost'].includes(host)&&!process.env.APP_ORIGIN?.startsWith('https://'))throw new Error('Set an HTTPS APP_ORIGIN before exposing this server.');
 const server=createStoreServer({host});server.listen(port,host,()=>console.log(`Store backend: http://${host}:${port}\nAdmin setup: http://${host}:${port}/admin.html`));
}
