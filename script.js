// 公開可能な接続情報はこのファイルの先頭だけで管理します。
// LINEのアクセストークン、チャネルシークレット、管理者LINEユーザーIDはGASのスクリプトプロパティで管理します。
const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbz46lwqLanaxh1WRW6kI7c9SiVZi258iOlodZbd-2w32xdyOboVfAsSsgHgPpvyI_9l8g/exec';
const ENTRY_LIFF_ID = '2010807562-2wvrDOlv';
const SPONSOR_LIFF_ID = '2010807562-lnaRgdef';
const TURNSTILE_SITE_KEY = '';

const liffSession = {
  pageType: '',
  idToken: '',
  ready: false
};

document.addEventListener('DOMContentLoaded', () => {
  initializeMenu();
  initializePhotoPreview();
  initializeTurnstile();
  initializeSponsorAmount();
  initializeEntrySubmission();
  initializeSponsorSubmission();
  initializePageLiff();
});

function initializeMenu() {
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  if (!menu || !nav) return;

  menu.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', 'メニューを開く');
    });
  });
}

function initializePhotoPreview() {
  const input = document.querySelector('#vehicle-photo');
  const photoName = document.querySelector('#photo-name');
  const wrap = document.querySelector('#photo-preview-wrap');
  const preview = document.querySelector('#photo-preview');
  if (!input || !photoName || !wrap || !preview) return;

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) {
      photoName.textContent = 'まだ写真は選択されていません';
      wrap.hidden = true;
      preview.removeAttribute('src');
      return;
    }

    photoName.textContent = file.name;
    const reader = new FileReader();
    reader.onload = event => {
      preview.src = event.target.result;
      wrap.hidden = false;
    };
    reader.readAsDataURL(file);
  });
}

function initializeSponsorAmount() {
  const amountInputs = document.querySelectorAll('input[name="sponsorAmount"]');
  const otherWrap = document.querySelector('#otherSponsorAmountWrap');
  const otherInput = document.querySelector('#otherSponsorAmount');
  if (!amountInputs.length || !otherWrap || !otherInput) return;

  const updateOtherAmount = () => {
    const selected = document.querySelector('input[name="sponsorAmount"]:checked')?.value;
    const isOther = selected === 'other';
    otherWrap.hidden = !isOther;
    otherInput.required = isOther;
    if (!isOther) otherInput.value = '';
  };

  amountInputs.forEach(input => input.addEventListener('change', updateOtherAmount));
  updateOtherAmount();
}

function initializeEntrySubmission() {
  const form = document.querySelector('#entry-form');
  const success = document.querySelector('#success');
  const entryNumber = document.querySelector('#entry-number');
  const status = document.querySelector('#entry-form-status');
  if (!form || !success || !entryNumber || !status) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    setSubmitting(submitButton, true, '送信中...');
    showStatus(status, '申込内容を送信しています。', 'info');

    try {
      const idToken = await getSubmissionIdToken('entry');
      const formData = new FormData(form);
      const photoFile = document.querySelector('#vehicle-photo')?.files?.[0];
      const payload = {
        action: 'submitEntry',
        idToken,
        name: formData.get('name'),
        kana: formData.get('kana'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        vehicleType: formData.get('vehicleType'),
        maker: formData.get('maker'),
        model: formData.get('model'),
        year: formData.get('year'),
        color: formData.get('color'),
        plate: formData.get('plate'),
        companions: formData.get('companions'),
        custom: formData.get('custom'),
        note: formData.get('note'),
        photoUrl: formData.get('photoUrl') || '',
        photoFileName: photoFile?.name || ''
      };

      const result = await postToGas(payload);
      if (!(result.ok ?? result.success) || !result.entryNumber) {
        throw new Error(result.message || '受付番号を取得できませんでした。');
      }

      entryNumber.textContent = result.entryNumber;
      form.hidden = true;
      success.hidden = false;
      window.scrollTo({top: 0, behavior: 'smooth'});
    } catch (error) {
      console.error('Entry submission failed:', safeErrorForLog(error));
      showStatus(status, getPublicErrorMessage(error), 'error');
    } finally {
      setSubmitting(submitButton, false);
    }
  });
}

