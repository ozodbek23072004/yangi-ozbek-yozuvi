/**
 * Yangi O'zbek Yozuvi Konvertori — app.js
 * UI holati, tugmalar va real-vaqt konvertatsiyani boshqaradi.
 *
 * Konvertatsiya qoidalari `converter.js` da (brauzer va Node uchun umumiy).
 * Bu fayl faqat DOM bilan ishlaydi.
 */

'use strict';

const Converter = window.OzbekConverter;

if (!Converter) {
  throw new Error("converter.js yuklanmadi. index.html dagi script tartibini tekshiring.");
}

// Namuna matn (1995-yilgi yozuvda)
const SAMPLE_TEXT_1995 = `O'zbekiston Respublikasi — boy tarix va buyuk kelajakka ega bo'lgan mustaqil davlat.
Shahar va qishloqlarda ulkan o'zgarishlar, yangi bino hamda inshootlar qad ko'tarmoqda.
Charchash bilmas yoshlarimiz xalqaro olimpiadalarda g'alabalarga erishmoqda.
San'at va madaniyat sohasida ham yuksak yutuqlarga erishilmoqda.
Quyosh nurlari ostida yashnab turgan go'zal yurtimiz — bizning g'ururimiz!`;

const SAMPLE_TEXT_2026 = `Özbek tili — chiroyli va boy til.
Şahar köçalari gullagan daraxtlar bilan bezangan.
Milliy taomlardan çoy içib, bayram kayfiyatida yurmoqda.
Özbek şeʼriyati ğoyat nozik va şirindir.`;

// =========================================================================
// 1. UI holati va DOM elementlari
// =========================================================================

let direction = '1995_to_2026'; // yoki '2026_to_1995'
let copyTimeout = null;
let statusTimeout = null;
let convertTimer = null;
let lastFocusedElement = null;

const sourceText = document.getElementById('sourceText');
const targetText = document.getElementById('targetText');
const charCounter = document.getElementById('charCounter');
const wordCounter = document.getElementById('wordCounter');
const targetCharCounter = document.getElementById('targetCharCounter');
const targetWordCounter = document.getElementById('targetWordCounter');
const sourceLabel = document.getElementById('sourceLabel');
const targetLabel = document.getElementById('targetLabel');
const inputCardTitle = document.getElementById('inputCardTitle');
const inputCardTag = document.getElementById('inputCardTag');
const outputCardTitle = document.getElementById('outputCardTitle');
const outputCardTag = document.getElementById('outputCardTag');
const swapBtn = document.getElementById('swapBtn');
const clearBtn = document.getElementById('clearBtn');
const sampleBtn = document.getElementById('sampleBtn');
const pasteBtn = document.getElementById('pasteBtn');
const copyBtn = document.getElementById('copyBtn');
const saveBtn = document.getElementById('saveBtn');
const statusMessage = document.getElementById('statusMessage');

