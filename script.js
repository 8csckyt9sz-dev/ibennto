(() => {
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => nav.classList.toggle('open'));
  }

  const input = document.querySelector('#vehicle-photo');
  const name = document.querySelector('#photo-name');
  const wrap = document.querySelector('#photo-preview-wrap');
  const preview = document.querySelector('#photo-preview');
  if (input && name && wrap && preview) {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      name.textContent = file.name;
      const reader = new FileReader();
      reader.onload = e => {
        preview.src = e.target.result;
        wrap.hidden = false;
      };
      reader.readAsDataURL(file);
    });
  }

  const form = document.querySelector('#entry-form');
  const success = document.querySelector('#success');
  const num = document.querySelector('#entry-number');
  if (form && success && num) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const now = new Date();
      const no = 'BOSD-' + String(now.getTime()).slice(-7);
      const data = Object.fromEntries(new FormData(form).entries());
      delete data.photo;
      const list = JSON.parse(localStorage.getItem('bosdEntries') || '[]');
      list.push({...data, entryNumber:no, createdAt:now.toISOString()});
      localStorage.setItem('bosdEntries', JSON.stringify(list));
      num.textContent = no;
      form.hidden = true;
      success.hidden = false;
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }
})();