document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('[data-document-close]');
  if (!button) return;

  button.addEventListener('click', () => {
    window.close();

    // 通常ブラウザでスクリプトによるタブ閉じが許可されない場合は元の画面へ戻す。
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
      }
    }, 150);
  });
});