// Modal elementlari
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById('infoModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalOkBtn = document.getElementById('modalOkBtn');

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Nusxalash tugmasining doimiy andozasi (race condition bo'lmasligi uchun)
const COPY_BTN_DEFAULT_HTML = `
  <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
  <span>Nusxalash</span>`;

const COPY_BTN_SUCCESS_HTML = `
  <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
  <span>Nusxalandi!</span>`;

// =========================================================================
// 2. Asosiy funksiyalar
// =========================================================================

/** Matnni konvertatsiya qiladi va natijani yangilaydi */
function runConversion() {
  const input = sourceText.value;
  const result = Converter.convert(input, direction);
  targetText.value = result;

  updateCounters(input, result);
  updateButtonStates();
}

/** Kirish hodisalarini birlashtiradi (katta matnda ortiqcha ish bo'lmasligi uchun) */
function scheduleConversion() {
  if (convertTimer !== null) return;
  convertTimer = window.setTimeout(() => {
    convertTimer = null;
    runConversion();
  }, 40);
}

function cancelScheduledConversion() {
  if (convertTimer !== null) {
    window.clearTimeout(convertTimer);
    convertTimer = null;
  }
}

/** Belgilar va so'zlar hisoblagichini yangilaydi (ikkala panel uchun) */
function updateCounters(inputText, resultText) {
  const inChars = inputText.length;
  const inWords = inputText.trim() === '' ? 0 : inputText.trim().split(/\s+/).length;
  charCounter.textContent = `${inChars} belgi`;
  wordCounter.textContent = `${inWords} so'z`;

  const outChars = resultText ? resultText.length : 0;
  const outWords = resultText && resultText.trim() !== '' ? resultText.trim().split(/\s+/).length : 0;
  if (targetCharCounter && targetWordCounter) {
    targetCharCounter.textContent = `${outChars} belgi`;
    targetWordCounter.textContent = `${outWords} so'z`;
  }
}

/** Bo'sh matnga qarab tugmalarning faollik (disabled) holatini yangilaydi */
function updateButtonStates() {
  const hasInput = sourceText.value.trim().length > 0;
  const hasOutput = targetText.value.trim().length > 0;

  clearBtn.disabled = !hasInput;
  copyBtn.disabled = !hasOutput;
  saveBtn.disabled = !hasOutput;
}

/** Foydalanuvchiga qisqa xabar ko'rsatadi (screen reader ham o'qiydi) */
function showStatus(message, isError) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.classList.toggle('is-error', Boolean(isError));

  if (statusTimeout) window.clearTimeout(statusTimeout);
  statusTimeout = window.setTimeout(() => {
    statusMessage.textContent = '';
    statusMessage.classList.remove('is-error');
  }, 3000);
}

/** Nusxalash tugmasini birlamchi holatga qaytarish */
function resetCopyBtn() {
  if (copyTimeout) {
    window.clearTimeout(copyTimeout);
    copyTimeout = null;
  }
  copyBtn.innerHTML = COPY_BTN_DEFAULT_HTML;
  copyBtn.classList.remove('btn-success');
}

/** Kursorni matn boshiga qo'yadi va maydonni tepaga suradi */
function focusSourceAtStart() {
  sourceText.focus();
  sourceText.setSelectionRange(0, 0);
  sourceText.scrollTop = 0;
  sourceText.scrollLeft = 0;
}

/** Yo'nalish yorliqlarini yangilaydi */
function updateLabels() {
  if (direction === '1995_to_2026') {
    sourceLabel.textContent = 'Lotin (1995-yil)';
    targetLabel.textContent = 'Yangi tahrir (2026-yil)';
    inputCardTitle.textContent = 'Asl matn';
    inputCardTag.textContent = '1995';
    outputCardTitle.textContent = 'Yangi yozuvdagi natija';
    outputCardTag.textContent = '2026';
    sourceText.placeholder = 'Matnni bu yerga kiriting yoki nusxasini joylashtiring...';
    targetText.placeholder = 'Konvertatsiya qilingan natija shu yerda avtomatik paydo bo\'ladi...';
  } else {
    sourceLabel.textContent = 'Yangi tahrir (2026-yil)';
    targetLabel.textContent = 'Lotin (1995-yil)';
    inputCardTitle.textContent = 'Asl matn';
    inputCardTag.textContent = '2026';
    outputCardTitle.textContent = 'Eski yozuvdagi natija';
    outputCardTag.textContent = '1995';
    sourceText.placeholder = 'Yangi alifbodagi matnni bu yerga kiriting...';
    targetText.placeholder = 'Eski yozuvdagi natija shu yerda avtomatik paydo bo\'ladi...';
  }
}

/** Yuklab olinadigan fayl nomi uchun vaqt tamg'asi */
function buildTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('') + '-' + [pad(now.getHours()), pad(now.getMinutes())].join('');
}

// =========================================================================
// 3. Tugmalar hodisalari (Event Listeners)
// =========================================================================

/** Jonli konvertatsiya: har bir kalit bosilganda ishlaydi */
sourceText.addEventListener('input', scheduleConversion);

/** ⇄ Yo'nalishni almashtirish funksiyasi */
function handleSwap() {
  const currentResult = targetText.value;
  cancelScheduledConversion();
  direction = direction === '1995_to_2026' ? '2026_to_1995' : '1995_to_2026';
  updateLabels();
  resetCopyBtn();

  sourceText.value = currentResult;
  runConversion();
  focusSourceAtStart();

  swapBtn.classList.toggle('is-reversed');
  swapBtn.classList.remove('is-swapping');
  void swapBtn.offsetWidth; /* animatsiyani qayta boshlash uchun */
  swapBtn.classList.add('is-swapping');
}

swapBtn.addEventListener('click', handleSwap);

