document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('[data-document-close]');
  if (!button) return;

  button.addEventListener('click', () => {
    // 元画面との参照が残る環境では、入力中の画面を再読込せずに戻す。
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }

    // noopenerの別タブでも、ユーザー操作で開いたページなら通常は閉じられる。
    window.close();

    // LINE内ブラウザ等で閉じられない場合だけ、保存済みの申込みURLへ戻す。
    window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      const returnUrl = sessionStorage.getItem('bosd-document-return-url') || '';
      if (returnUrl && returnUrl.startsWith(window.location.origin)) {
        window.location.replace(returnUrl);
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.replace('index.html');
      }
    }, 150);
  });
});
