import {escapeHtml as e} from './safe-html.js';
import { products } from './catalog.js';
import { money, addToDemoBag } from './store.js';
import { initProductMotion } from './motion-effects.js';

const requestedId=new URLSearchParams(location.search).get('id');
const product=products.find(p=>p.id===Number(requestedId===null?8:requestedId));
if(!product){document.title='Product not found | Desert Silk Fragrances';document.querySelector('#product-page').className='missing';document.querySelector('#product-page').innerHTML='<p class="eyebrow">Desert Silk Fragrances</p><h1>Product not found.</h1><p>This perfume is not in the demo collection.</p><a class="button" href="index.html#collection">Return to collection</a>'}
else{
document.title=product.name+' | Desert Silk Fragrances';
const categories={Woody:'Woody & oud',Sweet:'Sweet & amber',Floral:'Floral & musk'};
const descriptions={Woody:'Explore a rich, woody scent profile with depth and warmth.',Sweet:'Explore a warm, sweet scent profile with an inviting gourmand character.',Floral:'Explore a soft scent profile with floral or musky accents.'};
document.querySelector('#crumb-product').textContent=product.name;
document.querySelector('#brand').textContent=product.real?'Lattafa · '+categories[product.category]:'Concept collection · '+categories[product.category];
document.querySelector('#product-name').textContent=product.name;
document.querySelector('#description').textContent=product.description||descriptions[product.category];
document.querySelector('#product-price').textContent=money(product.price);
if(product.demo===false){document.querySelector('.detail-price small').textContent='USD';document.querySelector('.detail-demo').textContent='Checkout is not connected yet. No purchase or payment is made.';}
document.querySelector('#bottle-size').textContent=(product.size||100)+' ml';
const image=document.querySelector('#bottle-photo');image.src=product.image;image.alt=(product.brand||'Illustrative photo for')+' '+product.name+' perfume';
if(!product.real)document.querySelector('#detail-image').classList.add('concept');
for(const note of product.notes.split(' · ')){const chip=document.createElement('span');chip.textContent=note;document.querySelector('#scent-notes').append(chip)}
document.querySelector('#about-fragrance').textContent=product.real?product.name+' by '+(product.brand||'Lattafa')+' features notes of '+product.notes.toLowerCase().replaceAll(' · ', ', ')+(product.demo===false?'.':'. The price shown is an example for this demo.'):product.name+' is an illustrative concept perfume used to preview the store. Its name, scent notes, bottle size, price, and photograph are examples.';
let quantity=1;const minus=document.querySelector('#minus'),plus=document.querySelector('#plus'),output=document.querySelector('#quantity');
const maxQuantity=product.stock===null||product.stock===undefined?10:Math.min(10,product.stock);
function updateQuantity(){output.textContent=quantity;minus.disabled=quantity===1;plus.disabled=quantity>=maxQuantity;document.querySelector('#detail-add').textContent='Add to bag · '+money(product.price*quantity)}updateQuantity();
minus.onclick=()=>{quantity=Math.max(1,quantity-1);updateQuantity()};plus.onclick=()=>{quantity=Math.min(maxQuantity,quantity+1);updateQuantity()};
document.querySelector('#detail-add').onclick=()=>addToDemoBag(product,quantity);
const zoom=document.querySelector('#photo-zoom'),zoomImage=document.querySelector('#zoom-image');
zoomImage.src=product.image;zoomImage.alt=image.alt;
document.querySelector('#zoom-title').textContent=product.name+' · Bottle detail';
document.querySelector('#zoom-photo').onclick=()=>zoom.showModal();
document.querySelector('#close-zoom').onclick=()=>zoom.close();
const similar=products.filter(p=>p.id!==product.id&&p.category===product.category&&Boolean(p.real)===Boolean(product.real)).slice(0,3);
if(!similar.length)similar.push(...products.filter(p=>p.id!==product.id&&Boolean(p.real)===Boolean(product.real)).slice(0,3));
document.querySelector('#related-products').innerHTML=similar.map(p=>`<a class="related-product" href="product.html?id=${p.id}"><div class="related-photo"><img src="${e(p.image)}" loading="lazy" alt="${e(p.name)} perfume bottle"></div><p>${e(p.brand||(p.real?'Lattafa':'Concept collection'))}</p><h3>${e(p.name)}</h3><span>${money(p.price)} · ${p.size||100} ml</span></a>`).join('');
initProductMotion();
}
