// BACC ON STREET DREAMS
// 公開可能な接続情報はこのファイル先頭だけで管理します。
// LINEアクセストークン、チャネルシークレット、管理者LINEユーザーIDは
// GASのスクリプトプロパティで管理してください。
// redeploy: 2026-07-24

const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyYlqLj4cq_bLbaEdl_8iqjTjLyThdC5sLLPqufaW-zd3BD7ay5oArSSOEZhd6hs0OL7g/exec';

const ENTRY_LIFF_ID = '2010807562-2wvrDOlv';
const SPONSOR_LIFF_ID = '2010807562-lnaRgdef';
const OFFICIAL_LINE_ID = '@562kiewx';
const TURNSTILE_SITE_KEY = '';
const PENDING_VENDOR_RECEIPT_KEY = 'bosd-pending-vendor-receipt';
// 展示・出店の完了メッセージをLIFFから自動送信する。
// 自動送信を停め、申込者の手動送信に切り替える場合だけ true にする。
const REQUIRE_MANUAL_LINE_COMPLETION = false;

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
  initializeFormDrafts();
  initializeRequiredDocumentConfirmation();
  initializeEntrySubmission();
  initializeSponsorSubmission();
  initializeVendorSubmission();
  initializePageLiff();
});

function initializeFormDrafts() {
  document.querySelectorAll('#entry-form, #sponsor-form, #vendor-form').forEach(form => {
    const draftKey = `bosd-form-draft:${form.id}`;

    const saveDraft = () => {
      const values = {};
      form.querySelectorAll('input, select, textarea').forEach(field => {
        if (!field.name || field.type === 'file' || field.type === 'hidden') return;
        if (field.type === 'checkbox' || field.type === 'radio') {
          values[field.name] = values[field.name] || [];
          if (field.checked) values[field.name].push(field.value);
        } else {
          values[field.name] = field.value;
        }
      });
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(values));
      } catch (_) {
        // 保存容量やプライベートブラウズ制限がある場合もフォーム操作は継続する。
      }
    };

    const restoreDraft = () => {
      let values;
      try {
        values = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      } catch (_) {
        values = null;
      }
      if (!values) return;
      form.querySelectorAll('input, select, textarea').forEach(field => {
        if (!field.name || field.type === 'file' || field.type === 'hidden') return;
        if (field.type === 'checkbox' || field.type === 'radio') {
          field.checked = Array.isArray(values[field.name]) && values[field.name].includes(field.value);
        } else if (Object.prototype.hasOwnProperty.call(values, field.name)) {
          field.value = values[field.name];
        }
      });
    };

    restoreDraft();
    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);
    form.querySelectorAll('[data-required-document]').forEach(link => {
      link.addEventListener('click', () => {
        saveDraft();
        try {
          sessionStorage.setItem('bosd-document-return-url', window.location.href);
        } catch (_) {
          // 保存できない環境でもリンクは開ける。
        }
      });
    });
    form.addEventListener('reset', () => sessionStorage.removeItem(draftKey));
    form.dataset.draftKey = draftKey;
  });
}

function clearFormDraft(form) {
  const key = form?.dataset?.draftKey;
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch (_) {
    // 下書き削除に失敗しても受付完了表示は継続する。
  }
}

function initializeRequiredDocumentConfirmation() {
  document.querySelectorAll('[data-confirm-documents]').forEach(checkbox => {
    const agreement = checkbox.closest('.agreement');
    if (!agreement) return;
    const links = [...agreement.querySelectorAll('[data-required-document]')];
    const status = agreement.querySelector('.document-confirm-status');
    const opened = new Set();

    const update = () => {
      links.forEach(link => link.classList.toggle('is-confirmed', opened.has(link.dataset.requiredDocument)));
      const missing = links.filter(link => !opened.has(link.dataset.requiredDocument));
      checkbox.disabled = missing.length > 0;
      if (missing.length) checkbox.checked = false;
      agreement.classList.toggle('documents-confirmed', !missing.length);
      if (status) {
        status.textContent = missing.length
          ? `未確認：${missing.map(link => link.textContent.trim()).join('・')}`
          : '両方の確認が完了しました。同意欄を選択できます。';
      }
    };

    links.forEach(link => {
      link.addEventListener('click', () => {
        opened.add(link.dataset.requiredDocument);
        update();
      });
    });
    update();
  });
}

