import {products as seed} from './seed-catalog.js';
export let backendConnected=false;
export let products=seed;
try{const response=await fetch('/api/products');if(response.ok){const result=await response.json();if(Array.isArray(result)){products=result;backendConnected=true}}}catch{}
