import {escapeHtml as e} from './safe-html.js';
import { products } from './catalog.js';
import { money, addToDemoBag } from './store.js';
import { mountProductMotion, initHomeMotion } from './motion-effects.js';
const grid=document.querySelector('#products'),search=document.querySelector('#product-search'),brand=document.querySelector('#brand-filter'),count=document.querySelector('#result-count');
let scent='All';
const productBrand=p=>p.brand||(p.real?'Lattafa':'Concept collection');
for(const name of [...new Set(products.map(productBrand))].sort()){const option=document.createElement('option');option.value=name;option.textContent=name;brand.append(option)}
function render(){
 const query=search.value.trim().toLocaleLowerCase();
 const matches=products.filter(p=>(scent==='All'||p.category===scent)&&(brand.value==='All'||productBrand(p)===brand.value)&&`${p.name} ${p.notes} ${productBrand(p)}`.toLocaleLowerCase().includes(query));
 count.textContent=`${matches.length} ${matches.length===1?'perfume':'perfumes'}`;
 grid.innerHTML=matches.length?matches.map(p=>`<article class="product"><a href="product.html?id=${p.id}" aria-label="View ${e(p.name)}" class="product-image ${p.real?'real-product':''}"><img src="${e(p.image)}" alt="${e((p.brand||'')+' '+p.name+' perfume bottle')}" loading="lazy"><span class="badge">${p.stock===0?'SOLD OUT':p.demo===false?'FULL BOTTLE':'DEMO COLLECTION'}</span></a><p class="product-meta">${e(productBrand(p))}</p><h3><a href="product.html?id=${p.id}">${e(p.name)}</a></h3><p class="notes">${e(p.notes)}</p><div class="purchase"><span>${money(p.price)} <small> / ${p.size||100} ml</small></span><button ${p.stock===0?'disabled':''} data-add="${p.id}" aria-label="Add ${e(p.name)} to demo bag">Add to bag +</button></div></article>`).join(''):'<div class="empty-results"><h3>No perfumes found.</h3><p>Try another name or scent note, or clear your filters.</p><button class="button" id="clear-empty">Clear filters</button></div>';
 grid.querySelector('#clear-empty')?.addEventListener('click',reset);if(matches.length)mountProductMotion();
}
function reset(){search.value='';brand.value='All';scent='All';updateScentButtons();render()}
function updateScentButtons(){document.querySelectorAll('.filter').forEach(b=>{const active=b.dataset.filter===scent;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
search.addEventListener('input',render);brand.addEventListener('change',render);document.querySelector('#clear-filters').addEventListener('click',reset);
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{scent=b.dataset.filter;updateScentButtons();render()}));
grid.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)addToDemoBag(products.find(p=>p.id===Number(b.dataset.add)))});
render();initHomeMotion();
