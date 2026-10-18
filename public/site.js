const filters = document.querySelectorAll('[data-filter]');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(other => {other.classList.toggle('active', other === button);other.setAttribute('aria-pressed', String(other === button));});
  document.querySelectorAll('[data-kind]').forEach(card => {card.hidden = button.dataset.filter !== 'all' && card.dataset.kind !== button.dataset.filter;});
}));
const form = document.querySelector('#booking-form');
if (form) {
  const service = new URLSearchParams(location.search).get("service");
  if (service && [...form.elements.service.options].some(o=>o.value===service)) form.elements.service.value=service;
  const eventType = new URLSearchParams(location.search).get('event');
  if (eventType && [...form.elements.event.options].some(o=>o.value===eventType)) form.elements.event.value = eventType;
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {form.elements.service.value = link.dataset.service;form.elements.service.dispatchEvent(new Event('change'));}));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const d=Object.fromEntries(new FormData(form));
    const body=`Hi Blank Slate Entertainment,\n\nI'd like to ask about coverage for my project.\n\nName: ${d.name}\nEmail: ${d.email}\nEvent type: ${d.event}\nDate: ${d.date || 'To be discussed'}\nCoverage: ${d.service}\nVenue / location: ${d.location || 'To be discussed'}\n\n${window.BSEQuote ? window.BSEQuote.emailLines() : ''}\n\nProject details:\n${d.details}\n\nThanks!`;
    const href=`mailto:blankslatelv@gmail.com?subject=${encodeURIComponent(d.service+' inquiry — '+d.event)}&body=${encodeURIComponent(body)}`;
    const fallback=document.querySelector('#email-fallback');fallback.href=href;fallback.hidden=false;
    document.querySelector('#form-status').textContent='Your inquiry is ready. Open the prepared email below to review and send it in your email app.';

  });
}

