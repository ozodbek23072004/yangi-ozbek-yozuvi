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

// Namuna matn: O'zbekiston Respublikasining O'RQ-1184-sonli Qonuni (lex.uz)
const SAMPLE_TEXT_1995 = `OʻZBEKISTON RESPUBLIKASINING QONUNI
“Lotin yozuviga asoslangan oʻzbek alifbosini joriy etish toʻgʻrisida”gi Oʻzbekiston Respublikasi Qonuniga oʻzgartirish kiritish haqida

Keyingi yillarda oʻzbek tilini rivojlantirish, uning davlat tili sifatidagi nufuzini mustahkamlash borasida tizimli choralar koʻrilmoqda. Oʻzbek tili mamlakatimiz ijtimoiy hayotining barcha sohalarida faol qoʻllanilmoqda, shuningdek uning xalqaro maydondagi nufuzi tobora ortib bormoqda. Xorijiy mamlakatlarda oʻzbek tiliga alohida eʼtibor qaratilib, uni oʻrganishga boʻlgan qiziqish kuchaymoqda.

Mana shunday sharoitda lotin yozuviga asoslangan oʻzbek alifbosini va imlo qoidalarini soha mutaxassislari tomonidan olib borilgan ilmiy-tadqiqot ishlari asosida takomillashtirish zaruriyati yuzaga kelmoqda.

Mazkur Qonun bilan “Lotin yozuviga asoslangan oʻzbek alifbosini joriy etish toʻgʻrisida”gi Oʻzbekiston Respublikasi Qonuniga lotin yozuviga asoslangan oʻzbek alifbosi 26 ta harf va 3 ta harflar birikmasi oʻrniga 28 ta harf va 1 ta tutuq belgisidan tashkil topishini nazarda tutuvchi oʻzgartirish kiritilmoqda.

Ushbu Qonun lotin yozuviga asoslangan oʻzbek alifbosini va imlo qoidalarini yanada takomillashtirishga hamda davlat tilini qoʻllash va raqamlashtirish imkoniyatlarini yanada kengaytirishga xizmat qiladi.`;

const SAMPLE_TEXT_2026 = `ÖZBEKISTON RESPUBLIKASINING QONUNI
“Lotin yozuviga asoslangan özbek alifbosini joriy etiş töğrisida”gi Özbekiston Respublikasi Qonuniga özgartiriş kiritiş haqida

Keyingi yillarda özbek tilini rivojlantiriş, uning davlat tili sifatidagi nufuzini mustahkamlaş borasida tizimli çoralar körilmoqda. Özbek tili mamlakatimiz ijtimoiy hayotining barça sohalarida faol qöllanilmoqda, şuningdek uning xalqaro maydondagi nufuzi tobora ortib bormoqda. Xorijiy mamlakatlarda özbek tiliga alohida eʼtibor qaratilib, uni örganişga bölgan qiziqiş kuçaymoqda.

Mana şunday şaroitda lotin yozuviga asoslangan özbek alifbosini va imlo qoidalarini soha mutaxassislari tomonidan olib borilgan ilmiy-tadqiqot işlari asosida takomillaştiriş zaruriyati yuzaga kelmoqda.

Mazkur Qonun bilan “Lotin yozuviga asoslangan özbek alifbosini joriy etiş töğrisida”gi Özbekiston Respublikasi Qonuniga lotin yozuviga asoslangan özbek alifbosi 26 ta harf va 3 ta harflar birikmasi örniga 28 ta harf va 1 ta tutuq belgisidan taşkil topişini nazarda tutuvçi özgartiriş kiritilmoqda.

Uşbu Qonun lotin yozuviga asoslangan özbek alifbosini va imlo qoidalarini yanada takomillaştirişga hamda davlat tilini qöllaş va raqamlaştiriş imkoniyatlarini yanada kengaytirişga xizmat qiladi.`;

// Maksimal belgi sig'imi
const MAX_CHARS = 20000;

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

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
// 2. Asosiy funksiyalar va Analitika
// =========================================================================

let trackConvertTimer = null;

/** Google Analytics 4 hodisalarini xavfsiz jo'natish */
function trackEvent(eventName, params = {}) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch (err) {
    // Analitika xatosi konvertor ishlashiga aslo xalaqit bermasligi kerak
  }
}

/** Matn kiritib bo'lingach GA4 ga konvertatsiya hodisasini yuborish (debounced) */
function scheduleTrackConvert() {
  if (trackConvertTimer) window.clearTimeout(trackConvertTimer);
  trackConvertTimer = window.setTimeout(() => {
    if (sourceText.value.trim().length > 0) {
      trackEvent('convert_action', {
        char_count: sourceText.value.length,
        direction: direction
      });
    }
  }, 1500);
}

