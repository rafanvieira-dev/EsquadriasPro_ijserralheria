// =========================
// FIREBASE / FIRESTORE
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  getAuth, signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBn89D_MT30YlZoZcGth5HjCowyipXZWRY",
  authDomain: "esquadriaproij.firebaseapp.com",
  projectId: "esquadriaproij",
  storageBucket: "esquadriaproij.firebasestorage.app",
  messagingSenderId: "276375113314",
  appId: "1:276375113314:web:02bd520c116d28f13b4b3b",
  measurementId: "G-7SCW14J9XP"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

const KEY='esquadriaspro_data_v1';
const COLLECTIONS = {
  clients: 'clientes',
  quotes: 'orcamentos',
  materials: 'materiais',
  models: 'modelos'
};

const state = {
  clients: [],
  quotes: [],
  materials: [
    {id:'m1',name:'Alumínio preto',category:'Alumínio',unit:'kg',cost:28},
    {id:'m2',name:'Vidro 6mm comum incolor',category:'Vidro',unit:'m²',cost:160},
    {id:'m3',name:'Vidro 8mm temperado incolor',category:'Vidro',unit:'m²',cost:260},
    {id:'m4',name:'Fecho concha com mola',category:'Ferragem',unit:'un',cost:18},
    {id:'m5',name:'Roldana dupla 80kg',category:'Ferragem',unit:'un',cost:22}
  ],
  models: [
    {id:'janela2',name:'Janela 2 folhas',category:'Janela',description:'Duas folhas de correr.',type:'sliding2'},
    {id:'janela2peitoril',name:'Janela 2 folhas com peitoril',category:'Janela',description:'Modelo com quadro fixo inferior.',type:'sliding2sill'},
    {id:'maxim',name:'Maxim-ar',category:'Janela',description:'Folha projetante.',type:'awning'},
    {id:'pivot',name:'Janela pivotante',category:'Janela',description:'Abertura pivotante.',type:'pivot'},
    {id:'porta4',name:'Porta de correr 4 folhas',category:'Porta',description:'Porta de correr em 4 folhas.',type:'sliding4'},
    {id:'fixo',name:'Fixo com tubo',category:'Fixo',description:'Painel fixo.',type:'fixed'},
    {id:'guarda',name:'Guarda-corpo',category:'Guarda-corpo',description:'Guarda-corpo com torres.',type:'guard'},
    {id:'escada',name:'Guarda-corpo de escada',category:'Guarda-corpo',description:'Modelo inclinado.',type:'stairs'},
    {id:'portaPersiana',name:'Porta 2 folhas com persiana integrada',category:'Porta',description:'Modelo tipo linha Gold.',type:'persiana'}
  ],
  config: {
    company:'Igor Serralheiro',
    cnpj:'60.131.039/0001-70',
    phone:'(21) 97616-2768',
    address:'Rua Santos Rodrigues, 201 – Estácio – RJ',
    logo:'assets/logo.png',
    color:'#d71920'
  }
};

let currentPage='dashboard';
let itemCounter=0;

function materialOptions(selected=''){
  const materials=Array.isArray(state.materials)?state.materials:[];
  return '<option value="">Selecione ou informe o custo manualmente</option>'+
    materials.map(m=>`<option value="${esc(m.id)}" ${String(selected)===String(m.id)?'selected':''}>${esc(m.name)} — ${esc(m.unit)} — ${money(m.cost)}</option>`).join('');
}
function onMaterialSelect(sel){
  const row=sel.closest('.item-card');
  if(!row)return;
  const cost=row.querySelector('.item-material-cost');
  const qty=row.querySelector('.item-material-qty');
  const material=state.materials.find(m=>String(m.id)===sel.value);
  if(material && cost){cost.value=(Number(material.cost||0)*Number(qty?.value||0)).toFixed(2);calculateItem(row);}
}
function money(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function uid(prefix='id'){ return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7); }
function today(){ return new Date().toISOString().slice(0,10); }
let firebaseReady = false;

async function load(){
  try {
    setFirebaseStatus('connecting');
    await signInAnonymously(auth);

    const [clientsSnap, quotesSnap, materialsSnap, modelsSnap, configSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.clients)),
      getDocs(collection(db, COLLECTIONS.quotes)),
      getDocs(collection(db, COLLECTIONS.materials)),
      getDocs(collection(db, COLLECTIONS.models)),
      getDoc(doc(db, 'configuracoes', 'principal'))
    ]);

    state.clients = clientsSnap.docs.map(d => ({id:d.id, ...d.data()}));
    state.quotes = quotesSnap.docs.map(d => ({id:d.id, ...d.data()}));

    const firebaseMaterials = materialsSnap.docs.map(d => ({id:d.id, ...d.data()}));
    state.materials = firebaseMaterials.length ? firebaseMaterials : state.materials;

    const firebaseModels = modelsSnap.docs.map(d => ({id:d.id, ...d.data()}));
    state.models = firebaseModels.length ? firebaseModels : state.models;

    if(configSnap.exists()) state.config = {...state.config, ...configSnap.data()};
    if(!state.config.logo) state.config.logo = 'assets/logo.png';

    firebaseReady = true;
    setFirebaseStatus('online');
    return true;
  } catch(error) {
    console.error('Erro ao carregar Firebase:', error);
    firebaseReady = false;
    setFirebaseStatus('online');
    try {
      const saved=JSON.parse(localStorage.getItem(KEY));
      if(saved) Object.assign(state,saved);
    } catch(e) {}
    return false;
  }
}

function setFirebaseStatus(status){
  const overlay=document.getElementById('appLoading');
  const text=document.getElementById('appLoadingText');
  if(!overlay || !text) return;
  text.textContent='Carregado';
  setTimeout(()=>overlay.classList.add('hide'),500);
}

async function save(){
  try {
    if(!firebaseReady) throw new Error('Firebase ainda não está pronto.');
    await Promise.all([
      ...state.clients.map(c => setDoc(doc(db, COLLECTIONS.clients, c.id), c)),
      ...state.quotes.map(q => setDoc(doc(db, COLLECTIONS.quotes, q.id), q)),
      ...state.materials.map(m => setDoc(doc(db, COLLECTIONS.materials, m.id), m)),
      ...state.models.map(m => setDoc(doc(db, COLLECTIONS.models, m.id), m)),
      setDoc(doc(db, 'configuracoes', 'principal'), state.config)
    ]);
    localStorage.setItem(KEY, JSON.stringify(state));
    toast('Dados salvos no Firebase.');
    return true;
  } catch(error) {
    localStorage.setItem(KEY, JSON.stringify(state));
    toast('Cópia local salva.');
    return false;
  }
}