function initializeSponsorSubmission() {
  const form = document.querySelector('#sponsor-form');
  const success = document.querySelector('#sponsor-success');
  const sponsorNumber = document.querySelector('#sponsor-number');
  const status = document.querySelector('#sponsor-form-status');
  if (!form || !success || !sponsorNumber || !status) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const sponsorTypes = Array.from(
      form.querySelectorAll('input[name="sponsorType"]:checked')
    ).map(input => input.value);

    if (!sponsorTypes.length) {
      showStatus(status, '希望する協賛内容を1つ以上選択してください。', 'error');
      return;
    }

    const selectedAmount =
      form.querySelector('input[name="sponsorAmount"]:checked')?.value || '';
    const otherAmount = form.querySelector('#otherSponsorAmount');
    let sponsorAmount = selectedAmount;

    if (selectedAmount === 'other') {
      sponsorAmount = otherAmount?.value || '';
      const numericAmount = Number(sponsorAmount);
      if (!Number.isInteger(numericAmount) || numericAmount < 1000 || numericAmount % 1000 !== 0) {
        showStatus(status, 'その他の金額は1,000円以上、1,000円単位で入力してください。', 'error');
        otherAmount?.focus();
        return;
      }
    }

    const submitButton = form.querySelector('button[type="submit"]');
    setSubmitting(submitButton, true, '送信中...');
    showStatus(status, '協賛申込を送信しています。', 'info');

    try {
      const idToken = await getSubmissionIdToken('sponsor');
      const formData = new FormData(form);
      const payload = {
        action: 'submitSponsor',
        idToken,
        companyName: formData.get('companyName'),
        contactName: formData.get('contactName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        sponsorTypes: sponsorTypes.join('、'),
        sponsorAmount,
        otherAmount: selectedAmount === 'other' ? sponsorAmount : '',
        inquiry: formData.get('inquiry')
      };

      const result = await postToGas(payload);
      if (!(result.ok ?? result.success) || !result.sponsorNumber) {
        throw new Error(result.message || '協賛受付番号を取得できませんでした。');
      }

      sponsorNumber.textContent = result.sponsorNumber;
      form.hidden = true;
      success.hidden = false;
      window.scrollTo({top: 0, behavior: 'smooth'});
    } catch (error) {
      console.error('Sponsor submission failed:', safeErrorForLog(error));
      showStatus(status, getPublicErrorMessage(error), 'error');
    } finally {
      setSubmitting(submitButton, false);
    }
  });
}

async function initializePageLiff() {
  const pageType = document.body.classList.contains('entry-page')
    ? 'entry'
    : document.body.classList.contains('sponsor-page')
      ? 'sponsor'
      : '';

  if (!pageType) return;

  const launchedViaLiff = isLikelyLiffLaunch();
  if (!launchedViaLiff) {
    if (pageType === 'entry') {
      updateAuthMessage('entry', '展示エントリーはLINE内の専用ページからお申し込みください。');
    }
    return;
  }

  liffSession.pageType = pageType;
  if (pageType === 'sponsor') {
    document.querySelector('#sponsor-intro')?.setAttribute('hidden', '');
    document.querySelector('#sponsor-liff-panel')?.removeAttribute('hidden');
  }

  const liffId = pageType === 'entry' ? ENTRY_LIFF_ID : SPONSOR_LIFF_ID;

  try {
    if (!window.liff) {
      throw new Error('LINE連携機能を読み込めませんでした。ページを開き直してください。');
    }

    await liff.init({liffId});

    if (!liff.isLoggedIn()) {
      liff.login({redirectUri: window.location.href});
      return;
    }

    const idToken = liff.getIDToken();
    if (!idToken) {
      throw new Error('LINEログイン情報を取得できませんでした。ページを開き直してください。');
    }

    const friendship = await liff.getFriendship();
    if (!friendship.friendFlag) {
      throw new Error('公式LINEを友だち追加してからお申し込みください。');
    }

    liffSession.idToken = idToken;
    liffSession.ready = true;
    showAuthenticatedForm(pageType);
  } catch (error) {
    console.error('LIFF initialization failed:', safeErrorForLog(error));
    updateAuthMessage(pageType, getPublicErrorMessage(error), true);
  }
}

