document.addEventListener('DOMContentLoaded', () => {
  // 1. Меню
  const burger = document.getElementById('burger'), menu = document.getElementById('mobileMenu'), overlay = document.getElementById('overlay');
  const toggle = () => { menu.classList.toggle('open'); overlay.classList.toggle('open'); document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : ''; };
  burger?.addEventListener('click', toggle); overlay?.addEventListener('click', toggle); menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', toggle));

  // 2. Хедер при скролле
  window.addEventListener('scroll', () => document.getElementById('header')?.classList.toggle('scrolled', window.scrollY > 50), {passive:true});

  // 3. Анимации при скролле
  const obs = new IntersectionObserver((ents) => ents.forEach(e => { if(e.isIntersecting){e.target.classList.add('visible'); if(e.target.classList.contains('stat-card')) animateCounter(e.target.querySelector('.stat-num')); obs.unobserve(e.target); } }), {threshold:0.15});
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  function animateCounter(el) { if(!el || el.dataset.done) return; const raw = el.textContent.replace(/\D/g,''); const target = parseInt(raw); if(!target) return; let cur = 0; const step = target / 1000; const int = setInterval(()=>{cur+=step;if(cur>=target){el.textContent=raw;clearInterval(int);el.dataset.done='1';}else el.textContent=Math.floor(cur);},16); }

  // 4. Калькулятор
  const calcApt = document.getElementById('calc-entrance'), calcSub = document.getElementById('calc-sub');
  const updCalc = () => {
    const n = Math.max(1, parseInt(calcApt.value)||36), w = calcSub.checked;
    const p = w ? CONFIG.CALC.sub : CONFIG.CALC.base, per = Math.round(p/n);
    document.getElementById('calc-total').textContent = p.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('calc-per-apt').textContent = per.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('calc-monthly').textContent = CONFIG.CALC.monthly + ' ₽/мес';
    document.getElementById('calc-monthly-row').style.display = w ? 'flex' : 'none';
    document.getElementById('calc-note').textContent = w ? `Экономия: ${Math.round((CONFIG.CALC.base-p)/n).toLocaleString()} ₽/кв` : 'Без ежемесячных платежей';
  };
  calcApt?.addEventListener('input', updCalc); calcSub?.addEventListener('change', updCalc); updCalc();

  // 5. Форма
  const form = document.getElementById('appForm'), btn = document.getElementById('f-btn');
  const ok = document.getElementById('f-ok'), err = document.getElementById('f-err');
  form?.addEventListener('submit', async e => {
    e.preventDefault(); btn.disabled = true; btn.textContent = '⏳ Отправка...'; ok.classList.remove('show'); err.classList.remove('show');
    const data = { action:'submit_lead', password: CONFIG.ADMIN_PASS, name: document.getElementById('f-name').value, phone: document.getElementById('f-phone').value, street: document.getElementById('f-street').value, house: document.getElementById('f-house').value, entrance: document.getElementById('f-entrance').value, apartment: document.getElementById('f-apt').value, totalApartments: document.getElementById('f-total').value, withSubscription: document.getElementById('f-sub').checked, comment: document.getElementById('f-comment').value };
    try {
      if (CONFIG.IS_PREVIEW) { await new Promise(r=>setTimeout(r,800)); console.log('DEMO:', data); ok.classList.add('show'); }
      else {
        const res = await fetch(CONFIG.API_URL, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(data) });
        const r = await res.json(); if(r.status==='success') ok.classList.add('show'); else throw r;
      }
      form.reset(); setTimeout(()=>ok.classList.remove('show'),4000);
    } catch { err.classList.add('show'); setTimeout(()=>err.classList.remove('show'),4000); }
    finally { btn.disabled = false; btn.textContent = 'Отправить заявку'; }
  });

  // Маска телефона
  document.getElementById('f-phone')?.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g,''); if(!v.startsWith('7')&&!v.startsWith('8')) v='7'+v; let f='+7';
    if(v.length>1) f+=`(${v.slice(1,4)}`; if(v.length>4) f+=`) ${v.slice(4,7)}`; if(v.length>7) f+=`-${v.slice(7,9)}`; if(v.length>9) f+=`-${v.slice(9,11)}`; e.target.value=f;
  });

  // 6. Прогресс
  const grid = document.getElementById('prog-grid');
  const loadProg = async () => {
    let stats = [];
    if(CONFIG.IS_PREVIEW) { stats=[{address:'ул. Ленина, д.12, п.1',total:36,agreed:20,percent:56,canInstall:true},{address:'пр. Мира, д.45, п.2',total:48,agreed:15,percent:31,canInstall:false},{address:'ул. Советская, д.8, п.3',total:24,agreed:6,percent:25,canInstall:false}]; }
    else { try { const r=await fetch(`${CONFIG.API_URL}?action=entrance_stats&password=${CONFIG.ADMIN_PASS}`); const d=await r.json(); stats=d.stats||[]; } catch{ grid.innerHTML='<div class="loading">⚠️ Ошибка сети</div>'; return; } }
    if(!stats.length){ grid.innerHTML='<div class="loading">📭 Пока нет данных</div>'; return; }
    grid.innerHTML = stats.map(s=>{
      const c = s.percent>=50?'var(--success)':s.percent>=25?'var(--warning)':'var(--danger)';
      return `<div class="progress-card reveal"><div class="progress-header"><h4>🏠 ${s.address}</h4>${s.canInstall?'<span class="badge-ready pulse">✅ Готово</span>':''}</div><div class="progress-bar-container"><div class="progress-bar" style="width:0%;background:${c}" data-w="${s.percent}%"></div></div><div class="progress-info"><span>${s.agreed} из ${s.total}</span><strong>${s.percent}%</strong></div></div>`;
    }).join('');
    setTimeout(()=>grid.querySelectorAll('.progress-bar').forEach(b=>b.style.width=b.dataset.w),300);
    grid.querySelectorAll('.progress-card').forEach(el=>obs.observe(el));
  };
  loadProg();
  document.getElementById('prog-search')?.addEventListener('input', e=>{
    const q=e.target.value.toLowerCase(); document.querySelectorAll('.progress-card').forEach(c=>c.style.display=c.querySelector('h4').textContent.toLowerCase().includes(q)?'':'none');
  });

  // 7. CMS Injection
  const loadCMS = async () => {
    try {
      const r = await fetch(`${CONFIG.API_URL}?action=get_cms&password=${CONFIG.ADMIN_PASS}`);
      const cms = await r.json();
      Object.entries(cms).forEach(([k,v])=>{
        const el = document.querySelector(`[data-cms="${k}"]`);
        if(el) el.textContent = k.includes('price')?parseInt(v).toLocaleString('ru-RU')+' ₽':v;
      });
      document.querySelectorAll('[data-cms-phone]').forEach(a=>a.href=`tel:${cms.phone}`);
      if(cms.meta_desc) document.querySelector('meta[name="description"]')?.setAttribute('content', cms.meta_desc);
    } catch(e) { console.warn('CMS:', e); }
  };
  loadCMS();
});