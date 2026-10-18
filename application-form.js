(() => {
  const form = document.querySelector('#team-application');
  const status = document.querySelector('#application-state');
  if (!form || !status) return;
  async function request(options = {}) {
    const response = await fetch('apply.php', {cache: 'no-store', credentials: 'same-origin', ...options});
    let data;
    try { data = await response.json(); } catch { throw new Error('Applications are temporarily unavailable. Please email blankslatelv@gmail.com.'); }
    if (!response.ok) throw new Error(data.error || 'Your application could not be submitted. Please try again.');
    return data;
  }
  async function init() {
    try {
      const {csrfToken} = await request();
      if (typeof csrfToken !== 'string' || !csrfToken) throw new Error('The application form is unavailable. Please email blankslatelv@gmail.com.');
      form.elements.csrf_token.value = csrfToken;
      status.textContent = '';
      form.hidden = false;
    } catch (error) { status.textContent = error.message; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const file = form.elements.portfolio.files[0];
    if (file?.size > 8 * 1024 * 1024) { status.textContent = 'Please choose a portfolio of 8 MB or smaller.'; return; }
    const data = new FormData(form);
    if (!data.getAll('disciplines[]').length) { status.textContent = 'Choose photography, videography or both.'; return; }
    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;
    status.textContent = 'Uploading your application…';
    try {
      const result = await request({method: 'POST', body: data});
      status.textContent = result.message + ' Your reference: ' + result.reference;
      form.hidden = true;
    } catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  });
  init();
})();