async function saveOne(collectionName, data){
  try {
    if(firebaseReady) await setDoc(doc(db, collectionName, data.id), data);
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch(error) {
    localStorage.setItem(KEY, JSON.stringify(state));
    return false;
  }
}

async function deleteOne(collectionName, id){
  try {
    if(firebaseReady) await deleteDoc(doc(db, collectionName, id));
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch(error) {
    localStorage.setItem(KEY, JSON.stringify(state));
    return false;
  }
}

function toast(msg){
  let t=document.querySelector('.toast'); if(!t){t=document.createElement('div');t.className='toast';Object.assign(t.style,{position:'fixed',right:'20px',bottom:'20px',background:'#111827',color:'#fff',padding:'12px 16px',borderRadius:'9px',zIndex:200});document.body.appendChild(t)}
  t.textContent=msg;t.style.opacity='1';clearTimeout(t._tm);t._tm=setTimeout(()=>t.style.opacity='0',2200);
}
function go(page){
  currentPage=page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  const labels={dashboard:'Dashboard',clientes:'Clientes',orcamentos:'Orçamentos','novo-orcamento':'Novo orçamento',modelos:'Modelos / Desenhos',materiais:'Materiais',ordens:'Produção',configuracoes:'Configurações'};
  document.getElementById('breadcrumb').textContent=labels[page]||page;
  if(page==='dashboard') renderDashboard();
  if(page==='clientes') renderClients();
  if(page==='orcamentos') renderQuotes();
  if(page==='modelos') renderModels();
  if(page==='materiais') renderMaterials();
  if(page==='novo-orcamento' && !document.getElementById('editingQuoteId').value) prepareNewQuote();
  document.getElementById('sidebar').classList.remove('open');
}
function nextQuoteNumber(){
  const year=new Date().getFullYear();
  const nums=state.quotes.map(q=>Number((q.number||'').split('/')[0])).filter(Boolean);
  return String((Math.max(0,...nums)+1)).padStart(4,'0')+'/'+year;
}
function renderDashboard(){
  document.getElementById('statOrcamentos').textContent=state.quotes.length;
  document.getElementById('statAprovados').textContent=state.quotes.filter(q=>q.status==='Aprovado').length;
  document.getElementById('statPendentes').textContent=state.quotes.filter(q=>['Rascunho','Enviado'].includes(q.status)).length;
  document.getElementById('statValor').textContent=money(state.quotes.reduce((s,q)=>s+Number(q.total||0),0));
  const rows=state.quotes.slice(-5).reverse();
  document.getElementById('recentQuotes').innerHTML=rows.length?`<table><thead><tr><th>Nº</th><th>Cliente</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows.map(q=>`<tr><td>${q.number}</td><td>${esc(q.clientName\vert{}\vert{}'—')}</td><td>${money(q.total)}</td><td><span class="status ${q.status}">${q.status}</span></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state"><p>Nenhum orçamento cadastrado.</p></div>';
}
function renderClients(){
  const term=(document.getElementById('clientSearch')?.value||'').toLowerCase();
  const list=state.clients.filter(c=>(c.name+' '+c.doc+' '+c.phone).toLowerCase().includes(term));
  document.getElementById('clientsTable').innerHTML=list.map(c=>{
    const count=state.quotes.filter(q=>q.clientId===c.id).length;
    return `<tr><td><span class="client-link" data-client="${c.id}">${esc(c.name)}</span></td><td>${esc(c.doc||'—')}</td><td>${esc(c.whatsapp||c.phone||'—')}</td><td>${esc(c.city||'—')}</td><td>${count}</td><td class="actions"><button class="mini-btn" data-edit-client="${c.id}">Editar</button><button class="mini-btn danger" data-delete-client="${c.id}">Excluir</button></td></tr>`;
  }).join('')||'<tr><td colspan="6" class="muted">Nenhum cliente encontrado.</td></tr>';
}

function renderQuotes(){
  const term=(document.getElementById('quoteSearch')?.value||'').toLowerCase();
  const filter=document.getElementById('quoteStatusFilter')?.value||'';
  const list=state.quotes.filter(q=>(q.number+' '+q.clientName).toLowerCase().includes(term)&&(filter?q.status===filter:true));
  document.getElementById('quotesTable').innerHTML=list.map(q=>`<tr><td>${q.number}</td><td>${esc(q.clientName||'—')}</td><td>${q.date||'—'}</td><td>${q.items?.length||0}</td><td>${money(q.total)}</td><td><span class="status ${q.status}">${q.status}</span></td><td class="actions"><button class="mini-btn" data-edit-quote="${q.id}">Editar</button><button class="mini-btn" data-print-quote="${q.id}">Imprimir</button><button class="mini-btn" data-receipt-quote="${q.id}">Recibo</button><button class="mini-btn" data-duplicate-quote="${q.id}">Duplicar</button><button class="mini-btn danger" data-delete-quote="${q.id}">Excluir</button></td></tr>`).join('')||'<tr><td colspan="7" class="muted">Nenhum orçamento encontrado.</td></tr>';
}

function populateClientSelect(selected=''){
  const sel=document.getElementById('quoteClient');
  sel.innerHTML='<option value="">Selecione um cliente</option>'+state.clients.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('');
}
function prepareNewQuote(){
  document.getElementById('quoteFormTitle').textContent='Novo orçamento';
  document.getElementById('editingQuoteId').value='';
  document.getElementById('quoteNumber').value=nextQuoteNumber();
  document.getElementById('quoteDate').value=today();
  document.getElementById('quoteValidity').value=10;
  document.getElementById('quoteStatus').value='Rascunho';
  document.getElementById('quoteWork').value='';
  document.getElementById('quoteSeller').value=state.config.company||'Administrador';
  populateClientSelect();
  document.getElementById('clientPreview').classList.add('hidden');
  document.getElementById('itemsContainer').innerHTML='';
  addItem();
  calcTotal();
}
function addItem(data={}){
  itemCounter++;
  const id='item_'+itemCounter;
  const div=document.createElement('div');div.className='item-card';div.dataset.item=id;
  const models=state.models;
  div.innerHTML=`
    <div class="item-head"><div class="item-title">ITEM ${String(itemCounter).padStart(2,'0')}</div><button type="button" class="mini-btn danger remove-item">Remover</button></div>
    <div class="item-grid">
      <label>Categoria<select class="item-category"><option>Janela</option><option>Porta</option><option>Portão</option><option>Guarda-corpo</option><option>Gradil</option><option>Basculante</option><option>Veneziana</option><option>Persiana</option><option>Box</option><option>Reforma</option><option>Conserto</option><option>Outro</option></select></label>
      <label>Modelo<select class="item-model">${models.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label>
      <label>Largura (mm)<input class="item-w" type="number" min="0" value="${data.w||1500}"></label>
      <label>Altura (mm)<input class="item-h" type="number" min="0" value="${data.h||1200}"></label>
      <label>Quantidade<input class="item-qty" type="number" min="1" value="${data.qty||1}"></label>
      <label>Preço final (R$)<input class="item-price-input" type="number" step="0.01" min="0" value="${data.price||0}"></label>
    </div>
    <div class="price-grid">
      <label>Material
<select class="item-material-select" onchange="onMaterialSelect(this)">
${materialOptions(data.materialIndex)}
</select>
</label>
<label>Quantidade do material
<input type="number" class="item-material-qty" value="${data.materialQty??1}" min="0" step="0.01"
 oninput="onMaterialSelect(this.closest('.item-card').querySelector('.item-material-select'))">
</label>
<label>Custo material (R$)<input class="item-material-cost" type="number" step="0.01" min="0" value="${data.materialCost??0}"></label>
      <label>Custo vidro (R$)<input class="item-glass-cost" type="number" step="0.01" min="0" value="${data.glassCost||0}"></label>
      <label>Custo ferragens (R$)<input class="item-hardware-cost" type="number" step="0.01" min="0" value="${data.hardwareCost||0}"></label>
      <label>Mão de obra (R$)<input class="item-labor-cost" type="number" step="0.01" min="0" value="${data.laborCost||0}"></label>
      <label>Instalação (R$)<input class="item-install-cost" type="number" step="0.01" min="0" value="${data.installCost||0}"></label>
      <label>Margem (%)<input class="item-margin" type="number" step="0.1" min="0" value="${data.margin??30}"></label>
      <div class="price-summary"><span>Custo: <b class="item-cost-total">R$ 0,00</b></span><span>Venda: <b class="item-sale-total">R$ 0,00</b></span></div>
      <button type="button" class="btn secondary small calculate-item">Calcular preço</button>
    </div>
    <div class="item-bottom">
      <label>Ambiente<input class="item-room" value="${esc(data.room||'')}" placeholder="Ex.: Cozinha"></label>
      <label>Linha<input class="item-line" value="${esc(data.line||'Linha 25')}"></label>
      <label>Alumínio<input class="item-aluminum" value="${esc(data.aluminum||'Preto')}"></label>
      <label>Vidro<input class="item-glass" value="${esc(data.glass||'Vidro 6mm comum incolor')}"></label>
    </div>
    <div class="item-bottom">
      <label>Ferragens<input class="item-hardware" value="${esc(data.hardware||'Preto')}"></label>
      <label>Componentes<input class="item-components" value="${esc(data.components||'')}"></label>
      <label>Descrição<input class="item-description" value="${esc(data.description||'')}"></label>
      <label>Observação<input class="item-note" value="${esc(data.note||'')}"></label>
    </div>
    <div class="item-drawing"><div class="drawing-box"></div><div><strong>Esboço automático</strong><p class="muted drawing-caption"></p><button type="button" class="mini-btn open-drawing">Ampliar desenho</button></div></div>`;
  document.getElementById('itemsContainer').appendChild(div);
  if(data.model) div.querySelector('.item-model').value=data.model;
  if(data.category) div.querySelector('.item-category').value=data.category;
  div.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>{
    updateItemDrawing(div);
    if(el.classList.contains('item-material-cost')||el.classList.contains('item-glass-cost')||el.classList.contains('item-hardware-cost')||el.classList.contains('item-labor-cost')||el.classList.contains('item-install-cost')||el.classList.contains('item-margin')) calculateItem(div);
    else calcTotal();
  }));
  div.querySelector('.calculate-item').onclick=()=>calculateItem(div);
  div.querySelector('.remove-item').onclick=()=>{div.remove();renumberItems();calcTotal()};
  div.querySelector('.open-drawing').onclick=()=>openDrawing(div);
  updateItemDrawing(div);
  const existingPrice=Number(data.price)||0;
  const cost=(Number(data.materialCost)||0)+(Number(data.glassCost)||0)+(Number(data.hardwareCost)||0)+(Number(data.laborCost)||0)+(Number(data.installCost)||0);
  div.querySelector('.item-cost-total').textContent=money(cost);
  div.querySelector('.item-sale-total').textContent=money(existingPrice);
  calcTotal();
}
function renumberItems(){document.querySelectorAll('#itemsContainer .item-card').forEach((el,i)=>el.querySelector('.item-title').textContent='ITEM '+String(i+1).padStart(2,'0'))}
function getSvg(type,w,h){
  const W=400,H=240,p=25,ratio=Math.min((W-2*p)/Math.max(w,1),(H-2*p)/Math.max(h,1));
  const dw=w*ratio,dh=h*ratio,x=(W-dw)/2,y=(H-dh)/2,stroke='#334155',fill='none';
  const rect=`<rect x="${x}" y="${y}" width="${dw}" height="${dh}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
  const dim=`<text x="${W/2}" y="${H-5}" text-anchor="middle" font-size="12" fill="#475569">${w} × ${h} mm</text>`;
  let extra='';
  if(type==='sliding2'){extra=`<line x1="${x+dw/2}" y1="${y}" x2="${x+dw/2}" y2="${y+dh}" stroke="${stroke}" stroke-width="3"/><path d="M ${x+dw*.28} ${y+dh/2} l 18 0 l -6 -6 M ${x+dw*.72} ${y+dh/2} l -18 0 l 6 -6" fill="none" stroke="${stroke}" stroke-width="2"/>`}
  if(type==='sliding2sill'){extra=`<line x1="${x+dw/2}" y1="${y}" x2="${x+dw/2}" y2="${y+dh*.72}" stroke="${stroke}" stroke-width="3"/><line x1="${x}" y1="${y+dh*.75}" x2="${x+dw}" y2="${y+dh*.75}" stroke="${stroke}" stroke-width="3"/>`}
  if(type==='sliding4'){extra=[.25,.5,.75].map(r=>`<line x1="${x+dw*r}" y1="${y}" x2="${x+dw*r}" y2="${y+dh}" stroke="${stroke}" stroke-width="3"/>`).join('')+`<path d="M ${x+dw*.16} ${y+dh/2} l 22 0 l -7 -7 M ${x+dw*.84} ${y+dh/2} l -22 0 l 7 -7" fill="none" stroke="${stroke}" stroke-width="2"/>`}
  if(type==='awning'){extra=`<line x1="${x+10}" y1="${y+dh-15}" x2="${x+dw-10}" y2="${y+dh-15}" stroke="${stroke}" stroke-width="2"/><line x1="${x+20}" y1="${y+20}" x2="${x+dw-20}" y2="${y+dh-30}" stroke="#94a3b8"/><line x1="${x+dw-20}" y1="${y+20}" x2="${x+20}" y2="${y+dh-30}" stroke="#94a3b8"/>`}
  if(type==='pivot'){extra=`<circle cx="${x+dw/2}" cy="${y+dh/2}" r="18" fill="white" stroke="${stroke}" stroke-width="2"/><rect x="${x+dw/2-4}" y="${y}" width="8" height="12" fill="${stroke}"/><rect x="${x+dw/2-4}" y="${y+dh-12}" width="8" height="12" fill="${stroke}"/>`}
  if(type==='fixed'){extra=''}
  if(type==='guard'){extra=`<line x1="${x+dw*.25}" y1="${y+dh}" x2="${x+dw*.25}" y2="${y+dh+22}" stroke="${stroke}" stroke-width="6"/><line x1="${x+dw*.75}" y1="${y+dh}" x2="${x+dw*.75}" y2="${y+dh+22}" stroke="${stroke}" stroke-width="6"/>`}
  if(type==='stairs'){extra=`<polyline points="${x},${y+dh} ${x+dw*.25},${y+dh*.75} ${x+dw*.5},${y+dh*.5} ${x+dw*.75},${y+dh*.25} ${x+dw},${y}" fill="none" stroke="${stroke}" stroke-width="4"/>`}
  if(type==='persiana'){extra=`<line x1="${x+dw/2}" y1="${y}" x2="${x+dw/2}" y2="${y+dh}" stroke="${stroke}" stroke-width="3"/><g stroke="#94a3b8">${Array.from({length:9},(_,i)=>`<line x1="${x+8}" y1="${y+12+i*10}" x2="${x+dw/2-8}" y2="${y+12+i*10}"/><line x1="${x+dw/2+8}" y1="${y+12+i*10}" x2="${x+dw-8}" y2="${y+12+i*10}"/>`).join('')}</g>`}
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${rect}${extra}${dim}</svg>`;
}
function updateItemDrawing(div){
  const model=state.models.find(m=>m.id===div.querySelector('.item-model').value)||state.models[0];
  const w=Number(div.querySelector('.item-w').value)||0,h=Number(div.querySelector('.item-h').value)||0;
  div.querySelector('.drawing-box').innerHTML=getSvg(model.type,w,h);
  div.querySelector('.drawing-caption').textContent=`${model.name} • ${w} × ${h} mm`;
}
function readItems(){
  return [...document.querySelectorAll('#itemsContainer .item-card')].map((d,i)=>{
    const model=d.querySelector('.item-model').value;
    return {
      category:d.querySelector('.item-category').value,model,
      w:Number(d.querySelector('.item-w').value)||0,h:Number(d.querySelector('.item-h').value)||0,
      qty:Number(d.querySelector('.item-qty').value)||1,price:Number(d.querySelector('.item-price-input').value)||0,
      materialIndex:d.querySelector('.item-material-select')?.value||'', materialQty:Number(d.querySelector('.item-material-qty')?.value)||1, materialCost:Number(d.querySelector('.item-material-cost').value)||0,
      glassCost:Number(d.querySelector('.item-glass-cost').value)||0,
      hardwareCost:Number(d.querySelector('.item-hardware-cost').value)||0,
      laborCost:Number(d.querySelector('.item-labor-cost').value)||0,
      installCost:Number(d.querySelector('.item-install-cost').value)||0,
      margin:Number(d.querySelector('.item-margin').value)||0,
      room:d.querySelector('.item-room').value,line:d.querySelector('.item-line').value,
      aluminum:d.querySelector('.item-aluminum').value,glass:d.querySelector('.item-glass').value,
      hardware:d.querySelector('.item-hardware').value,components:d.querySelector('.item-components').value,
      description:d.querySelector('.item-description').value,note:d.querySelector('.item-note').value
    };
  });
}
function calculateItem(div, silent=false){
  const material=Number(div.querySelector('.item-material-cost').value)||0;
  const glass=Number(div.querySelector('.item-glass-cost').value)||0;
  const hardware=Number(div.querySelector('.item-hardware-cost').value)||0;
  const labor=Number(div.querySelector('.item-labor-cost').value)||0;
  const install=Number(div.querySelector('.item-install-cost').value)||0;
  const margin=Number(div.querySelector('.item-margin').value)||0;
  const cost=material+glass+hardware+labor+install;
  const sale=cost*(1+margin/100);
  div.querySelector('.item-price-input').value=sale.toFixed(2);
  div.querySelector('.item-cost-total').textContent=money(cost);
  div.querySelector('.item-sale-total').textContent=money(sale);
  if(!silent) calcTotal();
}
function calcTotal(){
  const total=readItems().reduce((s,i)=>s+i.price*i.qty,0);
  document.getElementById('quoteTotal').textContent=money(total);
  return total;
}
async function saveQuote(e){
  if(e){ e.preventDefault(); e.stopPropagation(); }
  const concludeBtn=document.getElementById('concludeQuoteBtn');
  const topSaveBtn=document.getElementById('saveQuoteBtn');
  const buttons=[concludeBtn,topSaveBtn].filter(Boolean);
  buttons.forEach(b=>{b.disabled=true;});
  if(concludeBtn) concludeBtn.textContent='⏳ Salvando...';
  try{
    if(!Array.isArray(state.quotes)) state.quotes=[];
    if(!Array.isArray(state.clients)) state.clients=[];

    const clientSelect=document.getElementById('quoteClient');
    const clientId=clientSelect ? clientSelect.value : '';
    const client=state.clients.find(c=>String(c.id)===String(clientId));

    if(!client){
      alert('Selecione um cliente antes de salvar o orçamento.');
      if(clientSelect) clientSelect.focus();
      return false;
    }

    const items=readItems();
    if(!items.length){
      alert('Adicione pelo menos um item ao orçamento.');
      return false;
    }

    const editing=document.getElementById('editingQuoteId');
    const id=editing && editing.value ? editing.value : uid('q');
    const value=id=>{ const el=document.getElementById(id); return el ? el.value : ''; };

    const quote={
      id,
      number:value('quoteNumber')||nextQuoteNumber(),
      date:value('quoteDate')||today(),
      validity:Number(value('quoteValidity'))||10,
      status:value('quoteStatus')||'Rascunho',
      clientId:client.id,
      clientName:client.name,
      work:value('quoteWork'),
      seller:value('quoteSeller'),
      items,
      payment:value('paymentTerms'),
      delivery:value('deliveryTerms'),
      warranty:value('warrantyTerms'),
      notes:value('quoteNotes'),
      total:calcTotal()
    };

    const idx=state.quotes.findIndex(q=>String(q.id)===String(id));
    if(idx>=0) state.quotes[idx]=quote;
    else state.quotes.push(quote);

    await saveOne(COLLECTIONS.quotes, quote);
    toast('Orçamento salvo com sucesso.');
    renderQuotes();
    renderDashboard();
    setTimeout(()=>go('orcamentos'),150);
    return true;
  }catch(error){
    console.error('Erro ao salvar orçamento:', error);
    alert('Erro ao salvar orçamento.');
    return false;
  }finally{
    buttons.forEach(b=>{b.disabled=false;});
    if(concludeBtn) concludeBtn.textContent='✅ Concluir e salvar orçamento';
  }
}
function editQuote(id){
  const q=state.quotes.find(x=>x.id===id);if(!q)return;
  go('novo-orcamento');document.getElementById('quoteFormTitle').textContent='Editar orçamento';
  document.getElementById('editingQuoteId').value=q.id;document.getElementById('quoteNumber').value=q.number;document.getElementById('quoteDate').value=q.date;document.getElementById('quoteValidity').value=q.validity;document.getElementById('quoteStatus').value=q.status;document.getElementById('quoteWork').value=q.work||'';document.getElementById('quoteSeller').value=q.seller||'';populateClientSelect(q.clientId);showClientPreview(q.clientId);
  document.getElementById('paymentTerms').value=q.payment||'';document.getElementById('deliveryTerms').value=q.delivery||'';document.getElementById('warrantyTerms').value=q.warranty||'';document.getElementById('quoteNotes').value=q.notes||'';
  document.getElementById('itemsContainer').innerHTML='';itemCounter=0;(q.items||[]).forEach(i=>addItem(i));calcTotal();
}
async function duplicateQuote(id){
  const q=JSON.parse(JSON.stringify(state.quotes.find(x=>x.id===id)));if(!q)return;
  q.id=uid('q');q.number=nextQuoteNumber();q.status='Rascunho';q.date=today();state.quotes.push(q);await saveOne(COLLECTIONS.quotes,q);renderQuotes();
}

