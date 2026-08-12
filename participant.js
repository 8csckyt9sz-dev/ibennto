const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyYlqLj4cq_bLbaEdl_8iqjTjLyThdC5sLLPqufaW-zd3BD7ay5oArSSOEZhd6hs0OL7g/exec';

const MAX_IMAGE_SIDE = 1600;
const MAX_DATA_URL_LENGTH = 1800000;
const state = {
  token: '',
  participant: null,
  processing: 0,
  images: { mainPhoto: '', subPhoto1: '', subPhoto2: '' }
};

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  state.token = new URLSearchParams(location.search).get('token') || '';
  if (!/^[0-9a-f]{32}$/i.test(state.token)) {
    showError('無効な参加者URLです。');
    return;
  }

  try {
    const result = await postToGas({
      action: 'getBosdParticipant',
      token: state.token
    });
    if (!result.ok || !result.participant) {
      throw new Error(result.message || '参加者情報を取得できませんでした。');
    }
    state.participant = result.participant;
    populate(result.participant);
    setupPhotoInput('main-photo', 'main-preview', 'mainPhoto');
    setupPhotoInput('sub-photo-1', 'sub-preview-1', 'subPhoto1');
    setupPhotoInput('sub-photo-2', 'sub-preview-2', 'subPhoto2');
    document.querySelector('#participant-form')
      .addEventListener('submit', saveParticipant);
    document.querySelector('#loading').hidden = true;
    document.querySelector('#participant-form').hidden = false;
  } catch (error) {
    console.error('Participant load failed', safeError(error));
    showError(error.message || '参加者情報を取得できませんでした。');
  }
}

function populate(participant) {
  setText('entry-number', participant.entryNumber);
  setText('vehicle-type', participant.vehicleType);
  setText('applicant-name', participant.applicantName);
  setText('maker', participant.maker);
  setValue('ownerName', participant.ownerName);
  setValue('vehicleName', participant.vehicleName);
  setValue('ownerComment', participant.ownerComment);
  setValue('customContent', participant.customContent);
  setValue('appealPoint', participant.appealPoint);
  setValue('instagramUrl', participant.instagramUrl);
  setValue('otherSnsUrl', participant.otherSnsUrl);
  setValue('publicStatus', participant.publicStatus || '非公開');
  setPreview('main-preview', participant.mainPhotoUrl);
  setPreview('sub-preview-1', participant.subPhoto1Url);
  setPreview('sub-preview-2', participant.subPhoto2Url);
}

function setupPhotoInput(inputId, previewId, stateKey) {
  const input = document.querySelector(`#${inputId}`);
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    state.images[stateKey] = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      input.value = '';
      showStatus('画像ファイルを選択してください。', 'error');
      return;
    }

    state.processing += 1;
    updateSaveButton();
    showStatus('画像を準備しています…', '');
    try {
      const dataUrl = await compressImageToDataUrl(file);
      state.images[stateKey] = dataUrl;
      setPreview(previewId, dataUrl);
      showStatus('', '');
    } catch (error) {
      input.value = '';
      showStatus(error.message || '画像を読み込めませんでした。', 'error');
    } finally {
      state.processing -= 1;
      updateSaveButton();
    }
  });
}

async function saveParticipant(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if (state.processing) {
    showStatus('画像処理が終わるまでお待ちください。', 'error');
    return;
  }
  if (!state.images.mainPhoto && !state.participant.mainPhotoUrl) {
    showStatus('メイン写真を選択してください。', 'error');
    return;
  }

  const data = new FormData(form);
  const button = document.querySelector('#save-button');
  button.disabled = true;
  showStatus('登録内容を保存しています…', '');

  try {
    const result = await postToGas({
      action: 'saveBosdParticipant',
      token: state.token,
      ownerName: data.get('ownerName'),
      vehicleName: data.get('vehicleName'),
      mainPhoto: state.images.mainPhoto,
      subPhoto1: state.images.subPhoto1,
      subPhoto2: state.images.subPhoto2,
      ownerComment: data.get('ownerComment'),
      customContent: data.get('customContent'),
      appealPoint: data.get('appealPoint'),
      instagramUrl: data.get('instagramUrl'),
      otherSnsUrl: data.get('otherSnsUrl'),
      publicStatus: data.get('publicStatus')
    });
    if (!result.ok) throw new Error(result.message);
    state.images = { mainPhoto: '', subPhoto1: '', subPhoto2: '' };
    state.participant.mainPhotoUrl =
      state.participant.mainPhotoUrl || 'saved';
    showStatus('登録内容を保存しました。同じURLから後で変更できます。', 'success');
  } catch (error) {
    console.error('Participant save failed', safeError(error));
    showStatus(error.message || '保存に失敗しました。', 'error');
  } finally {
    button.disabled = false;
  }
}

async function compressImageToDataUrl(file) {
  const source = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画像変換を開始できませんでした。');
  context.drawImage(source, 0, 0, width, height);

  for (const quality of [0.82, 0.72, 0.62, 0.52]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
  }
  throw new Error('画像サイズが大きすぎます。別の写真を選択してください。');
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('画像を読み込めませんでした。'));
    };
    image.src = objectUrl;
  });
}

async function postToGas(payload) {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    body.append(key, value == null ? '' : String(value));
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body,
      redirect: 'follow',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function showError(message) {
  document.querySelector('#loading').hidden = true;
  document.querySelector('#participant-form').hidden = true;
  document.querySelector('#error').hidden = false;
  document.querySelector('#error-message').textContent = message;
}

function showStatus(message, type) {
  const status = document.querySelector('#form-status');
  status.textContent = message;
  status.className = `form-status ${type || ''}`;
}

function updateSaveButton() {
  document.querySelector('#save-button').disabled = state.processing > 0;
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value || '—';
}

function setValue(name, value) {
  const element = document.querySelector(`[name="${name}"]`);
  if (element) element.value = value || '';
}

function setPreview(id, url) {
  const image = document.querySelector(`#${id}`);
  if (!url) return;
  image.src = normalizeDriveImageUrl(url);
  image.referrerPolicy = 'no-referrer';
  image.onerror = () => {
    image.hidden = true;
    showStatus('保存済み画像を表示できませんでした。画像を選び直して保存してください。', 'error');
  };
  image.onload = () => {
    image.hidden = false;
  };
  image.hidden = false;
}

function normalizeDriveImageUrl(url) {
  const text = String(url || '').trim();
  if (!text || text.startsWith('data:')) return text;
  const idMatch = text.match(/[?&]id=([A-Za-z0-9_-]+)/) ||
    text.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
  return idMatch
    ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(idMatch[1])}&sz=w1600`
    : text;
}

function safeError(error) {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { message: String(error) };
}
