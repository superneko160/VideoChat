'use strict';

/**
 * ボタンを有効化
 * @param {HTMLButtonElement} button 有効化するボタン
 */
function enableButton(button) {
    if (button) {
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    }
}

/**
 * ボタンを無効化
 * @param {HTMLButtonElement} button 無効化するボタン
 */
function disableButton(button) {
    if (button) {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    }
}