function initializeMenu() {
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  if (!menu || !nav) return;

  menu.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute(
      'aria-label',
      isOpen ? 'メニューを閉じる' : 'メニューを開く'
    );
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
      preview.src = event.target?.result || '';
      wrap.hidden = false;
    };
    reader.readAsDataURL(file);
  });
}

function initializeSponsorAmount() {
  const amountInputs =
    document.querySelectorAll('input[name="sponsorAmount"]');
  const otherWrap = document.querySelector('#otherSponsorAmountWrap');
  const otherInput = document.querySelector('#otherSponsorAmount');

  if (!amountInputs.length || !otherWrap || !otherInput) return;

  const updateOtherAmount = () => {
    const selected =
      document.querySelector(
        'input[name="sponsorAmount"]:checked'
      )?.value || '';

    const isOther = selected === 'other';

    otherWrap.hidden = !isOther;
    otherInput.required = isOther;

    if (!isOther) {
      otherInput.value = '';
    }
  };

  amountInputs.forEach(input => {
    input.addEventListener('change', updateOtherAmount);
  });

  updateOtherAmount();
}

function initializeEntrySubmission() {
  const form = document.querySelector('#entry-form');
  const success = document.querySelector('#success');
  const entryNumber = document.querySelector('#entry-number');
  const status = document.querySelector('#entry-form-status');
  const lineRetryButton = document.querySelector('#entry-line-retry');
  const successTitle = success?.querySelector('h2');

  if (!form || !success || !entryNumber || !status) return;

  let acceptedEntry = readPendingEntryReceipt();

  const showAcceptedEntry = receipt => {
    acceptedEntry = receipt;
    entryNumber.textContent = receipt.entryNumber;
    form.hidden = true;
    success.hidden = false;
    if (lineRetryButton) lineRetryButton.hidden = receipt.lineSent === true;
  };

  const sendAcceptedEntryToLine = async () => {
    if (!acceptedEntry) return false;
    const sent = await sendEntryCompletionMessage(acceptedEntry);
    acceptedEntry.lineSent = sent;
    if (sent) {
      clearPendingEntryReceipt();
      if (successTitle) successTitle.textContent = 'BOSD AWARDエントリーを受け付けました';
      showLineDeliveryResult('entry-line-status', {
        applicantMessageSent: true
      });
      if (lineRetryButton) lineRetryButton.hidden = true;
    }
    return sent;
  };

  if (acceptedEntry) {
    showAcceptedEntry(acceptedEntry);
    if (successTitle) successTitle.textContent = '公式LINEへの送信が必要です';
    showLineDeliveryResult('entry-line-status', {
      applicantMessageSent: acceptedEntry.lineSent === true,
      applicantMessageWarning: '受付は保存済みです。下のボタンから公式LINEへの送信だけを再実行してください。'
    });
  }

  lineRetryButton?.addEventListener('click', async () => {
    setSubmitting(lineRetryButton, true, '公式LINEへ送信中...');
    try {
      const sent = await sendAcceptedEntryToLine();
      if (!sent) {
        openOfficialLineEntryMessage(acceptedEntry);
        showLineDeliveryResult('entry-line-status', {
          applicantMessageSent: false,
          applicantMessageWarning: '公式LINEが開いたら、入力済みの受付完了メッセージをそのまま送信してください。申込データは再登録されません。'
        });
      }
    } catch (error) {
      console.warn('Entry completion retry failed:', safeErrorForLog(error, 'liff.sendMessages.retry'));
      openOfficialLineEntryMessage(acceptedEntry);
      showLineDeliveryResult('entry-line-status', {
        applicantMessageSent: false,
        applicantMessageWarning: '公式LINEが開いたら、入力済みの受付完了メッセージをそのまま送信してください。申込データは再登録されません。'
      });
    } finally {
      setSubmitting(lineRetryButton, false);
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const submitButton =
      form.querySelector('button[type="submit"]');

    setSubmitting(submitButton, true, '送信中...');
    showStatus(status, '申込内容を送信しています。', 'info');

    try {
      const idToken = await getSubmissionIdToken('entry');
      const formData = new FormData(form);
      const photoFile =
        document.querySelector('#vehicle-photo')?.files?.[0];

      const payload = {
        action: 'submitEntry',
        requestId: getOrCreateEntryRequestId(),
        idToken,
        name: formData.get('name'),
        kana: formData.get('kana'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        vehicleType: formData.get('vehicleType'),
        entryFee:
          formData.get('vehicleType') === 'バイク'
            ? '1500'
            : '4000',
        maker: formData.get('maker'),
        genre: formData.get('genre'),
        vehicleName: formData.get('vehicleName'),
        model: formData.get('vehicleName'),
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
        throw new Error(
          result.message || '受付番号を取得できませんでした。'
        );
      }

      let entryChatSent = false;
      acceptedEntry = {
        entryNumber: result.entryNumber,
        name: payload.name,
        lineSent: false
      };
      savePendingEntryReceipt(acceptedEntry);
      try {
        entryChatSent = await sendAcceptedEntryToLine();
      } catch (lineError) {
        // 公式LINEへの送信失敗で、完了済みの申込を失敗扱いにしない。
        console.warn(
          'Entry completion chat message failed:',
          safeErrorForLog(lineError, 'liff.sendMessages')
        );
      }

      entryNumber.textContent = result.entryNumber;
      showLineDeliveryResult(
        'entry-line-status',
        entryChatSent
          ? {
              ...result,
              applicantMessageSent: true,
              applicantMessageWarning: ''
            }
          : {
              ...result,
              applicantMessageSent: false,
              applicantMessageWarning: '申込は保存済みです。公式LINEを開きます。LINEに入力された受付完了メッセージをそのまま送信してください。'
            }
      );
      form.hidden = true;
      clearFormDraft(form);
      clearEntryRequestId();
      success.hidden = false;
      if (successTitle) {
        successTitle.textContent = entryChatSent
          ? 'BOSD AWARDエントリーを受け付けました'
          : '申込内容を仮保存しました';
      }
      if (lineRetryButton) lineRetryButton.hidden = entryChatSent;

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      if (!entryChatSent) {
        // 受付番号を取得できた時点で、待機を挟まず公式LINEの入力済みトークへ移動する。
        openOfficialLineEntryMessage(acceptedEntry);
      }
    } catch (error) {
      console.error(
        'Entry submission failed:',
        safeErrorForLog(error)
      );

      showStatus(
        status,
        getPublicErrorMessage(error),
        'error'
      );
    } finally {
      setSubmitting(submitButton, false);
    }
  });
}

const ENTRY_REQUEST_ID_KEY = 'bosd-entry-request-id';
const PENDING_ENTRY_RECEIPT_KEY = 'bosd-pending-entry-receipt';

function getOrCreateEntryRequestId() {
  let requestId = '';
  try {
    requestId = sessionStorage.getItem(ENTRY_REQUEST_ID_KEY) || '';
    if (!requestId) {
      requestId = typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(ENTRY_REQUEST_ID_KEY, requestId);
    }
  } catch (_) {
    requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return requestId;
}

function clearEntryRequestId() {
  try { sessionStorage.removeItem(ENTRY_REQUEST_ID_KEY); } catch (_) {}
}

function savePendingEntryReceipt(receipt) {
  try { sessionStorage.setItem(PENDING_ENTRY_RECEIPT_KEY, JSON.stringify(receipt)); } catch (_) {}
}

function readPendingEntryReceipt() {
  try {
    const receipt = JSON.parse(sessionStorage.getItem(PENDING_ENTRY_RECEIPT_KEY) || 'null');
    return receipt?.entryNumber ? receipt : null;
  } catch (_) {
    return null;
  }
}

function clearPendingEntryReceipt() {
  try { sessionStorage.removeItem(PENDING_ENTRY_RECEIPT_KEY); } catch (_) {}
}

function buildEntryCompletionText({entryNumber, name}) {
  return [
    '【BOSD AWARDエントリー完了】',
    '',
    `受付番号：${entryNumber}`,
    `申込者：${name || ''}`
  ].join('\n');
}

function openOfficialLineEntryMessage(receipt) {
  if (!receipt?.entryNumber) return;
  const lineId = encodeURIComponent(OFFICIAL_LINE_ID);
  const message = encodeURIComponent(buildEntryCompletionText(receipt));
  window.location.href = `https://line.me/R/oaMessage/${lineId}/?${message}`;
}

/**
 * 保存済みのBOSD AWARD受付番号を、申込者本人のメッセージとして
 * 公式LINEのトークへ送る。失敗しても申込保存結果には影響させない。
 */
async function sendEntryCompletionMessage({entryNumber, name}) {
  if (REQUIRE_MANUAL_LINE_COMPLETION) return false;
  if (
    !window.liff ||
    !liffSession.ready ||
    typeof liff.sendMessages !== 'function'
  ) {
    return false;
  }

  await liff.sendMessages([{
    type: 'text',
    text: buildEntryCompletionText({entryNumber, name})
  }]);

  return true;
}

function savePendingVendorReceipt(receipt) {
  try { sessionStorage.setItem(PENDING_VENDOR_RECEIPT_KEY, JSON.stringify(receipt)); } catch (_) {}
}

function readPendingVendorReceipt() {
  try {
    const receipt = JSON.parse(sessionStorage.getItem(PENDING_VENDOR_RECEIPT_KEY) || 'null');
    return receipt?.vendorNumber ? receipt : null;
  } catch (_) {
    return null;
  }
}

function clearPendingVendorReceipt() {
  try { sessionStorage.removeItem(PENDING_VENDOR_RECEIPT_KEY); } catch (_) {}
}

function buildVendorCompletionText({vendorNumber, companyName}) {
  return [
    '【BOSD出店申込完了】',
    '',
    `出店受付番号：${vendorNumber}`,
    `店舗・会社名：${companyName || ''}`
  ].join('\n');
}

function openOfficialLineVendorMessage(receipt) {
  if (!receipt?.vendorNumber) return;
  const lineId = encodeURIComponent(OFFICIAL_LINE_ID);
  const message = encodeURIComponent(buildVendorCompletionText(receipt));
  window.location.href = `https://line.me/R/oaMessage/${lineId}/?${message}`;
}

async function sendVendorCompletionMessage(receipt) {
  if (REQUIRE_MANUAL_LINE_COMPLETION) return false;
  if (
    !receipt?.vendorNumber ||
    !window.liff ||
    !liffSession.ready ||
    typeof liff.sendMessages !== 'function'
  ) {
    return false;
  }

  await liff.sendMessages([{
    type: 'text',
    text: buildVendorCompletionText(receipt)
  }]);
  return true;
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
      form.querySelectorAll(
        'input[name="sponsorType"]:checked'
      )
    ).map(input => input.value);

    if (!sponsorTypes.length) {
      showStatus(
        status,
        '希望する協賛内容を1つ以上選択してください。',
        'error'
      );
      return;
    }

    const sponsorAmount = Number(
      form.querySelector('input[name="sponsorAmount"]')?.value || 0
    );
    if (
      !Number.isInteger(sponsorAmount) ||
      sponsorAmount < 1000 ||
      sponsorAmount % 1000 !== 0
    ) {
      showStatus(status, '協賛金額は1,000円以上、1,000円単位で入力してください。', 'error');
      return;
    }

    const submitButton =
      form.querySelector('button[type="submit"]');

    setSubmitting(submitButton, true, '送信中...');
    showStatus(
      status,
      '協賛申込を送信しています。',
      'info'
    );

    try {
      const idToken =
        await getSubmissionIdToken('sponsor');

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
        otherAmount: '',
        inquiry: formData.get('inquiry')
      };

      const result = await postToGas(payload);

      if (
        !(result.ok ?? result.success) ||
        !result.sponsorNumber
      ) {
        throw new Error(
          result.message ||
          '協賛受付番号を取得できませんでした。'
        );
      }

      sponsorNumber.textContent =
        result.sponsorNumber;
      showLineDeliveryResult('sponsor-line-status', result);

      form.hidden = true;
      clearFormDraft(form);
      success.hidden = false;

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } catch (error) {
      console.error(
        'Sponsor submission failed:',
        safeErrorForLog(error)
      );

      showStatus(
        status,
        getPublicErrorMessage(error),
        'error'
      );
    } finally {
      setSubmitting(submitButton, false);
    }
  });
}