/** Matnni konvertatsiya qiladi va natijani yangilaydi */
function runConversion() {
  if (sourceText.value.length > MAX_CHARS) {
    sourceText.value = sourceText.value.slice(0, MAX_CHARS);
    showStatus(`Maksimal hajm — ${formatNumber(MAX_CHARS)} belgi! Ortiqcha qismi qisqartirildi.`, true);
  }
  const input = sourceText.value;
  const result = Converter.convert(input, direction);
  targetText.value = result;

  updateCounters(input, result);
  updateButtonStates();
  scheduleTrackConvert();
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
  charCounter.textContent = `${formatNumber(inChars)} / ${formatNumber(MAX_CHARS)} belgi`;
  wordCounter.textContent = `${formatNumber(inWords)} so'z`;

  if (inChars >= MAX_CHARS) {
    charCounter.classList.add('counter-danger');
    charCounter.classList.remove('counter-warning');
  } else if (inChars >= MAX_CHARS * 0.9) {
    charCounter.classList.add('counter-warning');
    charCounter.classList.remove('counter-danger');
  } else {
    charCounter.classList.remove('counter-warning', 'counter-danger');
  }

  const outChars = resultText ? resultText.length : 0;
  const outWords = resultText && resultText.trim() !== '' ? resultText.trim().split(/\s+/).length : 0;
  if (targetCharCounter && targetWordCounter) {
    targetCharCounter.textContent = `${formatNumber(outChars)} belgi`;
    targetWordCounter.textContent = `${formatNumber(outWords)} so'z`;
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
    sourceText.placeholder = 'Matnni bu yerga kiriting yoki nusxasini joylashtiring (maks. 20 000 belgi)...';
    targetText.placeholder = 'Konvertatsiya qilingan natija shu yerda avtomatik paydo bo\'ladi...';
  } else {
    sourceLabel.textContent = 'Yangi tahrir (2026-yil)';
    targetLabel.textContent = 'Lotin (1995-yil)';
    inputCardTitle.textContent = 'Asl matn';
    inputCardTag.textContent = '2026';
    outputCardTitle.textContent = 'Eski yozuvdagi natija';
    outputCardTag.textContent = '1995';
    sourceText.placeholder = 'Yangi alifbodagi matnni bu yerga kiriting (maks. 20 000 belgi)...';
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

/** Brauzerda Ctrl+V / Cmd+V orqali joylashtirilganda cheklovni tekshirish */
sourceText.addEventListener('paste', () => {
  window.setTimeout(() => {
    if (sourceText.value.length >= MAX_CHARS) {
      showStatus(`Maksimal hajm — ${formatNumber(MAX_CHARS)} belgi!`, true);
    }
  }, 0);
});

/** ⇄ Yo'nalishni almashtirish funksiyasi */
function handleSwap() {
  let currentResult = targetText.value;
  cancelScheduledConversion();
  direction = direction === '1995_to_2026' ? '2026_to_1995' : '1995_to_2026';
  updateLabels();
  resetCopyBtn();

  if (currentResult.length > MAX_CHARS) {
    currentResult = currentResult.slice(0, MAX_CHARS);
  }
  sourceText.value = currentResult;
  runConversion();
  focusSourceAtStart();
  trackEvent('swap_direction', { new_direction: direction });

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
  trackEvent('clear_text');
});

/** 📋 Joylashtirish (Paste) tugmasi */
pasteBtn.addEventListener('click', async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      let clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        let isTruncated = false;
        if (clipboardText.length > MAX_CHARS) {
          clipboardText = clipboardText.slice(0, MAX_CHARS);
          isTruncated = true;
        }
        cancelScheduledConversion();
        sourceText.value = clipboardText;
        runConversion();
        focusSourceAtStart();
        trackEvent('paste_text', { char_count: clipboardText.length });
        if (isTruncated) {
          showStatus(`Maksimal hajm — ${formatNumber(MAX_CHARS)} belgi! Ortiqcha qismi qisqartirildi.`, true);
        } else {
          showStatus('Matn xotiradan joylashtirildi.');
        }
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
  trackEvent('sample_loaded', { direction: direction });
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
    trackEvent('copy_text', { char_count: result.length, direction: direction });

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
  trackEvent('download_txt', { char_count: result.length, direction: direction });
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
  trackEvent('info_modal_open');
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
