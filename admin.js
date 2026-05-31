let adminData = [], cmsData = [], admPass = '';
const API = CONFIG.API_URL;
const PSW = () => admPass;

function login() {
  admPass = document.getElementById('adm-pass').value.trim();
  if (!admPass) return;
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminDash').classList.add('active');
  loadLeads();
}

function switchTab(name, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`tab-${name}`).classList.add('active');
  if (name === 'ents') loadEnts();
  if (name === 'cms') loadCMS();
}

async function apiGet(action) {
  const r = await fetch(`${API}?action=${action}&password=${PSW()}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  if (json.error) throw new Error(json.error);
  return json;
}

async function apiPost(data) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...data, password: PSW() }) });
  const json = await r.json();
  if (json.error) throw new Error(json.error);
  return json;
}

// === ЗАЯВКИ ===
async function loadLeads() {
  try {
    let data = [];
    if (CONFIG.IS_PREVIEW) {
      await new Promise(r => setTimeout(r, 300));
      data = [
        {id:'demo-1', date:'27.05.2026 14:30', name:'Иван Петров', phone:'+79991234567', street:'ул. Ленина', house:'12', entrance:'1', apartment:'15', total_apts:'36', with_sub:'true', status:'Новая', comment:''},
        {id:'demo-2', date:'26.05.2026 09:15', name:'Анна Сидорова', phone:'+79123456789', street:'пр. Мира', house:'45', entrance:'2', apartment:'3', total_apts:'48', with_sub:'false', status:'В работе', comment:'Позвонить в 18:00'}
      ];
    } else {
      const res = await apiGet('leads');
      data = res.data || [];
    }    adminData = data;
    renderLeads();
    updateStats();
  } catch (e) {
    document.getElementById('leads-body').innerHTML = `<tr><td colspan="9" style="text-align:center;color:red">❌ ${e.message}</td></tr>`;
  }
}

function renderLeads() {
  const fStat = document.getElementById('f-status').value;
  const fSearch = document.getElementById('f-search').value.toLowerCase();
  const tb = document.getElementById('leads-body');

  const filtered = adminData.filter(d => {
    if (fStat && d.status !== fStat) return false;
    const str = `${d.name||''} ${d.phone||''} ${d.street||''} ${d.house||''}`.toLowerCase();
    return !fSearch || str.includes(fSearch);
  });

  if (!filtered.length) { tb.innerHTML = '<tr><td colspan="9" style="text-align:center">Нет данных</td></tr>'; return; }

  tb.innerHTML = filtered.map(d => {
    const date = d.date ? (String(d.date).includes('T') ? new Date(d.date).toLocaleDateString() : String(d.date).split(' ')[0]) : '—';
    const addr = `${d.street||'—'}, ${d.house||'?'}, п.${d.entrance||'?'}`;
    const tariff = d.with_sub === true || d.with_sub === 'true' ? '📱 200₽/мес' : '🔑 Разовая';
    const sc = { 'Новая':'s-new', 'В работе':'s-work', 'Согласен':'s-agreed', 'Отказ':'s-reject', 'Готово':'s-done' }[d.status] || 's-new';
    
    return `<tr>
      <td>${date}</td><td><strong>${d.name||'—'}</strong></td><td><a href="tel:${d.phone}">${d.phone||'—'}</a></td>
      <td>${addr}</td><td>${d.apartment||'—'}</td><td>${d.total_apts||'—'}</td>
      <td>${tariff}</td><td><span class="status ${sc}">${d.status||'Новая'}</span></td>
      <td class="actions"><button class="btn-sm" onclick="openModal('${d.id}','${d.status}','${String(d.comment||'').replace(/"/g,'&quot;')}')">✏️</button></td>
    </tr>`;
  }).join('');
}

document.getElementById('f-status').addEventListener('change', renderLeads);
document.getElementById('f-search').addEventListener('input', renderLeads);

function updateStats() {
  document.getElementById('st-tot').textContent = adminData.length;
  document.getElementById('st-new').textContent = adminData.filter(d => d.status === 'Новая').length;
  document.getElementById('st-agr').textContent = adminData.filter(d => d.status === 'Согласен' || d.status === 'Готово').length;
  document.getElementById('st-ent').textContent = new Set(adminData.map(d => `${d.street}-${d.house}-${d.entrance}`)).size;
}

function openModal(id, status, comm) {
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-status').value = status || 'Новая';
  document.getElementById('edit-comm').value = comm || '';  document.getElementById('edit-modal').classList.add('open');
}
function closeModal() { document.getElementById('edit-modal').classList.remove('open'); }

async function saveLead() {
  const id = document.getElementById('edit-id').value;
  const status = document.getElementById('edit-status').value;
  const comm = document.getElementById('edit-comm').value;

  // Демо-режим
  if (CONFIG.IS_PREVIEW) {
    const idx = adminData.findIndex(d => d.id === id);
    if (idx !== -1) {
      adminData[idx].status = status;
      adminData[idx].comment = comm;
      closeModal(); renderLeads(); updateStats();
      alert('✅ Демо: заявка обновлена');
    }
    return;
  }

  try {
    console.log('📤 Отправка обновления:', {id, status, comment: comm});
    const res = await apiPost({ action: 'update_lead', id, status, comment: comm });
    closeModal(); loadLeads();
    alert('✅ Заявка обновлена');
  } catch (e) {
    alert('❌ Ошибка: ' + e.message);
  }
}

// === ПОДЪЕЗДЫ ===
async function loadEnts() {
  const g = document.getElementById('ents-grid');
  g.innerHTML = '<p style="text-align:center;color:#64748b">⏳ Загрузка...</p>';
  try {
    let stats = [];
    if (CONFIG.IS_PREVIEW) {
      await new Promise(r => setTimeout(r, 300));
      stats = [
        { address: 'ул. Ленина, д.12, п.1', total: 36, agreed: 20, percent: 56, canInstall: true },
        { address: 'пр. Мира, д.45, п.2', total: 48, agreed: 15, percent: 31, canInstall: false }
      ];
    } else {
      const res = await apiGet('entrance_stats');
      stats = res.stats || [];
    }

    if (!stats.length) { g.innerHTML = '<p style="text-align:center;color:#64748b">Нет данных</p>'; return; }
    g.innerHTML = stats.map(s => {
      const addr = String(s.address||'').trim() || 'Адрес не указан';
      const total = Number(s.total) || 0;
      const agreed = Number(s.agreed) || 0;
      const pct = Number(s.percent) || (total ? Math.round((agreed/total)*100) : 0);
      const color = pct >= 50 ? 'var(--success)' : pct >= 25 ? 'var(--warning)' : 'var(--danger)';
      const can = s.canInstall || pct >= 50;

      return `<div style="background:#fff;padding:16px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h4 style="margin:0;font-size:1rem">🏠 ${addr}</h4>
          ${can ? '<span class="status s-agreed">✅ Готово</span>' : ''}
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:0%;background:${color};transition:width 1s" data-w="${pct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#64748b;margin-top:4px">
          <span>${agreed} из ${total}</span><strong>${pct}%</strong>
        </div>
      </div>`;
    }).join('');
    setTimeout(() => g.querySelectorAll('[data-w]').forEach(b => b.style.width = b.dataset.w), 100);
  } catch (e) {
    g.innerHTML = `<p style="text-align:center;color:red">❌ ${e.message}</p>`;
  }
}

// === CMS ===
async function loadCMS() {
  const st = document.getElementById('cms-status');
  st.textContent = '⏳ Загрузка...';
  try {
    let cms = CONFIG.IS_PREVIEW ? { hero_title:'Демо заголовок', price_min:'35000', phone:'+7 (999) 000-00-00' } : await apiGet('get_cms');
    cmsData = Object.entries(cms).map(([k, v]) => ({ key:k, value:String(v), section:k.includes('price')?'pricing':k.includes('hero')?'hero':'seo' }));
    renderCMS(); st.textContent = `✅ Загружено: ${cmsData.length}`;
  } catch (e) { st.textContent = `❌ ${e.message}`; }
}

function renderCMS() {
  const sec = document.getElementById('cms-sec').value;
  const filtered = sec ? cmsData.filter(d => d.section === sec) : cmsData;
  document.getElementById('cms-body').innerHTML = filtered.map(d =>
    `<tr><td><code>${d.key}</code></td><td><span class="status s-new">${d.section}</span></td><td><input type="text" value="${d.value.replace(/"/g,'&quot;')}" data-k="${d.key}"></td><td><button class="btn-sm" onclick="saveCMS('${d.key}')">💾</button></td></tr>`
  ).join('');
}
document.getElementById('cms-sec').addEventListener('change', renderCMS);

async function saveCMS(key) {
  const val = document.querySelector(`[data-k="${key}"]`).value;
  try {    await apiPost({ action:'update_cms', key, value:val });
    document.getElementById('cms-status').textContent = '✅ Сохранено';
    setTimeout(()=>document.getElementById('cms-status').textContent='',2000);
  } catch (e) { alert('❌ '+e.message); }
}