function initializeVendorSubmission() {
  const form = document.querySelector('#vendor-form');
  const success = document.querySelector('#vendor-success');
  const vendorNumber = document.querySelector('#vendor-number');
  const vendorAmount = document.querySelector('#vendor-amount');
  const status = document.querySelector('#vendor-form-status');
  const lineRetryButton = document.querySelector('#vendor-line-retry');
  const successTitle = success?.querySelector('h2');
  if (!form || !success || !vendorNumber || !vendorAmount || !status) return;

  let acceptedVendor = readPendingVendorReceipt();

  const showAcceptedVendor = receipt => {
    acceptedVendor = receipt;
    vendorNumber.textContent = receipt.vendorNumber;
    vendorAmount.textContent = `${Number(receipt.amount || 0).toLocaleString('ja-JP')}円`;
    form.hidden = true;
    success.hidden = false;
    if (lineRetryButton) lineRetryButton.hidden = receipt.lineSent === true;
  };

  const sendAcceptedVendorToLine = async () => {
    if (!acceptedVendor) return false;
    const sent = await sendVendorCompletionMessage(acceptedVendor);
    acceptedVendor.lineSent = sent;
    if (sent) {
      clearPendingVendorReceipt();
      if (successTitle) successTitle.textContent = '出店申込みを受け付けました';
      showLineDeliveryResult('vendor-line-status', { applicantMessageSent: true });
      if (lineRetryButton) lineRetryButton.hidden = true;
    }
    return sent;
  };

  if (acceptedVendor) {
    showAcceptedVendor(acceptedVendor);
    if (successTitle) successTitle.textContent = '公式LINEへの送信が必要です';
    showLineDeliveryResult('vendor-line-status', {
      applicantMessageSent: acceptedVendor.lineSent === true,
      applicantMessageWarning: '出店申込は保存済みです。下のボタンから公式LINEへの送信だけを再実行してください。'
    });
  }

  lineRetryButton?.addEventListener('click', async () => {
    setSubmitting(lineRetryButton, true, '公式LINEへ送信中...');
    try {
      const sent = await sendAcceptedVendorToLine();
      if (!sent) {
        openOfficialLineVendorMessage(acceptedVendor);
        showLineDeliveryResult('vendor-line-status', {
          applicantMessageSent: false,
          applicantMessageWarning: '公式LINEが開いたら、入力済みの出店受付完了メッセージをそのまま送信してください。申込データは再登録されません。'
        });
      }
    } catch (error) {
      console.warn('Vendor completion retry failed:', safeErrorForLog(error, 'liff.sendMessages.retry'));
      openOfficialLineVendorMessage(acceptedVendor);
    } finally {
      setSubmitting(lineRetryButton, false);
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submitButton = form.querySelector('button[type="submit"]');
    setSubmitting(submitButton, true, '送信中...');
    showStatus(status, '出店申込みを送信しています。', 'info');
    try {
      const idToken = await getSubmissionIdToken('vendor');
      const formData = new FormData(form);
      const payload = {
        action: 'submitVendor',
        idToken,
        companyName: formData.get('companyName'),
        representativeName: formData.get('representativeName'),
        phone: formData.get('phone'),
        boothContent: formData.get('boothContent'),
        boothCount: formData.get('boothCount'),
        vehicleInfo: formData.get('vehicleInfo'),
        powerUse: 'なし',
        waterUse: 'なし',
        fireUse: formData.get('fireUse'),
        generatorUse: formData.get('generatorUse'),
        staffCount: formData.get('staffCount'),
        previousDayLoadIn: formData.get('previousDayLoadIn'),
        note: formData.get('note')
      };
      const result = await postToGas(payload);
      if (!(result.ok ?? result.success) || !result.vendorNumber) {
        throw new Error(result.message || '出店受付番号を取得できませんでした。');
      }

      acceptedVendor = {
        vendorNumber: result.vendorNumber,
        companyName: payload.companyName,
        amount: result.amount,
        lineSent: false
      };
      savePendingVendorReceipt(acceptedVendor);

      let vendorChatSent = false;
      try {
        vendorChatSent = await sendAcceptedVendorToLine();
      } catch (lineError) {
        console.warn('Vendor completion chat message failed:', safeErrorForLog(lineError, 'liff.sendMessages'));
      }

      vendorNumber.textContent = result.vendorNumber;
      vendorAmount.textContent = `${Number(result.amount).toLocaleString('ja-JP')}円`;
      showLineDeliveryResult(
        'vendor-line-status',
        vendorChatSent
          ? { ...result, applicantMessageSent: true, applicantMessageWarning: '' }
          : {
              ...result,
              applicantMessageSent: false,
              applicantMessageWarning: '出店申込は保存済みです。公式LINEを開きます。LINEに入力された出店受付完了メッセージをそのまま送信してください。'
            }
      );
      form.hidden = true;
      clearFormDraft(form);
      success.hidden = false;
      if (successTitle) {
        successTitle.textContent = vendorChatSent
          ? '出店申込みを受け付けました'
          : '出店申込内容を仮保存しました';
      }
      if (lineRetryButton) lineRetryButton.hidden = vendorChatSent;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (!vendorChatSent) {
        window.setTimeout(() => openOfficialLineVendorMessage(acceptedVendor), 350);
      }
    } catch (error) {
      console.error('Vendor submission failed:', safeErrorForLog(error));
      showStatus(status, getPublicErrorMessage(error), 'error');
    } finally {
      setSubmitting(submitButton, false);
    }
  });
}

async function initializePageLiff() {
  const requestedMode = getRequestedMode();
  const pageType =
    document.body.classList.contains('entry-page')
      ? 'entry'
      : document.body.classList.contains('sponsor-page')
        ? (requestedMode === 'vendor' ? 'vendor' : 'sponsor')
        : '';

  if (!pageType) return;

  const launchedViaLiff = isLikelyLiffLaunch();

  if (!launchedViaLiff) {
    if (pageType === 'entry') {
      updateAuthMessage(
        'entry',
        'BOSD AWARDエントリーはLINE内の専用ページからお申し込みください。'
      );
    }
    return;
  }

  liffSession.pageType = pageType;

  if (pageType === 'sponsor' || pageType === 'vendor') {
    document
      .querySelector('#sponsor-intro')
      ?.setAttribute('hidden', '');

    document
      .querySelector(`#${pageType}-liff-panel`)
      ?.removeAttribute('hidden');
  }

  const liffId =
    pageType === 'entry'
      ? ENTRY_LIFF_ID
      : SPONSOR_LIFF_ID;

  let liffStage = 'LIFF SDK';

  try {
    if (!window.liff) {
      throw new Error(
        'LINE連携機能を読み込めませんでした。ページを開き直してください。'
      );
    }

    liffStage = 'liff.init';
    await liff.init({
      liffId,
      withLoginOnExternalBrowser: true
    });

    if (!liff.isLoggedIn()) {
      liff.login({
        redirectUri: window.location.href
      });
      return;
    }

    liffStage = 'liff.getIDToken';
    const idToken = liff.getIDToken();

    if (!idToken) {
      throw new Error(
        'LINEログイン情報を取得できませんでした。ページを開き直してください。'
      );
    }

    liffStage = 'liff.getFriendship';
    await ensureOfficialLineFriendship();

    liffSession.idToken = idToken;
    liffSession.ready = true;

    showAuthenticatedForm(pageType);
  } catch (error) {
    if (
      error?.code ===
      'LIFF_REAUTH_STARTED'
    ) {
      return;
    }

    console.error(
      'LIFF initialization failed:',
      safeErrorForLog(error, liffStage)
    );

    updateAuthMessage(
      pageType,
      getLiffDiagnosticMessage(
        error,
        liffStage
      ),
      true
    );
  }
}
function isLikelyLiffLaunch() {
  const params =
    new URLSearchParams(window.location.search);

  return (
    /\bLine\//i.test(navigator.userAgent) ||
    params.has('liff.state') ||
    document.referrer.startsWith(
      'https://liff.line.me/'
    )
  );
}

function showAuthenticatedForm(pageType) {
  const gate =
    document.querySelector(
      `#${pageType}-auth-status`
    );

  const form =
    document.querySelector(
      `#${pageType}-form`
    );

  if (gate) gate.hidden = true;
  if (form) form.hidden = false;

  document.documentElement.classList.add(
    'liff-ready'
  );
}

function updateAuthMessage(
  pageType,
  message,
  isError = false
) {
  const gate =
    document.querySelector(
      `#${pageType}-auth-status`
    );

  const heading =
    gate?.querySelector('h2');

  const messageElement =
    document.querySelector(
      `#${pageType}-auth-message`
    );

  if (heading && isError) {
    heading.textContent =
      'LINE連携を確認できませんでした';
  }

  if (messageElement) {
    messageElement.textContent = message;
  }

  if (gate) {
    gate.classList.toggle(
      'has-error',
      isError
    );
  }
}

async function getSubmissionIdToken(
  expectedPageType
) {
  if (!GAS_WEB_APP_URL.trim()) {
    throw new Error('送信先が未設定です。');
  }

  if (
    !window.liff ||
    liffSession.pageType !== expectedPageType ||
    !liffSession.ready
  ) {
    throw new Error(
      'LINEログイン情報を取得できませんでした。ページを開き直してください。'
    );
  }

  if (!liff.isLoggedIn()) {
    liff.login({
      redirectUri: window.location.href
    });

    throw new Error(
      'LINEログイン画面へ移動します。'
    );
  }

  const idToken = liff.getIDToken();

  if (!idToken) {
    throw new Error(
      'LINEログイン情報を取得できませんでした。ページを開き直してください。'
    );
  }

  await ensureOfficialLineFriendship();

  return idToken;
}

async function ensureOfficialLineFriendship() {
  try {
    const friendship =
      await liff.getFriendship();

    if (!friendship?.friendFlag) {
      const error = new Error(
        '公式LINEを友だち追加してからお申し込みください。'
      );
      error.code = 'NOT_A_FRIEND';
      throw error;
    }

    sessionStorage.removeItem(
      'liffExpiredTokenRecovery'
    );
    return true;
  } catch (error) {
    if (error?.code === 'NOT_A_FRIEND') {
      throw error;
    }

    if (isExpiredLiffAccessToken(error)) {
      restartLiffLogin();

      const reauthError = new Error(
        'LINEログイン情報を更新しています。'
      );
      reauthError.code =
        'LIFF_REAUTH_STARTED';
      throw reauthError;
    }

    if (isFriendshipPermissionError(error)) {
      console.warn(
        'LIFF friendship check unavailable:',
        safeErrorForLog(
          error,
          'liff.getFriendship'
        )
      );
      return null;
    }

    throw error;
  }
}

function isExpiredLiffAccessToken(error) {
  const code = String(
    error?.code || ''
  ).toLowerCase();
  const message = String(
    error?.message || ''
  ).toLowerCase();

  return (
    code === 'invalid_request' &&
    (
      message.includes('access token') ||
      message.includes('expired')
    )
  );
}

function restartLiffLogin() {
  const recoveryKey =
    'liffExpiredTokenRecovery';

  if (sessionStorage.getItem(recoveryKey)) {
    sessionStorage.removeItem(recoveryKey);
    throw new Error(
      'LINEログイン情報を更新できませんでした。LINEアプリを閉じて、もう一度開いてください。'
    );
  }

  sessionStorage.setItem(recoveryKey, '1');

  const params =
    new URLSearchParams(location.search);
  const liffState = params.get('liff.state');

  let redirectUri = location.href;

  if (liffState) {
    try {
      redirectUri = new URL(
        `.${liffState}`,
        location.href
      ).toString();
    } catch (error) {
      console.warn(
        'LIFF redirect URI recovery failed:',
        safeErrorForLog(
          error,
          'restartLiffLogin'
        )
      );
    }
  }

  if (liff.isLoggedIn()) {
    liff.logout();
  }

  liff.login({redirectUri});
}

function isFriendshipPermissionError(error) {
  const code = String(
    error?.code || ''
  ).toUpperCase();
  const message = String(
    error?.message || ''
  ).toLowerCase();

  return (
    code === 'FORBIDDEN' ||
    code === 'UNAUTHORIZED' ||
    code === 'PERMISSION_DENIED' ||
    message.includes('permission') ||
    message.includes('scope') ||
    message.includes('権限')
  );
}

async function postToGas(payload) {
  const body = new URLSearchParams();

  Object.entries(payload).forEach(
    ([key, value]) => {
      body.append(
        key,
        value == null ? '' : String(value)
      );
    }
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    30000
  );

  try {
    const response = await fetch(
      GAS_WEB_APP_URL,
      {
        method: 'POST',
        body,
        redirect: 'follow',
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        '送信がタイムアウトしました。通信環境を確認して、もう一度お試しください。'
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getPublicErrorMessage(error) {
  const message =
    error instanceof Error
      ? error.message
      : '';

  if (
    message.includes('LINE') ||
    message.includes('友だち追加') ||
    message.includes('送信先が未設定') ||
    message.includes('受付番号') ||
    message.includes('金額') ||
    message.includes('タイムアウト')
  ) {
    return message;
  }

  return (
    '送信に失敗しました。' +
    '通信環境を確認して、もう一度お試しください。'
  );
}

function safeErrorForLog(error, stage = '') {
  return {
    stage,
    name:
      error instanceof Error
        ? error.name
        : '',
    code: String(error?.code || ''),
    message:
      error instanceof Error
        ? error.message
        : String(error)
  };
}

function showLineDeliveryResult(elementId, result) {
  const element = document.querySelector(`#${elementId}`);
  if (!element) return;
  if (result?.duplicate) {
    element.textContent = '同じ内容はすでに受付済みです。二重登録はしていません。先に届いた公式LINEをご確認ください。';
    element.classList.remove('is-warning');
    return;
  }
  const sent = result?.applicantMessageSent === true;
  element.textContent = sent
    ? '公式LINEへの受付案内送信を確認しました。'
    : (result?.applicantMessageWarning ||
      '受付は完了しましたが、公式LINEへの案内送信を確認できませんでした。運営へお問い合わせください。');
  element.classList.toggle('is-warning', !sent);
}

function getLiffDiagnosticMessage(
  error,
  stage
) {
  const code = String(
    error?.code || 'NO_CODE'
  );
  const rawMessage =
    error instanceof Error
      ? error.message
      : String(error || '詳細不明');
  const safeMessage = rawMessage
    .replace(
      /eyJ[A-Za-z0-9._-]{20,}/g,
      '[TOKEN]'
    )
    .slice(0, 180);

  return (
    `${getPublicErrorMessage(error)} ` +
    `確認情報：${stage} / ` +
    `${code} / ${safeMessage}`
  );
}

function showStatus(
  element,
  message,
  type
) {
  if (!element) return;

  element.textContent = message;
  element.className =
    `form-status ${type}`;

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });
}

function setSubmitting(
  button,
  isSubmitting,
  label = ''
) {
  if (!button) return;

  if (isSubmitting) {
    button.dataset.originalHtml =
      button.innerHTML;

    button.textContent = label;
    button.disabled = true;
  } else {
    button.innerHTML =
      button.dataset.originalHtml ||
      button.innerHTML;

    button.disabled = false;
  }
}

function initializeTurnstile() {
  const containers =
    document.querySelectorAll(
      '[data-turnstile-container]'
    );

  if (
    !TURNSTILE_SITE_KEY.trim() ||
    !containers.length
  ) {
    return;
  }

  const script =
    document.createElement('script');

  script.src =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  script.async = true;
  script.defer = true;

  script.onload = () => {
    containers.forEach(container => {
      window.turnstile?.render(
        container,
        {
          sitekey: TURNSTILE_SITE_KEY
        }
      );
    });
  };

  script.onerror = () => {
    containers.forEach(container => {
      container.textContent =
        '迷惑送信防止機能を読み込めませんでした。ページを再読み込みしてください。';

      container.classList.add(
        'load-error'
      );
    });
  };

  document.head.appendChild(script);
}

function getRequestedMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'vendor') return 'vendor';
  const state = params.get('liff.state');
  if (!state) return '';
  try {
    const decoded = decodeURIComponent(state);
    const stateQuery = decoded.includes('?') ? decoded.split('?')[1] : decoded.replace(/^\?/, '');
    return new URLSearchParams(stateQuery).get('mode') || '';
  } catch (_) {
    return '';
  }
}
