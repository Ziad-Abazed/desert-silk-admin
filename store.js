import {escapeHtml as e} from './safe-html.js';
import { products } from './catalog.js';
import { animate } from 'motion';
export const money=n=>'$'+n.toFixed(2);
let savedIds=[];try{const saved=JSON.parse(sessionStorage.getItem('desert-silk-bag')||'[]');if(Array.isArray(saved))savedIds=saved.slice(0,100)}catch{}
const cart=savedIds.map(id=>products.find(p=>p.id===id)).filter(Boolean);
function updateBag(){try{sessionStorage.setItem('desert-silk-bag',JSON.stringify(cart.map(p=>p.id)))}catch{}document.querySelector('#bag-count').textContent=cart.length;document.querySelector('#bag-items').innerHTML=cart.length?cart.map((p,i)=>`<div class="bag-item"><div class="bag-row"><span>${e(p.name)}</span><span>${money(p.price)}</span></div><button class="remove" data-remove="${i}" aria-label="Remove ${e(p.name)}">Remove</button></div>`).join(''):'<p style="padding:25px 0;color:var(--muted)">Your bag is empty. Explore the collection to add a scent.</p>';document.querySelector('#total').textContent=money(cart.reduce((s,p)=>s+p.price,0))}updateBag();const bag=document.querySelector('#bag');document.querySelector('#open-bag').onclick=openBag;document.querySelector('#close-bag').onclick=closeBag;document.querySelector('#bag-items').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){cart.splice(Number(b.dataset.remove),1);updateBag()}});bag.addEventListener('click',e=>{if(e.target===bag&&e.clientX<bag.getBoundingClientRect().left)closeBag()});
let toastTimer;
function showToast(message){const t=document.querySelector('#toast');t.textContent=message;t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),2400)}
export function addToDemoBag(product,quantity=1){if(!product||!Number.isInteger(quantity)||quantity<1||quantity>10)throw new Error('Select a quantity from 1 to 10.');if(product.stock!==null&&product.stock!==undefined&&cart.filter(p=>p.id===product.id).length+quantity>product.stock){showToast('Not enough stock available.');return}for(let i=0;i<quantity;i++)cart.push(product);updateBag();if(!reducedMotion.matches)animate('.bag-button',{scale:[1,1.07,1]},{duration:.35});showToast(quantity>1?quantity+' × '+product.name+' added to your demo bag':product.name+' added to your demo bag')}

const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let closingBag=false;
function openBag(){
  if(bag.open)return;
  closingBag=false;bag.showModal();
  if(!reducedMotion.matches)animate('#bag',{x:['100%','0%'],opacity:[.6,1]},{duration:.38,ease:[.22,1,.36,1]});
}
async function closeBag(){
  if(!bag.open||closingBag)return;
  closingBag=true;
  if(!reducedMotion.matches){try{await animate('#bag',{x:['0%','100%'],opacity:[1,.6]},{duration:.25,ease:'easeIn'}).finished}catch{}}
  bag.close();bag.style.removeProperty('transform');bag.style.removeProperty('opacity');closingBag=false;
}
bag.addEventListener('cancel',e=>{e.preventDefault();closeBag()});

