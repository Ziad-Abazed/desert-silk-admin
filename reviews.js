import {backendConnected,products} from './catalog.js';
import {escapeHtml as e} from './safe-html.js';
const form=document.querySelector('#review-form'),preview=document.querySelector('#review-preview');
const id=Number(new URLSearchParams(location.search).get('id')??8);
if(form&&products.some(p=>p.id===id)){
 const status=document.querySelector('#review-status');
 if(backendConnected){form.querySelector('.review-policy').textContent='Your review is saved for store approval before publication.';form.querySelector('[type="submit"]').textContent='Submit review';loadReviews()}
 document.querySelector('#write-review').addEventListener('click',()=>{form.hidden=false;document.querySelector('#review-name').focus()});
 document.querySelector('#cancel-review').addEventListener('click',()=>{form.hidden=true;preview.hidden=true});
 async function loadReviews(){try{const response=await fetch(`/api/products/${id}/reviews`);if(!response.ok)throw Error();const rows=await response.json();document.querySelector('.reviews-empty').hidden=rows.length>0;document.querySelector('#approved-reviews').innerHTML=rows.map(r=>`<article class="review-entry"><strong>${e(r.name)}</strong><p>${r.rating} out of 5 stars</p><p>${e(r.message)}</p></article>`).join('');if(rows.length)document.querySelector('.review-jump').textContent=(rows.reduce((s,r)=>s+r.rating,0)/rows.length).toFixed(1)+' / 5 · '+rows.length+' customer reviews ↗'}catch{status.textContent='Reviews could not be loaded. Please refresh.'}}
 form.addEventListener('submit',async event=>{
 event.preventDefault();const name=form.elements.displayName.value.trim(),message=form.elements.review.value.trim(),rating=Number(form.elements.rating.value);
 if(!name||!message){form.reportValidity();return}
 if(backendConnected){const button=form.querySelector('[type="submit"]');button.disabled=true;try{const response=await fetch(`/api/products/${id}/reviews`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,message,rating})});const result=await response.json();if(!response.ok)throw Error(result.error);status.textContent=result.message;form.reset();preview.hidden=true}catch(error){status.textContent=error.message||'Review could not be submitted.'}finally{button.disabled=false}return}
 preview.hidden=false;preview.querySelector('.review-preview-name').textContent=name;preview.querySelector('.review-preview-rating').textContent=rating+' out of 5 stars';preview.querySelector('.review-preview-message').textContent=message;status.textContent='Preview ready. Connect the backend to submit this review.';
 });
}
