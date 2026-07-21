const form = document.getElementById('entryForm');
const photoInput = document.getElementById('vehiclePhoto');
const preview = document.getElementById('photoPreview');
const completeModal = document.getElementById('completeModal');
const entryNumber = document.getElementById('entryNumber');
const adminModal = document.getElementById('adminModal');
const adminList = document.getElementById('adminList');
const entryCount = document.getElementById('entryCount');

let photoData = '';

photoInput.addEventListener('change', () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    photoData = String(e.target.result || '');
    preview.src = photoData;
    preview.hidden = false;
  };
  reader.readAsDataURL(file);
});

function getEntries() {
  try { return JSON.parse(localStorage.getItem('motorEventEntries') || '[]'); }
  catch { return []; }
}

function saveEntries(entries) {
  localStorage.setItem('motorEventEntries', JSON.stringify(entries));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const number = `MX-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const entry = {
    ...data,
    number,
    photo: photoData,
    status: '受付済み',
    createdAt: new Date().toLocaleString('ja-JP')
  };
  const entries = getEntries();
  entries.unshift(entry);
  saveEntries(entries);
  entryNumber.textContent = number;
  completeModal.classList.add('is-open');
  completeModal.setAttribute('aria-hidden', 'false');
  form.reset();
  preview.hidden = true;
  photoData = '';
});

document.getElementById('closeComplete').addEventListener('click', () => {
  completeModal.classList.remove('is-open');
  completeModal.setAttribute('aria-hidden', 'true');
});

function renderAdmin() {
  const entries = getEntries();
  entryCount.textContent = entries.length;
  if (!entries.length) {
    adminList.innerHTML = '<div class="empty">まだ予約はありません。</div>';
    return;
  }
  adminList.innerHTML = entries.map((entry, index) => `
    <article class="admin-item">
      ${entry.photo ? `<img src="${entry.photo}" alt="${entry.model || '展示車両'}">` : '<div></div>'}
      <div>
        <h3>${escapeHtml(entry.maker)} ${escapeHtml(entry.model)}</h3>
        <p>${escapeHtml(entry.number)} ／ ${escapeHtml(entry.type)} ／ ${escapeHtml(entry.category)}</p>
        <p>${escapeHtml(entry.name)}　${escapeHtml(entry.phone)}</p>
        <p>${escapeHtml(entry.createdAt)}</p>
      </div>
      <select data-index="${index}">
        ${['受付済み','承認','保留','キャンセル'].map(s => `<option ${s===entry.status?'selected':''}>${s}</option>`).join('')}
      </select>
    </article>`).join('');

  adminList.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', e => {
      const entriesNow = getEntries();
      entriesNow[Number(e.target.dataset.index)].status = e.target.value;
      saveEntries(entriesNow);
    });
  });
}

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

document.getElementById('adminOpen').addEventListener('click', () => {
  renderAdmin();
  adminModal.classList.add('is-open');
  adminModal.setAttribute('aria-hidden', 'false');
});

document.getElementById('adminClose').addEventListener('click', () => {
  adminModal.classList.remove('is-open');
  adminModal.setAttribute('aria-hidden', 'true');
});
