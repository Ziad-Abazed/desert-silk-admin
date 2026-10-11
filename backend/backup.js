import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,cpSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const data=join(root,'data');
if(!existsSync(join(data,'store.sqlite')))throw Error('Start the backend before making a backup.');
const destination=join(root,'backups',new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(destination,{recursive:true});
const db=new DatabaseSync(join(data,'store.sqlite'),{readOnly:true});
try{await backup(db,join(destination,'store.sqlite'));cpSync(join(data,'uploads'),join(destination,'uploads'),{recursive:true});console.log('Private backup saved to '+destination)}finally{db.close()}