swapBtn.addEventListener('animationend', (event) => {
  if (event.animationName === 'swap-pulse') {
    swapBtn.classList.remove('is-swapping');
  }
});

/** ✕ Tozalash tugmasi */
clearBtn.addEventListener('click', () => {
  cancelScheduledConversion();
  sourceText.value = '';
  targetText.value = '';
  updateCounters('', '');
  updateButtonStates();
  resetCopyBtn();
  focusSourceAtStart();
});

/** 📋 Joylashtirish (Paste) tugmasi */
pasteBtn.addEventListener('click', async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        cancelScheduledConversion();
        sourceText.value = clipboardText;
        runConversion();
        focusSourceAtStart();
        showStatus('Matn xotiradan joylashtirildi.');
        return;
      }
    }
  } catch (err) {
    console.warn('Clipboard read error, fallback to focus:', err);
  }

  sourceText.focus();
  showStatus('Brauzer xotiradan o\'qishga ruxsat bermadi. Matnni qo\'lda joylashtiring.', true);
});

/** 📝 Namuna matn tugmasi */
sampleBtn.addEventListener('click', () => {
  cancelScheduledConversion();
  sourceText.value = direction === '1995_to_2026' ? SAMPLE_TEXT_1995 : SAMPLE_TEXT_2026;
  runConversion();
  resetCopyBtn();
  focusSourceAtStart();
});

/** 📋 Nusxa olish tugmasi (xavfsiz va ishonchli) */
copyBtn.addEventListener('click', () => {
  const result = targetText.value;
  if (!result) return;

  const onSuccess = () => {
    resetCopyBtn();
    copyBtn.innerHTML = COPY_BTN_SUCCESS_HTML;
    copyBtn.classList.add('btn-success');
    showStatus('Natija nusxalandi.');

    copyTimeout = window.setTimeout(() => {
      resetCopyBtn();
    }, 2000);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(result)
      .then(onSuccess)
      .catch((err) => {
        console.warn('Clipboard write failed, trying execCommand fallback:', err);
        fallbackCopy(result, onSuccess);
      });
  } else {
    fallbackCopy(result, onSuccess);
  }
});

/** Zaxira nusxalash mexanizmi (eskiroq brauzerlar yoki cheklangan protokollar uchun) */
function fallbackCopy(text, callback) {
  const tempInput = document.createElement('textarea');
  tempInput.value = text;
  tempInput.setAttribute('readonly', 'readonly');
  tempInput.style.position = 'fixed';
  tempInput.style.top = '-9999px';
  tempInput.style.left = '-9999px';
  document.body.appendChild(tempInput);
  tempInput.focus();
  tempInput.select();
  try {
    document.execCommand('copy');
    if (callback) callback();
  } catch (e) {
    console.error('Fallback copy ham muvaffaqiyatsiz bo\'ldi:', e);
    showStatus('Nusxalash imkoni bo\'lmadi. Matnni qo\'lda belgilang.', true);
  }
  document.body.removeChild(tempInput);
}

/** 💾 Saqlash (.txt) tugmasi */
saveBtn.addEventListener('click', () => {
  const result = targetText.value;
  if (!result) return;

  const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const suffix = direction === '1995_to_2026' ? '_2026' : '_1995';
  const a = document.createElement('a');
  a.href = url;
  a.download = `matn${suffix}_${buildTimestamp()}.txt`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showStatus('Fayl yuklab olindi.');
});

// =========================================================================
// 4. Ma'lumot modali (Info modal)
// =========================================================================

function openModal() {
  lastFocusedElement = document.activeElement;
  infoModal.classList.add('is-open');
  infoModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (modalOkBtn) modalOkBtn.focus();
}

function closeModal() {
  infoModal.classList.remove('is-open');
  infoModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

infoBtn.addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);
modalOkBtn.addEventListener('click', closeModal);

infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    closeModal();
  }
});

/** Modal ichida Tab fokusini ushlab turadi */
infoModal.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;

  const focusables = Array.from(infoModal.querySelectorAll(FOCUSABLE_SELECTOR));
  if (focusables.length === 0) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && infoModal.classList.contains('is-open')) {
    closeModal();
  }
});

// =========================================================================
// 5. Boshlang'ich holat
// =========================================================================
resetCopyBtn();
updateLabels();
updateCounters('', '');
updateButtonStates();
