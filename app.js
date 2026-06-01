// === ТДТК.РФ — app.js (ЧИСТЫЙ, без дубликатов) ===
document.addEventListener('DOMContentLoaded', () => {

  // === КОНФИГ ДЛЯ ДЕМОНСТРАЦИИ ===
  // В продакшене эти данные приходят с сервера
  const DEMO = {
    leads: [],
    stats: [{ address: 'ул. Ленина, д.12, п.1', total: 36, agreed: 20, percent: 56, canInstall: true }],
    cms: {
      hero_title: 'Домофон для вашего подъезда',
      price_min: '65000',
      phone: '+7 (914) 757-78-97',
      email: 'info@тдтк.рф',
      base_price: '70000',
      sub_price: '65000',
      monthly_fee: '200',
      meta_desc: 'Коллективная установка домофонов. Договор при 51% согласий.',
      meta_title: 'ТДТК — Установка домофонов',
      og_title: 'ТДТК — Твой Дом — Твоя Крепость'
    }
  };

  // === ВАЛИДАТОР ТЕЛЕФОНА ===
    // === ВАЛИДАТОР ТЕЛЕФОНА (ИСПРАВЛЕННЫЙ) ===
  const PhoneValidator = {
    clean: (val) => String(val || '').replace(/\D/g, ''), // Только цифры
    
    format: (val) => {
      let v = PhoneValidator.clean(val);
      if (!v) return '';
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (v.length > 11) v = v.slice(0, 11);
      if (!v.startsWith('7') && v.length > 0) v = '7' + v;
      
      let f = '+7';
      if (v.length > 1) f += ` (${v.slice(1, 4)}`;
      if (v.length >= 4) f += `) ${v.slice(4, 7)}`;
      if (v.length >= 7) f += `-${v.slice(7, 9)}`;
      if (v.length >= 9) f += `-${v.slice(9, 11)}`;
      return f;
    },
    
    isValid: (val) => {
      const digits = PhoneValidator.clean(val);
      if (digits.startsWith('8')) return digits.length === 11;
      if (digits.startsWith('7')) return digits.length === 11;
      return digits.length === 10;
    },
    
    getRaw: (val) => {
      let v = PhoneValidator.clean(val); // Оставляем только цифры
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (v.length > 11) v = v.slice(0, 11);
      if (!v.startsWith('7') && v.length > 0) v = '7' + v;
      return v; // Всегда возвращает ровно 11 цифр, начинающихся с 7
    }
  };

  // === ВАЛИДАТОР КВАРТИРЫ ===
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

  // === ИНИЦИАЛИЗАЦИЯ МАСОК ===
  function initPhoneMask(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const onInput = (e) => {
      e.target.value = PhoneValidator.format(e.target.value);
      if (PhoneValidator.isValid(e.target.value)) {
        input.style.borderColor = '';
        input.setCustomValidity('');
      }
    };
    const onBlur = (e) => {
      if (!PhoneValidator.isValid(e.target.value)) {
        input.style.borderColor = 'var(--danger)';
        input.setCustomValidity('Введите номер: +7 (999) 123-45-67');
      } else {
        input.style.borderColor = '';
        input.setCustomValidity('');
      }
    };
    const onFocus = () => { input.style.borderColor = ''; input.setCustomValidity(''); };
    input.addEventListener('input', onInput);
    input.addEventListener('blur', onBlur);
    input.addEventListener('focus', onFocus);
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
        aptInput.setCustomValidity(AptValidator.getMessage(apt, total));
        return false;
      }
    };
    aptInput.addEventListener('input', validate);
    aptInput.addEventListener('blur', validate);
    totalInput.addEventListener('change', validate);
    aptInput.addEventListener('focus', () => { aptInput.style.borderColor = ''; aptInput.setCustomValidity(''); });
  }

  // === API-ЗАПРОСЫ ===
  async function apiFetch(action, method = 'GET', body = null) {
    const url = `${CONFIG.API_URL}?action=${action}&password=${CONFIG.ADMIN_PASS}`;
    const options = { method, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, mode: 'cors', credentials: 'omit' };
    if (body) options.body = typeof body === 'string' ? body : JSON.stringify(body);
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // === КАЛЬКУЛЯТОР ===
  function initCalculator() {
    const calcEntrance = document.getElementById('calc-entrance');
    const calcSub = document.getElementById('calc-sub');
    if (!calcEntrance || !calcSub) return;
    
    const updateCalc = () => {
      const n = Math.max(1, parseInt(calcEntrance.value)||36), w = calcSub.checked;
      const p = w ? CONFIG.CALC.sub : CONFIG.CALC.base, per = Math.round(p/n);
      document.getElementById('calc-total').textContent = p.toLocaleString('ru-RU') + ' ₽';
      document.getElementById('calc-per-apt').textContent = per.toLocaleString('ru-RU') + ' ₽';
      document.getElementById('calc-monthly').textContent = CONFIG.CALC.monthly + ' ₽/мес';
      document.getElementById('calc-monthly-row').style.display = w ? 'flex' : 'none';
      document.getElementById('calc-note').textContent = w 
        ? `Экономия: ${Math.round((CONFIG.CALC.base-p)/n).toLocaleString()} ₽/кв` 
        : 'Без ежемесячных платежей';
    };
    calcEntrance.addEventListener('input', updateCalc);
    calcSub.addEventListener('change', updateCalc);
    updateCalc();
  }

  // === CMS INJECTION ===
  async function applyCMS() {
    try {
      const cms = CONFIG.IS_PREVIEW ? DEMO.cms : await apiFetch('get_cms');
      Object.entries(cms).forEach(([key, data]) => {
        const value = typeof data === 'object' && data !== null ? data.value : data;
        const el = document.querySelector(`[data-cms="${key}"]`);
        if (el) {
          const numericKeys = ['price_min', 'base_price', 'sub_price', 'monthly_fee'];
          if (numericKeys.includes(key)) {
            const num = parseInt(value);
            el.textContent = !isNaN(num) ? num.toLocaleString('ru-RU') + ' ₽' : value;
          } else { el.textContent = value; }
        }
      });
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
    } catch (e) { console.warn('⚠️ CMS не загрузилась:', e); }
  }

  // === ПРОВЕРКА ДУБЛИКАТОВ ===
  async function checkDuplicate(street, house, entrance, apartment) {
    if (CONFIG.IS_PREVIEW) return false;
    try {
      const leads = (await apiFetch('leads')).data || [];
      const norm = (s) => String(s||'').toLowerCase().trim().replace(/[^a-zа-я0-9]/g, '');
      return leads.some(l => 
        norm(l.street) === norm(street) &&
        norm(l.house) === norm(house) &&
        String(l.entrance) === String(entrance) &&
        String(l.apartment) === String(apartment) &&
        l.status !== 'Отказ'
      );
    } catch (e) { console.warn('⚠️ Ошибка проверки дубликатов:', e); return false; }
  }

  // === ОТПРАВКА ФОРМЫ ===
  function initForm() {
    const form = document.getElementById('appForm');
    const btn = document.getElementById('f-btn');
    const ok = document.getElementById('f-ok');
    const err = document.getElementById('f-err');
    if (!form || !btn) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      
      const apt = document.getElementById('f-apt').value.trim();
      const total = parseInt(document.getElementById('f-total').value) || 9999;
      if (!AptValidator.isValid(apt, total)) {
        alert(AptValidator.getMessage(apt, total));
        document.getElementById('f-apt').focus();
        return;
      }
      
      btn.disabled = true;
      btn.innerHTML = '🔍 Проверка...';
      const street = document.getElementById('f-street').value.trim();
      const house = document.getElementById('f-house').value.trim();
      const entrance = document.getElementById('f-entrance').value.trim();
      const apartment = apt;
      
      try {
        const isDup = await checkDuplicate(street, house, entrance, apartment);
        if (isDup) {
          alert(`⚠️ Заявка для квартиры №${apartment} по адресу ${street}, ${house} уже отправлена.`);
          btn.disabled = false;
          btn.innerHTML = 'Отправить заявку';
          return;
        }
      } catch (dupErr) { console.warn('⚠️ Ошибка проверки дубликатов:', dupErr); }
      
      btn.innerHTML = '⏳ Отправка...';
      ok.classList.remove('show');
      err.classList.remove('show');
      
      const payload = {
        action: 'submit_lead',
        password: CONFIG.ADMIN_PASS,
        name: document.getElementById('f-name').value.trim(),
        phone: PhoneValidator.getRaw(document.getElementById('f-phone').value),
        street, house, entrance, apartment,
        totalApartments: total,
        withSubscription: document.getElementById('f-sub').checked,
        comment: document.getElementById('f-comment').value.trim()
      };
      
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
  }

  // === ПРОГРЕСС ПОДЪЕЗДОВ ===
  async function loadProgress() {
    const grid = document.getElementById('prog-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading">⏳ Загрузка...</div>';
    try {
      const data = CONFIG.IS_PREVIEW ? { stats: DEMO.stats } : await apiFetch('entrance_stats');
      const stats = data.stats || [];
      if (!stats.length) { grid.innerHTML = '<div class="loading">📭 Пока нет заявок</div>'; return; }
      grid.innerHTML = stats.map(s => {
        const addr = s.address || s.addr || 'Адрес не указан';
        const total = Number(s.total) || 0, agreed = Number(s.agreed) || 0;
        const pct = Number(s.percent) || (total ? Math.round((agreed/total)*100) : 0);
        const can = s.canInstall || pct >= 50;
        const color = pct >= 50 ? 'var(--success)' : pct >= 25 ? 'var(--warning)' : 'var(--danger)';
        return `<div class="progress-card reveal"><div class="progress-header"><h4>🏠 ${addr}</h4>${can?'<span class="badge-ready pulse">✅ Готово</span>':''}</div><div class="progress-bar-container"><div class="progress-bar" style="width:0%;background:${color}" data-w="${pct}%"></div></div><div class="progress-info"><span>${agreed} из ${total}</span><strong>${pct}%</strong></div></div>`;
      }).join('');
      setTimeout(() => grid.querySelectorAll('.progress-bar').forEach(b => b.style.width = b.dataset.w), 300);
      grid.querySelectorAll('.progress-card').forEach(el => {
        const obs = new IntersectionObserver((entries) => { entries.forEach(e => { if(e.isIntersecting){e.target.classList.add('visible'); obs.unobserve(e.target);} }); }, {threshold:0.15});
        obs.observe(el);
      });
    } catch (e) { console.error('❌ Ошибка загрузки прогресса:', e); grid.innerHTML = '<div class="loading">⚠️ Ошибка загрузки</div>'; }
  }

  // === АНИМАЦИИ ПРИ СКРОЛЛЕ ===
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          if (entry.target.classList.contains('stat-card')) {
            const numEl = entry.target.querySelector('.stat-num');
            if (numEl && !numEl.dataset.animated) {
              const raw = numEl.textContent.replace(/\D/g, '');
              const target = parseInt(raw);
              if (target) {
                let cur = 0; const step = target / 50;
                const timer = setInterval(() => {
                  cur += step;
                  if (cur >= target) { numEl.textContent = raw; clearInterval(timer); numEl.dataset.animated = '1'; }
                  else { numEl.textContent = Math.floor(cur); }
                }, 30);
              }
            }
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // === МОБИЛЬНОЕ МЕНЮ ===
  function initMobileMenu() {
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('overlay');
    if (!burger || !mobileMenu) return;
    const toggleMenu = () => {
      mobileMenu.classList.toggle('open');
      overlay?.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    };
    burger.addEventListener('click', toggleMenu);
    overlay?.addEventListener('click', toggleMenu);
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', toggleMenu));
  }

  // === ХЕДЕР ПРИ СКРОЛЛЕ ===
  function initHeaderScroll() {
    window.addEventListener('scroll', () => {
      document.getElementById('header')?.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // === ПОИСК В ПРОГРЕССЕ ===
  function initProgressSearch() {
    document.getElementById('prog-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.progress-card').forEach(card => {
        const addr = card.querySelector('h4')?.textContent.toLowerCase() || '';
        card.style.display = addr.includes(q) ? '' : 'none';
      });
    });
  }

  // === ЗАПУСК ВСЕХ МОДУЛЕЙ ===
  initPhoneMask('f-phone');
  initAptValidation();
  initCalculator();
  applyCMS();
  initForm();
  loadProgress();
  initScrollAnimations();
  initMobileMenu();
  initHeaderScroll();
  initProgressSearch();
});
