let adminData = [], cmsData = [], admPass = '';
const API = CONFIG.API_URL;
const PSW = () => admPass;

// Авторизация
function login() {
  admPass = document.getElementById('adm-pass').value.trim();
  if (!admPass) return;
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminDash').classList.add('active');
  loadLeads();
}

// Переключение вкладок
function switchTab(name, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`tab-${name}`).classList.add('active');
  if (name === 'ents') loadEnts();
  if (name === 'cms') loadCMS();
}

// API вызовы
async function apiGet(action) {
  const r = await fetch(`${API}?action=${action}&password=${PSW()}`);
  if (!r.ok) throw new Error('Network error');
  return r.json();
}
async function apiPost(data) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...data, password: PSW() }) });
  return r.json();
}

// Загрузка заявок
async function loadLeads() {
  try {
    const res = await apiGet('leads');
    if (res.error) { alert('Ошибка: ' + res.error); return; }
    adminData = res.data || [];
    renderLeads();
    updateStats();
  } catch (e) {
    document.getElementById('leads-body').innerHTML = `<tr><td colspan="9" style="text-align:center;color:red">❌ Ошибка: ${e.message}</td></tr>`;
  }
}

function renderLeads() {
  const fStat = document.getElementById('f-status').value;
  const fSearch = document.getElementById('f-search').value.toLowerCase();  
  const filtered = adminData.filter(d => {
    if (fStat && d.status !== fStat) return false;
    const str = `${d.name||''} ${d.phone||''} ${d.street||''} ${d.house||''}`.toLowerCase();
    if (fSearch && !str.includes(fSearch)) return false;
    return true;
  });

  const tb = document.getElementById('leads-body');
  if (!filtered.length) { tb.innerHTML = '<tr><td colspan="9" style="text-align:center">Нет данных</td></tr>'; return; }

  tb.innerHTML = filtered.map(d => {
    const date = d.date ? (typeof d.date === 'string' ? d.date.split(' ')[0] : new Date(d.date).toLocaleDateString()) : '—';
    const addr = `${d.street||''}, ${d.house||''}, п.${d.entrance||''}`;
    const tariff = d.with_sub === true || d.with_sub === 'true' ? '📱 200₽/мес' : '🔑 Разовая';
    const sc = { 'Новая':'s-new', 'В работе':'s-work', 'Согласен':'s-agreed', 'Отказ':'s-reject', 'Готово':'s-done' }[d.status] || 's-new';
    
    return `<tr>
      <td>${date}</td>
      <td><strong>${d.name||'—'}</strong></td>
      <td><a href="tel:${d.phone}">${d.phone||'—'}</a></td>
      <td>${addr}</td>
      <td>${d.apartment||'—'}</td>
      <td>${d.total_apts||'—'}</td>
      <td>${tariff}</td>
      <td><span class="status ${sc}">${d.status||'Новая'}</span></td>
      <td class="actions"><button class="btn-sm" onclick="openModal('${d.id}','${d.status}','${(d.comment||'').replace(/"/g,'&quot;')}')">✏️ Изменить</button></td>
    </tr>`;
  }).join('');
}

// Фильтры
document.getElementById('f-status').addEventListener('change', renderLeads);
document.getElementById('f-search').addEventListener('input', renderLeads);

function updateStats() {
  document.getElementById('st-tot').textContent = adminData.length;
  document.getElementById('st-new').textContent = adminData.filter(d => d.status === 'Новая').length;
  document.getElementById('st-agr').textContent = adminData.filter(d => d.status === 'Согласен' || d.status === 'Готово').length;
  const ents = new Set(adminData.map(d => `${d.street}-${d.house}-${d.entrance}`));
  document.getElementById('st-ent').textContent = ents.size;
}

// Модальное окно
function openModal(id, status, comm) {
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-status').value = status || 'Новая';
  document.getElementById('edit-comm').value = comm || '';
  document.getElementById('edit-modal').classList.add('open');
}function closeModal() {
  document.getElementById('edit-modal').classList.remove('open');
}

async function saveLead() {
  const id = document.getElementById('edit-id').value;
  const status = document.getElementById('edit-status').value;
  const comm = document.getElementById('edit-comm').value;
  try {
    const res = await apiPost({ action: 'update_lead', id, status, comment: comm });
    if (res.status === 'updated') { closeModal(); loadLeads(); alert('✅ Заявка обновлена'); }
    else alert('❌ Ошибка: ' + (res.error || 'Неизвестно'));
  } catch (e) { alert('❌ Сетевая ошибка'); }
}

// Подъезды
async function loadEnts() {
  try {
    const res = await apiGet('entrance_stats');
    const g = document.getElementById('ents-grid');
    if (!res.stats?.length) { g.innerHTML = '<p style="text-align:center;color:#64748b">Нет данных</p>'; return; }
    g.innerHTML = res.stats.map(s => {
      const c = s.percent >= 50 ? 'var(--success)' : s.percent >= 25 ? 'var(--warning)' : 'var(--danger)';
      return `<div style="background:#fff;padding:16px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h4 style="margin:0;font-size:1rem">${s.address}</h4>
          ${s.canInstall ? '<span class="status s-agreed">✅ Готово к монтажу</span>' : ''}
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:0%;background:${c};transition:width 1s" data-w="${s.percent}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#64748b;margin-top:4px"><span>${s.agreed} из ${s.total} квартир</span><strong>${s.percent}%</strong></div>
      </div>`;
    }).join('');
    setTimeout(() => g.querySelectorAll('[data-w]').forEach(b => b.style.width = b.dataset.w), 300);
  } catch (e) { document.getElementById('ents-grid').innerHTML = '<p style="color:red">Ошибка загрузки</p>'; }
}

// CMS
async function loadCMS() {
  const st = document.getElementById('cms-status');
  st.textContent = '⏳ Загрузка...';
  try {
    const res = await apiGet('get_cms');
    cmsData = Object.entries(res).map(([k, v]) => ({ key: k, value: String(v), section: k.includes('price') ? 'pricing' : k.includes('hero') ? 'hero' : k.includes('phone') ? 'contacts' : 'seo' }));
    renderCMS();
    st.textContent = `✅ Загружено: ${cmsData.length} параметров`;
  } catch (e) { st.textContent = '❌ Ошибка: ' + e.message; }
}

function renderCMS() {
  const sec = document.getElementById('cms-sec').value;  const filtered = sec ? cmsData.filter(d => d.section === sec) : cmsData;
  document.getElementById('cms-body').innerHTML = filtered.map(d =>
    `<tr><td><code>${d.key}</code></td><td><span class="status s-new">${d.section}</span></td><td><input type="text" value="${d.value.replace(/"/g, '&quot;')}" class="cms-in" data-k="${d.key}"></td><td><button class="btn-sm" onclick="saveCMS('${d.key}')">💾</button></td></tr>`
  ).join('');
}

document.getElementById('cms-sec').addEventListener('change', renderCMS);

async function saveCMS(key) {
  const val = document.querySelector(`[data-k="${key}"]`).value;
  try {
    await apiPost({ action: 'update_cms', key, value: val });
    document.getElementById('cms-status').textContent = '✅ Сохранено';
    setTimeout(() => document.getElementById('cms-status').textContent = '', 2000);
  } catch (e) { alert('❌ Ошибка сохранения'); }
}