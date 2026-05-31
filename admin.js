let adminData = [], cmsData = [], admPass = '';
const api = () => CONFIG.API_URL;
const psw = () => admPass;

function login() {
  admPass = document.getElementById('adm-pass').value;
  if(!admPass) return;
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('adminDash').classList.add('active');
  loadLeads();
}

function tab(t) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(`tab-${t}`).classList.add('active');
  if(t==='ents') loadEnts(); if(t==='cms') loadCMS();
}

async function fetchGet(act) {
  const r = await fetch(`${api()}?action=${act}&password=${psw()}`);
  return r.json();
}
async function fetchPost(data) {
  return await fetch(api(), {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({...data, password:psw()})}).then(r=>r.json());
}

async function loadLeads() {
  try {
    const res = await fetchGet('leads');
    if(res.error) { alert(res.error); return; }
    adminData = res.data || [];
    renderLeads(adminData);
    updStats();
  } catch(e) { document.getElementById('leads-body').innerHTML='<tr><td colspan="9">Ошибка сети</td></tr>'; }
}

function renderLeads(data) {
  const fStat = document.getElementById('f-status').value, fSearch = document.getElementById('f-search').value.toLowerCase();
  const filtered = data.filter(d=>{
    if(fStat && d.status!==fStat) return false;
    if(fSearch && !JSON.stringify(d).toLowerCase().includes(fSearch)) return false;
    return true;
  });
  const tb = document.getElementById('leads-body');
  if(!filtered.length){ tb.innerHTML='<tr><td colspan="9">Нет данных</td></tr>'; return; }
  tb.innerHTML = filtered.map(d=>{
    const sc = {Новая:'s-new','В работе':'s-contact',Согласен:'s-agreed',Отказ:'s-reject',Готово:'s-done'}[d.status]||'s-new';
    const addr = `${d.street||''}, ${d.house||''}, п.${d.entrance||''}`;    return `<tr><td>${d.date?.split(' ')[0]||''}</td><td>${d.name||''}</td><td><a href="tel:${d.phone}">${d.phone||''}</a></td><td>${addr}</td><td>${d.apartment||''}</td><td>${d.total_apts||''}</td><td>${d.with_sub==='true'?'📱 200₽':'🔑 Разовая'}</td><td><span class="status ${sc}">${d.status||'Новая'}</span></td><td class="actions"><button class="btn-sm" onclick="openEdit('${d.id}','${d.status}','${d.comment||''}')">✏️</button></td></tr>`;
  }).join('');
}
document.getElementById('f-status')?.addEventListener('change', ()=>renderLeads(adminData));
document.getElementById('f-search')?.addEventListener('input', ()=>renderLeads(adminData));

function updStats() {
  document.getElementById('st-tot').textContent = adminData.length;
  document.getElementById('st-new').textContent = adminData.filter(d=>d.status==='Новая').length;
  document.getElementById('st-agr').textContent = adminData.filter(d=>d.status==='Согласен'||d.status==='Готово').length;
  const ents = new Set(adminData.map(d=>`${d.street}-${d.house}-${d.entrance}`));
  document.getElementById('st-ent').textContent = ents.size;
}

function openEdit(id, st, comm) {
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-status').value = st;
  document.getElementById('edit-comm').value = comm;
  document.getElementById('edit-modal').style.display = 'flex';
}
async function saveLead() {
  const r = await fetchPost({action:'update_lead', id:document.getElementById('edit-id').value, status:document.getElementById('edit-status').value, comment:document.getElementById('edit-comm').value});
  if(r.status==='updated') { document.getElementById('edit-modal').style.display='none'; loadLeads(); alert('✅ Сохранено'); }
}

async function loadEnts() {
  const r = await fetchGet('entrance_stats');
  const g = document.getElementById('ents-grid');
  if(!r.stats?.length){ g.innerHTML='Нет данных'; return; }
  g.innerHTML = r.stats.map(s=>{
    const c = s.percent>=50?'var(--success)':s.percent>=25?'var(--warning)':'var(--danger)';
    return `<div style="margin-bottom:15px;background:#fff;padding:16px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h4>${s.address}</h4>${s.canInstall?'<span class="badge-ready">✅ Готово к установке</span>':''}</div><div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin-bottom:6px"><div style="height:100%;width:0%;background:${c};transition:width 1s" data-w="${s.percent}%"></div></div><div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#64748b"><span>${s.agreed} из ${s.total}</span><strong>${s.percent}%</strong></div></div>`;
  }).join('');
  setTimeout(()=>g.querySelectorAll('[data-w]').forEach(b=>b.style.width=b.dataset.w),300);
}

async function loadCMS() {
  document.getElementById('cms-status').textContent='⏳ Загрузка...';
  try {
    const r = await fetchGet('get_cms');
    cmsData = Object.entries(r).map(([k,v])=>({key:k, value:v, section:k.includes('price')?'pricing':k.includes('hero')?'hero':k.includes('phone')?'contacts':'general'}));
    renderCMS(); document.getElementById('cms-status').textContent=`✅ Загружено: ${cmsData.length}`;
  } catch{ document.getElementById('cms-status').textContent='❌ Ошибка'; }
}
function renderCMS() {
  const sec = document.getElementById('cms-sec').value;
  const filtered = sec ? cmsData.filter(d=>d.section===sec) : cmsData;
  document.getElementById('cms-body').innerHTML = filtered.map(d=>`<tr><td><code>${d.key}</code></td><td><span class="status s-new">${d.section}</span></td><td><input type="text" value="${d.value}" class="cms-in" data-k="${d.key}"></td><td><button class="btn-sm" onclick="saveCMS('${d.key}')">💾</button></td></tr>`).join('');
}
async function saveCMS(key) {  const val = document.querySelector(`[data-k="${key}"]`).value;
  const r = await fetchPost({action:'update_cms', key, value:val});
  document.getElementById('cms-status').textContent = r.status==='updated'?'✅ Сохранено':'❌ Ошибка';
  setTimeout(()=>document.getElementById('cms-status').textContent='', 2000);
}