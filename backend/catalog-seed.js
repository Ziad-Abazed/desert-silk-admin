// Import this release once; later restarts preserve owner edits and stock changes.
export function seedPublishedCatalog(db, products) {
 const release = 'published-catalog-2026-10-29';
 if (db.prepare('SELECT value FROM metadata WHERE key=?').get(release)) return;
 const legacyPhotos = new Map([[5,'oud-for-glory.jpg'],[8,'khamrah.jpg'],[12,'fakhar-women.jpg']]);
 db.exec('BEGIN IMMEDIATE');
 try {
  for (const product of products) {
   const {id, stock, published, ...data} = product;
   const existing = db.prepare('SELECT data FROM products WHERE id=?').get(id);
   if (!existing) {
    const normalized = {...data, brand:data.brand ?? (data.real ? 'Lattafa' : 'Concept collection'), description:data.description ?? '', demo:data.demo ?? true};
    db.prepare('INSERT INTO products(id,data,stock,published) VALUES(?,?,?,?)').run(id,JSON.stringify(normalized),stock ?? null,published === false ? 0 : 1);
   } else if (legacyPhotos.has(id)) {
    const saved = JSON.parse(existing.data);
    // Only replace the original bundled photo, never an owner-uploaded replacement.
    if (saved.image === legacyPhotos.get(id) && data.image !== saved.image) {
     saved.image = data.image;
     db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(saved),id);
    }
   }
  }
  db.prepare('INSERT OR IGNORE INTO metadata(key,value) VALUES(?,?)').run('seeded','1');
  db.prepare('INSERT INTO metadata(key,value) VALUES(?,?)').run(release,'1');
  db.exec('COMMIT');
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}