function printQuote(id){
  const q=state.quotes.find(x=>x.id===id);if(!q)return;
  const c=state.clients.find(x=>x.id===q.clientId)||{};
  const w=window.open('','_blank');if(!w){alert('Permita pop-ups para imprimir.');return}
  const items=q.items||[];
  const rows=items.map((i,n)=>{
    const model=(state.models.find(m=>m.id===i.model)||{}).name||'Produto';
    return '<tr><td>'+(n+1)+'</td><td><b>'+esc(model)+'</b><br><span class="desc">'+esc(i.description||'')+' '+(i.room?'• Ambiente: '+esc(i.room):'')+'</span></td><td class="center">'+i.qty+'</td><td class="center">'+i.w+' × '+i.h+' mm</td><td class="right">'+money(i.price)+'</td><td class="right">'+money(i.price*i.qty)+'</td></tr>';
  }).join('');
  
  const detail=items.map((i,n)=>{
    const model=(state.models.find(m=>m.id===i.model)||{}).name||'Produto';
    return '<div class="detail"><b>ITEM '+String(n+1).padStart(2,'0')+' — '+esc(model)+'</b><div>'+esc(i.aluminum||'')+' '+(i.line?'• '+esc(i.line):'')+' • '+esc(i.glass||'')+' • '+esc(i.hardware||'')+'</div><div>'+(i.components?'Componentes: '+esc(i.components):'')+' '+(i.note?'• '+esc(i.note):'')+'</div></div>';
  }).join('');

  const address=[c.address,c.number,c.complement,c.district].filter(Boolean).join(', ');
  const city=[c.city].filter(Boolean).join(' – ');
  
  const htmlDoc = '<doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento ' + esc(q.number) + '</title>' +
    '<style>@page{size:A4;margin:12mm 12mm 14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:10px;margin:0;line-height:1.35}' +
    '.top{border:1px solid #333;display:grid;grid-template-columns:1fr 220px;min-height:92px}' +
    '.brand{padding:10px;border-right:1px solid #333;min-height:92px;overflow:hidden}.brand h1{font-size:17px;margin:2px 0 2px;text-transform:uppercase;line-height:1.05}.brand .sub{font-size:8px;font-weight:bold}.brand .contact{font-size:7.5px;margin-top:6px;line-height:1.3}.print-logo{width:64px;height:64px;max-width:64px;max-height:64px;object-fit:contain;display:block;float:left;margin:0 10px 3px 0;background:transparent;border:0}' +
    '.number{padding:10px}.number .label{font-size:8px;font-weight:bold}.number .value{font-size:14px;font-weight:bold;margin:3px 0 8px}.number .notice{border:1px solid #777;padding:5px;font-size:8px;font-weight:bold;text-align:center}' +
    '.title{text-align:center;border:1px solid #333;border-top:0;padding:6px;font-size:15px;font-weight:bold;letter-spacing:.5px}' +
    '.section-title{background:#e9edf2;border:1px solid #555;border-bottom:0;padding:4px 6px;font-size:9px;font-weight:bold;text-transform:uppercase}' +
    '.box{border:1px solid #555;padding:7px;margin-bottom:8px;min-height:55px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:0}.cols>div{padding-right:10px}.field{margin:2px 0}.field b{font-size:8px}.field span{font-size:9px}' +
    'table{width:100%;border-collapse:collapse}.items th{background:#e9edf2;border:1px solid #555;padding:5px;font-size:8px;text-transform:uppercase}.items td{border:1px solid #888;padding:5px;vertical-align:top;font-size:9px}.desc{font-size:8px;color:#444}.center{text-align:center}.right{text-align:right;white-space:nowrap}' +
    '.value-box{border:1px solid #555;border-top:0;display:grid;grid-template-columns:1fr 1fr}.value-box>div{padding:7px}.value-box>div:first-child{border-right:1px solid #555}.value-big{font-size:13px;font-weight:bold}' +
    '.detail{border-bottom:1px dotted #888;padding:5px 0;font-size:8.5px}.detail:last-child{border-bottom:0}' +
    '.conditions{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #555}.conditions>div{padding:7px;border-right:1px solid #555}.conditions>div:last-child{border-right:0}.conditions b{display:block;font-size:8px}.conditions span{font-size:9px}' +
    '.notes{border:1px solid #555;padding:7px;min-height:55px}.footer{margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:35px}.signature{text-align:center;padding-top:22px;border-top:1px solid #555;font-size:9px}' +
    '.legal{margin-top:12px;text-align:center;font-size:7.5px;color:#555;border-top:1px solid #bbb;padding-top:6px}' +
    '</style></head><body>' +
    '<div class="top"><div class="brand">' + (state.config.logo ? '<img class="print-logo" src="' + esc(state.config.logo) + '" alt="Logo">' : '') + '<h1>' + esc(state.config.company) + '</h1><div class="sub">SERRALHERIA E ESQUADRIAS</div><div class="contact">' + esc(state.config.address) + '<br>Tel./WhatsApp: ' + esc(state.config.phone) + '<br>CNPJ: ' + esc(state.config.cnpj) + '</div></div>' +
    '<div class="number"><div class="label">DOCUMENTO</div><div class="value">ORÇAMENTO Nº ' + esc(q.number) + '</div><div class="label">DATA</div><div>' + (q.date ? q.date.split('-').reverse().join('/') : '—') + '</div><div class="notice">ORÇAMENTO<br>NÃO É DOCUMENTO FISCAL</div></div></div>' +
    '<div class="title">ORÇAMENTO COMERCIAL</div>' +
    '<div class="section-title">PRESTADOR / EMPRESA</div><div class="box"><div class="cols"><div><div class="field"><b>CNPJ:</b> <span>' + esc(state.config.cnpj) + '</span></div><div class="field"><b>Nome/Razão Social:</b> <span>' + esc(state.config.company) + '</span></div><div class="field"><b>Endereço:</b> <span>' + esc(state.config.address) + '</span></div></div><div><div class="field"><b>Telefone:</b> <span>' + esc(state.config.phone) + '</span></div><div class="field"><b>Responsável:</b> <span>' + esc(q.seller || '—') + '</span></div><div class="field"><b>Obra:</b> <span>' + esc(q.work || '—') + '</span></div></div></div></div>' +
    '<div class="section-title">CLIENTE / TOMADOR</div><div class="box"><div class="cols"><div><div class="field"><b>CPF/CNPJ:</b> <span>' + esc(c.doc || '—') + '</span></div><div class="field"><b>Nome/Razão Social:</b> <span>' + esc(c.name || q.clientName) + '</span></div><div class="field"><b>Endereço:</b> <span>' + esc(address || '—') + '</span></div></div><div><div class="field"><b>Município/UF:</b> <span>' + esc(city || '—') + '</span></div><div class="field"><b>Telefone/WhatsApp:</b> <span>' + esc(c.whatsapp || c.phone || '—') + '</span></div><div class="field"><b>E-mail:</b> <span>' + esc(c.email || '—') + '</span></div></div></div></div>' +
    '<div class="section-title">DISCRIMINAÇÃO DOS PRODUTOS / SERVIÇOS</div><table class="items"><thead><tr><th style="width:5%">Item</th><th>Descrição</th><th style="width:7%">Qtd.</th><th style="width:15%">Medidas</th><th style="width:15%">Valor unit.</th><th style="width:15%">Valor total</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="value-box"><div><b>DESCRIÇÃO TÉCNICA</b>' + detail + '</div><div><b>VALOR DO ORÇAMENTO</b><div class="value-big">' + money(q.total) + '</div></div></div>' +
    '<div class="section-title">CONDIÇÕES COMERCIAIS</div><div class="conditions"><div><b>FORMA DE PAGAMENTO</b><span>' + esc(q.payment || 'A combinar') + '</span></div><div><b>PRAZO DE ENTREGA</b><span>' + esc(q.delivery || 'A combinar') + '</span></div><div><b>GARANTIA</b><span>' + esc(q.warranty || 'A combinar') + '</span></div></div>' +
    '<div class="section-title" style="margin-top:8px">OUTRAS INFORMAÇÕES</div><div class="notes">' + esc(q.notes || 'Validade do orçamento: ' + (q.validity || 10) + ' dias.') + '</div>' +
    '<div class="footer"><div class="signature">Cliente / Contratante<br>' + esc(c.name || q.clientName) + '</div><div class="signature">' + esc(state.config.company) + '<br>CNPJ: ' + esc(state.config.cnpj) + '</div></div>' +
    '<div class="legal">Este documento é uma proposta/orçamento comercial e não substitui documento fiscal. A NFS-e oficial, quando aplicável, deve ser emitida pelo sistema fiscal competente.</div>' +
    '<script>window.onload = function() { window.print(); }</script></body></html>';

  w.document.write(htmlDoc);
  w.document.close();
}

