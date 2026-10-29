import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {seedPublishedCatalog} from './catalog-seed.js';
import {products} from '../seed-catalog.js';
const schema=readFileSync(new URL('./schema.sql',import.meta.url),'utf8');
test('catalog release preserves real prices, stock, brands and all image paths',()=>{
 const db=new DatabaseSync(':memory:');db.exec(schema);
 try{
  seedPublishedCatalog(db,products);
  const rows=db.prepare('SELECT id,data,stock,published FROM products').all();assert.equal(rows.length,92);
  const real=rows.filter(r=>!JSON.parse(r.data).demo);assert.equal(real.length,79);
  for(const row of real){const p=JSON.parse(row.data);assert.equal(p.price,40);assert.equal(row.stock,1);assert.equal(row.published,1);assert.ok(p.brand);assert.ok(existsSync(new URL('../public/'+p.image,import.meta.url)));}
  assert.equal(JSON.parse(rows.find(r=>r.id===15).data).brand,'Bharara');
 }finally{db.close();}
});
test('upgrading an existing catalog adds new products without resetting owner edits',()=>{
 const db=new DatabaseSync(':memory:');db.exec(schema);
 try{
  db.prepare('INSERT INTO metadata VALUES(?,?)').run('seeded','1');
  db.prepare('INSERT INTO products(id,data,stock,published) VALUES(?,?,?,?)').run(5,JSON.stringify({name:'Owner name',price:55,image:'oud-for-glory.jpg'}),7,0);
  db.prepare('INSERT INTO products(id,data,stock,published) VALUES(?,?,?,?)').run(8,JSON.stringify({name:'Custom',price:60,image:'/uploads/custom.png'}),3,1);
  seedPublishedCatalog(db,products);
  const old=db.prepare('SELECT * FROM products WHERE id=5').get();assert.equal(JSON.parse(old.data).name,'Owner name');assert.equal(JSON.parse(old.data).price,55);assert.equal(old.stock,7);assert.equal(old.published,0);assert.equal(JSON.parse(old.data).image,'lattafa-badee-al-oud-oud-for-glory-catalog.png');
  assert.equal(JSON.parse(db.prepare('SELECT data FROM products WHERE id=8').get().data).image,'/uploads/custom.png');
  db.prepare('UPDATE products SET stock=0,published=0 WHERE id=15').run();
  seedPublishedCatalog(db,products);const saved=db.prepare('SELECT * FROM products WHERE id=15').get();assert.equal(saved.stock,0);assert.equal(saved.published,0);
 }finally{db.close();}
});
