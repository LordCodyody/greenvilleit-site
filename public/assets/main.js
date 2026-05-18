// Mobile nav toggle
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
})();

// Contact / scan form: progressive submit with status
async function submitForm(form, endpoint) {
  const statusEl = form.querySelector('.form-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  statusEl.textContent = '';
  statusEl.className = 'form-status';
  submitBtn.disabled = true;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Request failed');
    statusEl.textContent = "Thanks — we'll be in touch within one business day.";
    statusEl.classList.add('ok');
    form.reset();
  } catch (e) {
    statusEl.textContent = 'Something went wrong. Email info@greenvilleitconsulting.com and we will follow up.';
    statusEl.classList.add('err');
  } finally {
    submitBtn.disabled = false;
  }
}

document.querySelectorAll('form[data-endpoint]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm(form, form.dataset.endpoint);
  });
});
