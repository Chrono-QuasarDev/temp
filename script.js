const WA = '233240000000';

/* Sample held dates — replace with a real calendar feed later */
const TAKEN = new Set([
  '2026-08-22', '2026-08-29', '2026-09-05', '2026-09-12',
  '2026-09-19', '2026-10-03', '2026-10-17', '2026-11-07',
  '2026-12-19', '2026-12-26'
]);

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  document.querySelectorAll('.float-wa').forEach(el => {
    if (!el.getAttribute('href') || el.getAttribute('href') === '#') {
      el.href = `https://wa.me/${WA}?text=${encodeURIComponent('Hello Ama — I would like to ask about a date at Zenala.')}`;
    }
  });

  initCalendar();
  initForm();
  initLightbox();

  const params = new URLSearchParams(location.search);
  const type = document.getElementById('type');
  if (type && params.get('type')) type.value = params.get('type');
});

function ymd(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

function initCalendar() {
  const root = document.getElementById('calendar');
  if (!root) return;
  let view = new Date();
  view.setDate(1);
  let selected = document.getElementById('date')?.value || '';

  const render = () => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const label = view.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    const firstDow = new Date(year, month, 1).getDay();
    const daysIn = new Date(year, month + 1, 0).getDate();
    const today = ymd(new Date());

    let cells = '';
    ['S','M','T','W','T','F','S'].forEach(d => { cells += `<span class="cal-dow">${d}</span>`; });
    for (let i = 0; i < firstDow; i++) cells += '<span></span>';
    for (let day = 1; day <= daysIn; day++) {
      const id = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const taken = TAKEN.has(id);
      const past = id < today;
      const cls = ['cal-day', taken && 'taken', id === selected && 'selected', id === today && 'today'].filter(Boolean).join(' ');
      cells += `<button type="button" class="${cls}" data-day="${id}" ${taken || past ? 'disabled' : ''} aria-label="${id}${taken ? ' taken' : ''}">${day}</button>`;
    }

    root.innerHTML = `
      <div class="cal-head">
        <button type="button" data-nav="-1" aria-label="Previous month">‹</button>
        <strong>${label}</strong>
        <button type="button" data-nav="1" aria-label="Next month">›</button>
      </div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-legend">
        <span><i style="background:#1a1914"></i>Selected</span>
        <span><i style="background:#ddd;text-decoration:line-through"></i>Held</span>
      </div>`;

    root.querySelector('[data-nav="-1"]').onclick = () => { view.setMonth(view.getMonth() - 1); render(); };
    root.querySelector('[data-nav="1"]').onclick = () => { view.setMonth(view.getMonth() + 1); render(); };
    root.querySelectorAll('.cal-day:not(:disabled)').forEach(btn => {
      btn.onclick = () => {
        selected = btn.dataset.day;
        const input = document.getElementById('date');
        if (input) input.value = selected;
        const status = document.getElementById('date-status');
        if (status) status.textContent = `Open on ${selected}. We’ll confirm within a day.`;
        render();
      };
    });
  };
  render();
}

function initForm() {
  const form = document.getElementById('enquire-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('#name');
    const phone = form.querySelector('#phone');
    const email = form.querySelector('#email');
    if (!name.value.trim()) { name.focus(); return; }
    if (!phone.value.trim()) { phone.focus(); return; }
    if (!email.value.trim()) { email.focus(); return; }

    const payload = {
      name: name.value.trim(),
      phone: phone.value.trim(),
      email: email.value.trim(),
      type: form.querySelector('#type')?.value || '',
      date: form.querySelector('#date')?.value || '',
      guests: form.querySelector('#guests')?.value || '',
      message: form.querySelector('#message')?.value || '',
      at: new Date().toISOString()
    };
    try {
      const prev = JSON.parse(localStorage.getItem('zenala-enquiries') || '[]');
      prev.push(payload);
      localStorage.setItem('zenala-enquiries', JSON.stringify(prev));
    } catch (_) {}

    form.classList.add('sent');
    const ok = document.getElementById('form-ok');
    if (ok) {
      ok.classList.add('show');
      ok.querySelector('[data-name]').textContent = payload.name.split(' ')[0];
      const wa = ok.querySelector('[data-wa]');
      if (wa) {
        const text = `Hello Ama, I'm ${payload.name}. I'd like to hold Zenala for a ${payload.type}${payload.date ? ' on ' + payload.date : ''}${payload.guests ? ' (~' + payload.guests + ' guests)' : ''}. ${payload.message}`.trim();
        wa.href = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
      }
    }
  });
}

function initLightbox() {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Photograph');
  box.innerHTML = '<img alt="">';
  document.body.appendChild(box);
  const close = () => box.classList.remove('open');
  box.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.querySelectorAll('[data-full]').forEach(el => {
    el.style.cursor = 'zoom-in';
    el.setAttribute('tabindex', '0');
    const open = () => {
      box.querySelector('img').src = el.getAttribute('data-full');
      box.querySelector('img').alt = el.querySelector('img')?.alt || '';
      box.classList.add('open');
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}
