// Google Apps Script のウェブアプリURLを、デプロイ後にここへ設定してください。
// LINEのアクセストークンやユーザーIDなどの秘密情報は、ここには記載しません。
const GAS_WEB_APP_URL = '';
// Cloudflare Turnstile のサイトキーを発行後に設定してください。空欄ならウィジェットは表示しません。
const TURNSTILE_SITE_KEY = '';

(() => {
  initializeTurnstile();

  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(isOpen));
      menu.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', 'メニューを開く');
    }));
  }

  const input = document.querySelector('#vehicle-photo');
  const photoName = document.querySelector('#photo-name');
  const wrap = document.querySelector('#photo-preview-wrap');
  const preview = document.querySelector('#photo-preview');
  if (input && photoName && wrap && preview) {
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

  const entryForm = document.querySelector('#entry-form');
  const success = document.querySelector('#success');
  const entryNumber = document.querySelector('#entry-number');
  const entryStatus = document.querySelector('#entry-form-status');
  if (entryForm && success && entryNumber && entryStatus) {
    entryForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!entryForm.reportValidity()) return;

      if (!GAS_WEB_APP_URL.trim()) {
        showStatus(entryStatus, '送信先が未設定です。管理者がGASウェブアプリURLを設定するまで送信できません。', 'error');
        return;
      }

      const submitButton = entryForm.querySelector('button[type="submit"]');
      setSubmitting(submitButton, true, '送信中…');
      showStatus(entryStatus, '申込内容を送信しています。', 'info');

      try {
        const response = await fetch(GAS_WEB_APP_URL, {
          method: 'POST',
          body: new FormData(entryForm)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        if (!result.success || !result.entryNumber) {
          throw new Error(result.message || '受付番号を取得できませんでした。');
        }

        entryNumber.textContent = result.entryNumber;
        entryForm.hidden = true;
        success.hidden = false;
        window.scrollTo({top: 0, behavior: 'smooth'});
      } catch (error) {
        console.error('Entry submission failed:', error);
        showStatus(entryStatus, '送信できませんでした。通信環境をご確認のうえ、時間をおいて再度お試しください。', 'error');
      } finally {
        setSubmitting(submitButton, false);
      }
    });
  }

  const sponsorForm = document.querySelector('#sponsor-form');
  const sponsorStatus = document.querySelector('#sponsor-form-status');
  if (sponsorForm && sponsorStatus) {
    sponsorForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!sponsorForm.reportValidity()) return;
      showStatus(sponsorStatus, '協賛問い合わせの送信先は現在準備中です。受付開始まで今しばらくお待ちください。', 'error');
    });
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
})();
