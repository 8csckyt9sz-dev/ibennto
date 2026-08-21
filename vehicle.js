const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyYlqLj4cq_bLbaEdl_8iqjTjLyThdC5sLLPqufaW-zd3BD7ay5oArSSOEZhd6hs0OL7g/exec';

document.addEventListener('DOMContentLoaded', initializeVehiclePage);

async function initializeVehiclePage() {
  const token = new URLSearchParams(location.search).get('token') || '';
  if (!/^[0-9a-f]{32}$/i.test(token)) {
    showError('無効な車両紹介URLです。QRコードをもう一度読み取ってください。');
    return;
  }

  try {
    const result = await postToGas({ action: 'getBosdPublicVehicle', token });
    if (!result.ok || !result.vehicle) {
      throw new Error(result.message || '車両情報を取得できませんでした。');
    }
    renderVehicle(result.vehicle);
  } catch (error) {
    console.error('Public vehicle load failed', safeError(error));
    showError(error.message || '車両情報を取得できませんでした。');
  }
}

function renderVehicle(vehicle) {
  setText('entry-number', vehicle.entryNumber);
  setText('vehicle-type', vehicle.vehicleType);
  setText('maker', vehicle.maker);
  setText('vehicle-name', vehicle.vehicleName);
  setText('owner-name', vehicle.ownerName);

  setPhoto('main-photo', vehicle.mainPhotoUrl, true);
  setPhoto('sub-photo-1', vehicle.subPhoto1Url, false);
  setPhoto('sub-photo-2', vehicle.subPhoto2Url, false);
  document.querySelector('#sub-photo-grid').hidden =
    !vehicle.subPhoto1Url && !vehicle.subPhoto2Url;

  setSection('owner-comment-section', 'owner-comment', vehicle.ownerComment);
  setSection('custom-section', 'custom-content', vehicle.customContent);
  setSection('appeal-section', 'appeal-point', vehicle.appealPoint);
  renderSocialLinks(vehicle);
  setupPhotoDialog();

  document.querySelector('#loading').hidden = true;
  document.querySelector('#vehicle-profile').hidden = false;
  document.querySelector('#vote-action-bar').hidden = false;
}

function setPhoto(id, url, required) {
  const image = document.querySelector(`#${id}`);
  const button = image.closest('[data-photo]');
  if (!url) {
    button.hidden = !required;
    if (required) button.classList.add('no-photo');
    return;
  }
  image.src = normalizeDriveImageUrl(url);
  image.referrerPolicy = 'no-referrer';
  image.onload = () => button.classList.add('is-loaded');
  image.onerror = () => {
    button.hidden = !required;
    button.classList.add('no-photo');
  };
}

function setSection(sectionId, textId, value) {
  const text = String(value || '').trim();
  if (!text) return;
  document.querySelector(`#${textId}`).textContent = text;
  document.querySelector(`#${sectionId}`).hidden = false;
}

function renderSocialLinks(vehicle) {
  const links = [];
  if (isSafeHttpUrl(vehicle.instagramUrl)) {
    links.push(`<a href="${escapeAttr(vehicle.instagramUrl)}" target="_blank" rel="noopener noreferrer">INSTAGRAM</a>`);
  }
  if (isSafeHttpUrl(vehicle.otherSnsUrl)) {
    links.push(`<a href="${escapeAttr(vehicle.otherSnsUrl)}" target="_blank" rel="noopener noreferrer">OTHER SNS</a>`);
  }
  if (!links.length) return;
  const container = document.querySelector('#social-links');
  container.innerHTML = links.join('');
  container.hidden = false;
}

function setupPhotoDialog() {
  const dialog = document.querySelector('#photo-dialog');
  const dialogPhoto = document.querySelector('#dialog-photo');
  document.querySelectorAll('[data-photo]').forEach(button => {
    button.addEventListener('click', () => {
      const image = button.querySelector('img');
      if (!image?.src || !button.classList.contains('is-loaded')) return;
      dialogPhoto.src = image.src;
      dialog.showModal();
    });
  });
  document.querySelector('#close-photo').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialogPhoto.removeAttribute('src'));
}

async function postToGas(payload) {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    body.append(key, value == null ? '' : String(value));
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body,
      redirect: 'follow',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('通信がタイムアウトしました。もう一度お試しください。');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeDriveImageUrl(url) {
  const text = String(url || '').trim();
  const idMatch = text.match(/[?&]id=([A-Za-z0-9_-]+)/) ||
    text.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
  return idMatch
    ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(idMatch[1])}=w1600`
    : text;
}

function showError(message) {
  document.querySelector('#loading').hidden = true;
  document.querySelector('#vehicle-profile').hidden = true;
  document.querySelector('#error').hidden = false;
  document.querySelector('#error-message').textContent = message;
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value || '—';
}

function isSafeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (_error) {
    return false;
  }
}

function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeError(error) {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { message: String(error) };
}