function isLikelyLiffLaunch() {
  const params = new URLSearchParams(window.location.search);
  return (
    /\bLine\//i.test(navigator.userAgent) ||
    params.has('liff.state') ||
    document.referrer.startsWith('https://liff.line.me/')
  );
}

function showAuthenticatedForm(pageType) {
  const gate = document.querySelector(`#${pageType}-auth-status`);
  const form = document.querySelector(`#${pageType}-form`);
  if (gate) gate.hidden = true;
  if (form) form.hidden = false;
  document.documentElement.classList.add('liff-ready');
}

function updateAuthMessage(pageType, message, isError = false) {
  const gate = document.querySelector(`#${pageType}-auth-status`);
  const heading = gate?.querySelector('h2');
  const messageElement = document.querySelector(`#${pageType}-auth-message`);
  if (heading && isError) heading.textContent = 'LINE連携を確認できませんでした';
  if (messageElement) messageElement.textContent = message;
  if (gate) gate.classList.toggle('has-error', isError);
}

async function getSubmissionIdToken(expectedPageType) {
  if (!GAS_WEB_APP_URL.trim()) {
    throw new Error('送信先が未設定です。');
  }
  if (!window.liff || liffSession.pageType !== expectedPageType || !liffSession.ready) {
    throw new Error('LINEログイン情報を取得できませんでした。ページを開き直してください。');
  }
  if (!liff.isLoggedIn()) {
    liff.login({redirectUri: window.location.href});
    throw new Error('LINEログイン画面へ移動します。');
  }

  const idToken = liff.getIDToken();
  if (!idToken) {
    throw new Error('LINEログイン情報を取得できませんでした。ページを開き直してください。');
  }

  const friendship = await liff.getFriendship();
  if (!friendship.friendFlag) {
    throw new Error('公式LINEを友だち追加してからお申し込みください。');
  }
  return idToken;
}

async function postToGas(payload) {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    body.append(key, value == null ? '' : String(value));
  });

  const response = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    body,
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function getPublicErrorMessage(error) {
  const message = error instanceof Error ? error.message : '';
  if (
    message.includes('LINE') ||
    message.includes('友だち追加') ||
    message.includes('送信先が未設定') ||
    message.includes('受付番号') ||
    message.includes('金額')
  ) {
    return message;
  }
  return '送信に失敗しました。通信環境を確認して、もう一度お試しください。';
}

function safeErrorForLog(error) {
  return error instanceof Error
    ? {name: error.name, message: error.message}
    : {message: String(error)};
}

function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `form-status ${type}`;
  element.scrollIntoView({behavior: 'smooth', block: 'nearest'});
}

function setSubmitting(button, isSubmitting, label = '') {
  if (!button) return;
  if (isSubmitting) {
    button.dataset.originalHtml = button.innerHTML;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.innerHTML = button.dataset.originalHtml || button.innerHTML;
    button.disabled = false;
  }
}

function initializeTurnstile() {
  const containers = document.querySelectorAll('[data-turnstile-container]');
  if (!TURNSTILE_SITE_KEY.trim() || !containers.length) return;

  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.defer = true;
  script.onload = () => {
    containers.forEach(container => {
      window.turnstile.render(container, {sitekey: TURNSTILE_SITE_KEY});
    });
  };
  script.onerror = () => {
    containers.forEach(container => {
      container.textContent = '迷惑送信防止機能を読み込めませんでした。ページを再読み込みしてください。';
      container.classList.add('load-error');
    });
  };
  document.head.appendChild(script);
}
