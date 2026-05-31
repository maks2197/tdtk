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
// === ТДТК.РФ — app.js (полная версия) ===
// === 1. ВАЛИДАТОР ТЕЛЕФОНА ===
  const PhoneValidator = {
    clean: (val) => (val||'').replace(/[^\d+]/g, ''),
    format: (val) => {
      let v = PhoneValidator.clean(val);
      if (!v) return '';
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (!v.startsWith('7') && !v.startsWith('+')) v = '7' + v;
      v = v.replace('+', '').slice(0, 11);
      let f = '+7';
      if (v.length > 1) f += ` (${v.slice(1, 4)}`;
      if (v.length >= 4) f += `) ${v.slice(4, 7)}`;
      if (v.length >= 7) f += `-${v.slice(7, 9)}`;
      if (v.length >= 9) f += `-${v.slice(9, 11)}`;
      return f;
    },
    isValid: (val) => {
      const digits = PhoneValidator.clean(val).replace(/^7/, '').replace(/^\+7/, '');
      return digits.length === 10 && /^\d+$/.test(digits);
    },
    getRaw: (val) => {
      const cleaned = PhoneValidator.clean(val);
      return cleaned.startsWith('7') ? cleaned : '7' + cleaned.replace('+', '');
    }
  };

  // === 2. ВАЛИДАТОР КВАРТИРЫ ===
  const AptValidator = {
    isValid: (val, total) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0 && num <= (total || 9999) && num <= 9999;
    },
    getMessage: (val, total) => {
      if (!val) return 'Укажите номер квартиры';
      const num = parseInt(val);
      if (isNaN(num)) return 'Только цифры';
      if (num <= 0) return 'Номер должен быть больше 0';
      if (total && num > total) return `В подъезде всего ${total} квартир`;
      if (num > 9999) return 'Слишком большой номер';
      return '';
    }
  };

  // === 3. ИНИЦИАЛИЗАЦИЯ МАСОК И ВАЛИДАЦИИ ===
  function initPhoneMask(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', (e) => {
      e.target.value = PhoneValidator.format(e.target.value);
      if (PhoneValidator.isValid(e.target.value)) {
        input.style.borderColor = '';
        input.setCustomValidity('');
      }
    });
    input.addEventListener('blur', (e) => {
      if (!PhoneValidator.isValid(e.target.value)) {
        input.style.borderColor = 'var(--danger)';
        input.setCustomValidity('Введите номер: +7 (999) 123-45-67');
      } else {
        input.style.borderColor = '';
        input.setCustomValidity('');
      }
    });
    input.addEventListener('focus', () => { input.style.borderColor = ''; input.setCustomValidity(''); });
  }

  function initAptValidation() {
    const aptInput = document.getElementById('f-apt');
    const totalInput = document.getElementById('f-total');
    if (!aptInput || !totalInput) return;

    const validate = () => {
      const apt = aptInput.value.trim();
      const total = parseInt(totalInput.value) || 9999;
      if (AptValidator.isValid(apt, total)) {
        aptInput.style.borderColor = '';
        aptInput.setCustomValidity('');
        return true;
      } else {
        aptInput.style.borderColor = 'var(--danger)';
        const msg = AptValidator.getMessage(apt, total);
        aptInput.setCustomValidity(msg);
        return false;
      }
    };

    aptInput.addEventListener('input', validate);
    aptInput.addEventListener('blur', validate);
    totalInput.addEventListener('change', validate);
    aptInput.addEventListener('focus', () => { aptInput.style.borderColor = ''; aptInput.setCustomValidity(''); });
  }

  // === 4. ПРОВЕРКА ДУБЛИКАТОВ ===
  async function checkDuplicate(street, house, entrance, apartment) {
    try {
      // Загружаем заявки (в демо-режиме — пустой массив)
      const leads = CONFIG.IS_PREVIEW ? [] : (await apiFetch('leads')).data || [];
      
      // Нормализуем ввод для надёжного сравнения
      const norm = (s) => String(s||'').toLowerCase().trim().replace(/[^a-zа-я0-9]/g, '');
      
      const isDup = leads.some(l => 
        norm(l.street) === norm(street) &&
        norm(l.house) === norm(house) &&
        String(l.entrance) === String(entrance) &&
        String(l.apartment) === String(apartment) &&
        l.status !== 'Отказ' // Игнорируем отклонённые заявки
      );
      
      return isDup;
    } catch (e) {
      console.warn('⚠️ Не удалось проверить дубликаты:', e);
      return false; // Не блокируем отправку при ошибке сети
    }
  }

  // === 5. API-ЗАПРОСЫ С ЗАЩИТОЙ ОТ CORS ===
  async function apiFetch(action, method = 'GET', body = null) {
    const url = `${CONFIG.API_URL}?action=${action}&password=${CONFIG.ADMIN_PASS}`;
    const options = {
      method,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      mode: 'cors',
      credentials: 'omit'
    };
    if (body) options.body = typeof body === 'string' ? body : JSON.stringify(body);
    
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Демо-данные для тестов
  function getDemoData(action) {
    if (action === 'leads') return { status:'success', data:[] };
    if (action === 'entrance_stats') return { status:'success', stats:[{address:'ул. Ленина, д.12, п.1', total:36, agreed:20, percent:56, canInstall:true}] };
    if (action === 'get_cms') return { hero_title:'Домофон для вашего подъезда', price_min:'35000', phone:'+7 (999) 123-45-67', base_price:'70000', sub_price:'35000', monthly_fee:'200', meta_desc:'Коллективная установка домофонов.' };
    return {};
  }

  // === 6. КАЛЬКУЛЯТОР ===
  const calcEntrance = document.getElementById('calc-entrance');
  const calcSub = document.getElementById('calc-sub');
  const updateCalc = () => {
    const n = Math.max(1, parseInt(calcEntrance.value)||12), w = calcSub.checked;
    const p = w ? CONFIG.CALC.sub : CONFIG.CALC.base, per = Math.round(p/n);
    document.getElementById('calc-total').textContent = p.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('calc-per-apt').textContent = per.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('calc-monthly').textContent = CONFIG.CALC.monthly + ' ₽/мес';
    document.getElementById('calc-monthly-row').style.display = w ? 'flex' : 'none';
    document.getElementById('calc-note').textContent = w 
      ? `Экономия: ${Math.round((CONFIG.CALC.base-p)/n).toLocaleString()} ₽/кв` 
      : 'Без ежемесячных платежей';
  };
  calcEntrance?.addEventListener('input', updateCalc);
  calcSub?.addEventListener('change', updateCalc);
  updateCalc();

  // === 7. CMS INJECTION (ИСПРАВЛЕННЫЙ) ===
  async function applyCMS() {
    try {
      // Получаем данные: либо демо, либо с сервера
      const cms = CONFIG.IS_PREVIEW ? getDemoData('get_cms') : await apiFetch('get_cms');
      
      // Применяем значения к элементам с data-cms="ключ"
      Object.entries(cms).forEach(([key, data]) => {
        // Поддержка старого формата (просто значение) и нового (объект с полями)
        const value = typeof data === 'object' && data !== null ? data.value : data;
        const el = document.querySelector(`[data-cms="${key}"]`);
        
        if (el) {
          // Числовые поля форматируем: 70000 → "70 000 ₽"
          const numericKeys = ['price_min', 'base_price', 'sub_price', 'monthly_fee'];
          if (numericKeys.includes(key)) {
            const num = parseInt(value);
            el.textContent = !isNaN(num) ? num.toLocaleString('ru-RU') + ' ₽' : value;
          } else {
            el.textContent = value;
          }
        }
      });
      
      // Специальные обработчики для телефона и email
      if (cms.phone) {
        document.querySelectorAll('[data-cms-phone]').forEach(a => {
          a.href = `tel:${PhoneValidator.getRaw(cms.phone)}`;
          a.textContent = `📞 ${cms.phone}`;
        });
      }
      if (cms.email) {
        document.querySelectorAll('[data-cms-email]').forEach(a => {
          a.href = `mailto:${cms.email}`;
          a.textContent = `📧 ${cms.email}`;
        });
      }
      
      // SEO: meta-теги
      if (cms.meta_title) document.title = cms.meta_title;
      if (cms.meta_desc) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
        meta.content = cms.meta_desc;
      }
      if (cms.og_title) {
        let og = document.querySelector('meta[property="og:title"]');
        if (!og) { og = document.createElement('meta'); og.setAttribute('property','og:title'); document.head.appendChild(og); }
        og.content = cms.og_title;
      }
      
    } catch (e) {
      console.warn('⚠️ CMS не загрузилась, используются значения по умолчанию:', e);
    }
  }

  // === 8. ОТПРАВКА ФОРМЫ С ВАЛИДАЦИЕЙ И ПРОВЕРКОЙ ДУБЛИКАТОВ ===
  const form = document.getElementById('appForm');
  const btn = document.getElementById('f-btn');
  const ok = document.getElementById('f-ok');
  const err = document.getElementById('f-err');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Базовая валидация HTML5
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // 2. Дополнительная валидация квартиры
    const apt = document.getElementById('f-apt').value.trim();
    const total = parseInt(document.getElementById('f-total').value) || 9999;
    if (!AptValidator.isValid(apt, total)) {
      alert(AptValidator.getMessage(apt, total));
      document.getElementById('f-apt').focus();
      return;
    }
    
    // 3. Проверка дубликатов
    btn.disabled = true;
    btn.innerHTML = '🔍 Проверка...';
    
    const street = document.getElementById('f-street').value.trim();
    const house = document.getElementById('f-house').value.trim();
    const entrance = document.getElementById('f-entrance').value.trim();
    const apartment = document.getElementById('f-apt').value.trim();
    
    try {
      const isDup = await checkDuplicate(street, house, entrance, apartment);
      if (isDup) {
        alert('⚠️ Заявка для квартиры №' + apartment + ' по адресу ' + street + ', ' + house + ' уже отправлена.\nЕсли вы меняли решение — позвоните нам: ' + (CONFIG.CMS?.phone || '+7 (999) 123-45-67'));
        btn.disabled = false;
        btn.innerHTML = 'Отправить заявку';
        return;
      }
    } catch (dupErr) {
      console.warn('⚠️ Ошибка проверки дубликатов, продолжаем отправку:', dupErr);
    }
    
    // 4. Формирование данных для отправки
    btn.innerHTML = '⏳ Отправка...';
    ok.classList.remove('show');
    err.classList.remove('show');
    
    const payload = {
      action: 'submit_lead',
      password: CONFIG.ADMIN_PASS,
      name: document.getElementById('f-name').value.trim(),
      phone: PhoneValidator.getRaw(document.getElementById('f-phone').value),
      street: street,
      house: house,
      entrance: entrance,
      apartment: apartment,
      totalApartments: total,
      withSubscription: document.getElementById('f-sub').checked,
      comment: document.getElementById('f-comment').value.trim()
    };
    
    // 5. Отправка
    try {
      if (CONFIG.IS_PREVIEW) {
        await new Promise(r => setTimeout(r, 800));
        console.log('📦 Демо-отправка:', payload);
        ok.classList.add('show');
      } else {
        const res = await apiFetch('submit_lead', 'POST', payload);
        if (res.status === 'success') ok.classList.add('show');
        else throw new Error(res.error || 'Неизвестная ошибка');
      }
      form.reset();
      setTimeout(() => ok.classList.remove('show'), 5000);
    } catch (e) {
      console.error('❌ Ошибка отправки:', e);
      err.classList.add('show');
      setTimeout(() => err.classList.remove('show'), 5000);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Отправить заявку';
    }
  });

  // === 9. ПРОГРЕСС ПОДЪЕЗДОВ ===
  async function loadProgress() {
    const grid = document.getElementById('prog-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading">⏳ Загрузка...</div>';
    
    try {
      const data = CONFIG.IS_PREVIEW ? getDemoData('entrance_stats') : await apiFetch('entrance_stats');
      const stats = data.stats || [];
      
      if (!stats.length) {
        grid.innerHTML = '<div class="loading">📭 Пока нет заявок. Будьте первым!</div>';
        return;
      }
      
      grid.innerHTML = stats.map(s => {
        const addr = s.address || s.addr || 'Адрес не указан';
        const total = Number(s.total) || 0;
        const agreed = Number(s.agreed) || 0;
        const pct = Number(s.percent) || (total ? Math.round((agreed/total)*100) : 0);
        const can = s.canInstall || pct >= 50;
        const color = pct >= 50 ? 'var(--success)' : pct >= 25 ? 'var(--warning)' : 'var(--danger)';
        
        return `
          <div class="progress-card reveal">
            <div class="progress-header">
              <h4>🏠 ${addr}</h4>
              ${can ? '<span class="badge-ready pulse">✅ Готово к установке</span>' : ''}
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" style="width:0%;background:${color}" data-w="${pct}%"></div>
            </div>
            <div class="progress-info">
              <span>${agreed} из ${total} квартир</span>
              <strong>${pct}%</strong>
            </div>
          </div>`;
      }).join('');
      
      // Анимация прогресс-баров
      setTimeout(() => {
        grid.querySelectorAll('.progress-bar').forEach(b => b.style.width = b.dataset.w);
      }, 300);
      
      // Подключаем анимацию появления
      grid.querySelectorAll('.progress-card').forEach(el => {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach(e => { if(e.isIntersecting){e.target.classList.add('visible'); obs.unobserve(e.target);} });
        }, {threshold:0.15});
        obs.observe(el);
      });
      
    } catch (e) {
      console.error('❌ Ошибка загрузки прогресса:', e);
      grid.innerHTML = '<div class="loading">⚠️ Ошибка загрузки данных</div>';
    }
  }
  loadProgress();
  
  // Поиск по адресу в прогрессе
  document.getElementById('prog-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.progress-card').forEach(card => {
      const addr = card.querySelector('h4')?.textContent.toLowerCase() || '';
      card.style.display = addr.includes(q) ? '' : 'none';
    });
  });

  // === 10. АНИМАЦИИ ПРИ СКРОЛЛЕ ===
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Анимация счётчиков в статистике
        if (entry.target.classList.contains('stat-card')) {
          const numEl = entry.target.querySelector('.stat-num');
          if (numEl && !numEl.dataset.animated) {
            const raw = numEl.textContent.replace(/\D/g, '');
            const target = parseInt(raw);
            if (target) {
              let cur = 0;
              const step = target / 50;
              const timer = setInterval(() => {
                cur += step;
                if (cur >= target) {
                  numEl.textContent = raw;
                  clearInterval(timer);
                  numEl.dataset.animated = '1';
                } else {
                  numEl.textContent = Math.floor(cur);
                }
              }, 30);
            }
          }
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // === 11. МОБИЛЬНОЕ МЕНЮ ===
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('overlay');
  const toggleMenu = () => {
    mobileMenu?.classList.toggle('open');
    overlay?.classList.toggle('open');
    document.body.style.overflow = mobileMenu?.classList.contains('open') ? 'hidden' : '';
  };
  burger?.addEventListener('click', toggleMenu);
  overlay?.addEventListener('click', toggleMenu);
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', toggleMenu));

  // === 12. ХЕДЕР ПРИ СКРОЛЛЕ ===
  window.addEventListener('scroll', () => {
    document.getElementById('header')?.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  // === ИНИЦИАЛИЗАЦИЯ ===
  initPhoneMask('f-phone');
  initAptValidation();
  applyCMS(); // Применяем контент из CMS
});