function printReceipt(id){
  const q=state.quotes.find(x=>x.id===id);if(!q)return;
  const c=state.clients.find(x=>x.id===q.clientId)||{};
  const w=window.open('','_blank');if(!w){alert('Permita pop-ups para imprimir.');return}

  const htmlReceipt = '<doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo ' + esc(q.number) + '</title>' +
    '<style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;color:#000;padding:20px;max-width:800px;margin:0 auto}.recibo-container{border:2px solid #000;padding:20px;border-radius:8px}.cabecalho-recibo{text-align:center;border-bottom:2px solid #000;margin-bottom:20px;padding-bottom:10px}.cabecalho-recibo h2{margin:0;font-size:24px;text-transform:uppercase}.cabecalho-recibo p{margin:5px 0 0;font-size:12px}h3{text-align:center;font-size:20px;margin-bottom:30px}.dados-recibo p{font-size:14px;margin-bottom:10px;line-height:1.6}.dados-recibo strong{display:inline-block;width:150px}.assinatura{margin-top:80px;text-align:center}.assinatura p{margin:5px 0}.valor-destaque{font-size:18px;font-weight:bold}.print-logo{max-width:120px;max-height:60px;margin-bottom:10px}</style></head><body>' +
    '<div class="recibo-container"><div class="cabecalho-recibo">' + (state.config.logo ? '<img class="print-logo" src="' + esc(state.config.logo) + '" alt="Logo">' : '') + '<h2>' + esc(state.config.company) + '</h2><p>CNPJ: ' + esc(state.config.cnpj) + ' | Tel: ' + esc(state.config.phone) + '</p><p>' + esc(state.config.address) + '</p></div>' +
    '<h3>RECIBO DE PAGAMENTO</h3>' +
    '<div class="dados-recibo"><p><strong>Nº do Orçamento:</strong> ' + esc(q.number) + '</p><p><strong>Cliente:</strong> ' + esc(c.name || q.clientName) + '</p><p><strong>CPF/CNPJ:</strong> ' + esc(c.doc || '—') + '</p><p><strong>Referente a:</strong> Serviços de Esquadrias e Serralheria (' + esc(q.work || 'Orçamento aprovado') + ')</p><p><strong>Valor Total:</strong> <span class="valor-destaque">' + money(q.total) + '</span></p><p><strong>Data de Emissão:</strong> ' + new Date().toLocaleDateString('pt-BR') + '</p></div>' +
    '<div class="assinatura"><p>_________________________________________________</p><p>' + esc(state.config.company) + '</p><p>Assinatura do Emissor</p></div></div>' +
    '<script>window.onload = function() { window.print(); }</script></body></html>';

  w.document.write(htmlReceipt);
  w.document.close();
}

function openDrawing(div){
  const model=state.models.find(m=>m.id===div.querySelector('.item-model').value)||state.models[0];
  const w=Number(div.querySelector('.item-w').value)||0,h=Number(div.querySelector('.item-h').value)||0;
  document.getElementById('drawingLarge').innerHTML=`<div style="padding:20px"><h3>${esc(model.name)}</h3><p>${w} × ${h} mm</p>${getSvg(model.type,w,h)}</div>`;
  openModal('drawingModal');
}
function showClientPreview(id){
  const c=state.clients.find(x=>x.id===id), box=document.getElementById('clientPreview');
  if(!c){box.classList.add('hidden');return}
  box.classList.remove('hidden');box.innerHTML=`<strong>${esc(c.name)}</strong> • ${esc(c.doc||'CPF/CNPJ não informado')}<br>${esc(c.address||'')} ${esc(c.number||'')}, ${esc(c.district||'')} — ${esc(c.city||'')}<br>Contato: ${esc(c.whatsapp||c.phone||'—')}`;
}
function openModal(id){document.getElementById(id).classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open')}
function resetClientForm(){document.getElementById('clientForm').reset();document.getElementById('clientId').value='';document.getElementById('clientModalTitle').textContent='Novo cliente'}
function editClient(id){
  const c=state.clients.find(x=>x.id===id);if(!c)return;
  openModal('clientModal');document.getElementById('clientModalTitle').textContent='Editar cliente';
  Object.entries({clientId:c.id,clientName:c.name,clientDoc:c.doc,clientPhone:c.phone,clientWhatsapp:c.whatsapp,clientEmail:c.email,clientCep:c.cep,clientAddress:c.address,clientNumber:c.number,clientComplement:c.complement,clientDistrict:c.district,clientCity:c.city,clientNotes:c.notes}).forEach(([id,v])=>document.getElementById(id).value=v||'');
}
async function saveClient(e){
  e.preventDefault();
  const id=document.getElementById('clientId').value||uid('c');
  const c={id,name:document.getElementById('clientName').value.trim(),doc:document.getElementById('clientDoc').value,phone:document.getElementById('clientPhone').value,whatsapp:document.getElementById('clientWhatsapp').value,email:document.getElementById('clientEmail').value,cep:document.getElementById('clientCep').value,address:document.getElementById('clientAddress').value,number:document.getElementById('clientNumber').value,complement:document.getElementById('clientComplement').value,district:document.getElementById('clientDistrict').value,city:document.getElementById('clientCity').value,notes:document.getElementById('clientNotes').value};
  const idx=state.clients.findIndex(x=>x.id===id);if(idx>=0)state.clients[idx]=c;else state.clients.push(c);
  await saveOne(COLLECTIONS.clients, c);closeModal('clientModal');renderClients();populateClientSelect();
}
function renderModels(){
  document.getElementById('modelsGrid').innerHTML=state.models.map(m=>`<div class="model-card"><div class="model-drawing">${getSvg(m.type,1200,800)}</div><h3>${esc(m.name)}</h3><div class="muted">${esc(m.category)}</div><p>${esc(m.description||'')}</p><button class="mini-btn" data-model-draw="${m.id}">Ver desenho</button></div>`).join('');
}
function renderMaterials(){
  document.getElementById('materialsTable').innerHTML=state.materials.map(m=>`<tr><td>${esc(m.name)}</td><td>${esc(m.category)}</td><td>${esc(m.unit)}</td><td>${money(m.cost)}</td><td><button class="mini-btn danger" data-delete-material="${m.id}">Excluir</button></td></tr>`).join('');
}
function applyLogo(){
  const logo=state.config.logo||'';
  const img=document.getElementById('brandLogo');
  const fallback=document.getElementById('brandLogoFallback');
  const preview=document.getElementById('logoPreview');
  if(img){
    if(logo){ img.src=logo; img.classList.remove('hidden'); img.onerror=()=>{img.classList.add('hidden'); if(fallback)fallback.classList.remove('hidden');}; }
    else { img.removeAttribute('src'); img.classList.add('hidden'); }
  }
  if(fallback) fallback.classList.toggle('hidden',!!logo);
  if(preview){
    preview.innerHTML=logo ? `<img src="${esc(logo)}" alt="Logo"><span class="muted">Logo cadastrada. Ela será usada no sistema e na impressão.</span>` : '<span class="muted">Nenhuma logo cadastrada ainda.</span>';
  }
}

function readLogoFile(file){
  return new Promise((resolve,reject)=>{
    if(!file){resolve('');return;}
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

async function saveConfig(){
  state.config.company=document.getElementById('cfgCompany').value;
  state.config.cnpj=document.getElementById('cfgCnpj').value;
  state.config.phone=document.getElementById('cfgPhone').value;
  state.config.address=document.getElementById('cfgAddress').value;
  state.config.logo=document.getElementById('cfgLogo').value.trim();
  state.config.color=document.getElementById('cfgColor').value;
  const file=document.getElementById('cfgLogoFile')?.files?.[0];
  if(file) state.config.logo=await readLogoFile(file);
  await save();
  applyLogo();
  toast('Configurações salvas.');
}
function loadConfig(){
  document.getElementById('cfgCompany').value=state.config.company||'';
  document.getElementById('cfgCnpj').value=state.config.cnpj||'';
  document.getElementById('cfgPhone').value=state.config.phone||'';
  document.getElementById('cfgAddress').value=state.config.address||'';
  document.getElementById('cfgLogo').value=(state.config.logo||'').startsWith('data:')?'':(state.config.logo||'');
  document.getElementById('cfgColor').value=state.config.color||'#d71920';
  applyLogo();
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

document.addEventListener('DOMContentLoaded',async()=>{
  await load();loadConfig();go('dashboard');
  document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>go(b.dataset.page));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  document.getElementById('mobileMenu').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('saveBtn').onclick=save;
  document.getElementById('newClientBtn').onclick=()=>{resetClientForm();openModal('clientModal')};
  document.getElementById('clientForm').onsubmit=saveClient;
  document.getElementById('addItemBtn').onclick=()=>addItem();
  document.getElementById('calculateAllBtn').onclick=()=>{document.querySelectorAll('#itemsContainer .item-card').forEach(d=>calculateItem(d,true));calcTotal();toast('Valores dos itens recalculados.');};
  const saveQuoteBtn=document.getElementById('saveQuoteBtn');
  if(saveQuoteBtn){
    saveQuoteBtn.type='button';
    saveQuoteBtn.addEventListener('click',saveQuote);
  }
  const concludeQuoteBtn=document.getElementById('concludeQuoteBtn');
  if(concludeQuoteBtn){
    concludeQuoteBtn.type='button';
    concludeQuoteBtn.addEventListener('click',saveQuote);
  }
  const quoteForm=document.getElementById('quoteForm');
  if(quoteForm){
    quoteForm.addEventListener('submit',saveQuote);
  }
  document.getElementById('clearQuoteBtn').onclick=prepareNewQuote;
  document.getElementById('quoteClient').onchange=e=>showClientPreview(e.target.value);
  document.getElementById('clientSearch').oninput=renderClients;
  document.getElementById('quoteSearch').oninput=renderQuotes;
  document.getElementById('quoteStatusFilter').onchange=renderQuotes;
  document.getElementById('newModelBtn').onclick=()=>openModal('modelModal');
  document.getElementById('newMaterialBtn').onclick=()=>openModal('materialModal');
  document.getElementById('modelForm').onsubmit=e=>{e.preventDefault();state.models.push({id:uid('m'),name:document.getElementById('modelName').value,category:document.getElementById('modelCategory').value,description:document.getElementById('modelDescription').value,type:'fixed'});save();closeModal('modelModal');e.target.reset();renderModels()};
  document.getElementById('materialForm').onsubmit=e=>{e.preventDefault();state.materials.push({id:uid('mat'),name:document.getElementById('materialName').value,category:document.getElementById('materialCategory').value,unit:document.getElementById('materialUnit').value,cost:Number(document.getElementById('materialCost').value)||0});save();closeModal('materialModal');e.target.reset();renderMaterials()};
  document.getElementById('saveConfigBtn').onclick=saveConfig;
  document.getElementById('cfgLogoFile')?.addEventListener('change',async e=>{const file=e.target.files?.[0]; if(!file)return; state.config.logo=await readLogoFile(file); applyLogo();});
  document.getElementById('cfgLogo')?.addEventListener('input',e=>{state.config.logo=e.target.value.trim(); applyLogo();});
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'))});
  
  document.addEventListener('click',async e=>{
    const t=e.target;
    if(t.dataset.editClient)editClient(t.dataset.editClient);
    if(t.dataset.deleteClient){if(confirm('Excluir este cliente?')){const id=t.dataset.deleteClient;state.clients=state.clients.filter(c=>c.id!==id);await deleteOne(COLLECTIONS.clients,id);renderClients();}}
    if(t.dataset.editQuote)editQuote(t.dataset.editQuote);
    if(t.dataset.printQuote)printQuote(t.dataset.printQuote);
    if(t.dataset.receiptQuote)printReceipt(t.dataset.receiptQuote);
    if(t.dataset.duplicateQuote)duplicateQuote(t.dataset.duplicateQuote);
    if(t.dataset.deleteQuote){if(confirm('Excluir este orçamento?')){const id=t.dataset.deleteQuote;state.quotes=state.quotes.filter(q=>q.id!==id);await deleteOne(COLLECTIONS.quotes,id);renderQuotes();renderDashboard();}}
    if(t.dataset.modelDraw){const m=state.models.find(x=>x.id===t.dataset.modelDraw);document.getElementById('drawingLarge').innerHTML=`<h3>${esc(m.name)}</h3>${getSvg(m.type,1200,800)}`;openModal('drawingModal')}
    if(t.dataset.deleteMaterial){if(confirm('Excluir este material?')){const id=t.dataset.deleteMaterial;state.materials=state.materials.filter(m=>m.id!==id);await deleteOne(COLLECTIONS.materials,id);renderMaterials();}}
  });
});
