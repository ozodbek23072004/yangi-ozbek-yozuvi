/**
 * Yangi O'zbek Yozuvi Konvertori — converter.js
 * Brauzer va Node.js uchun yagona konvertatsiya mantig'i.
 *
 * 1995 -> 2026:
 *   o' / O' -> ö / Ö
 *   g' / G' -> ğ / Ğ
 *   sh / Sh / SH -> ş / Ş / Ş
 *   ch / Ch / CH -> ç / Ç / Ç
 *   Tutuq belgisi -> ʼ (U+02BC)
 *
 * 2026 -> 1995: yuqoridagilarning teskarisi.
 *
 * Havolalar (URL), elektron pochta manzillari va PRESERVED_WORDS ro'yxatidagi
 * so'zlar konvertatsiyadan himoyalanadi (masking), aks holda "Chicago" kabi
 * chet so'zlar ham "Çiçago" ga aylanib ketadi.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.OzbekConverter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const APOSTROPHES = "['’‘ʻʼ`´]";
  const STANDART_TUTUQ = 'ʼ';
  const LETTER_CLASS = 'a-zA-ZöÖğĞşŞçÇ';
  const LOWERCASE_LETTERS = /[a-zöğşç]/;

  const PRESERVED_WORDS = [
    'Washington',
    'Chicago',
    'Manchester',
    'Shakespeare',
    'Sherlock',
    'Bach',
    'Richter',
    'Schubert',
    'Chen',
    'Chan',
    'Zhang'
  ];

  const TOKEN_START = '\uE000';
  const TOKEN_END = '\uE001';
  const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
  const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Matnda uchramaydigan token prefiksini tanlaydi (kolliziyani oldini oladi). */
  function buildTokenMarker(text) {
    let marker = TOKEN_START;
    while (text.includes(marker)) {
      marker += TOKEN_START;
    }
    return marker;
  }

  function maskProtected(text) {
    const store = [];
    const marker = buildTokenMarker(text);
    const protect = (match) => {
      const token = marker + store.length + TOKEN_END;
      store.push(match);
      return token;
    };

    let masked = text.replace(URL_RE, protect);
    masked = masked.replace(EMAIL_RE, protect);

    if (PRESERVED_WORDS.length > 0) {
      const pattern = new RegExp('\\b(' + PRESERVED_WORDS.map(escapeRegExp).join('|') + ')\\b', 'gi');
      masked = masked.replace(pattern, protect);
    }

    return {
      text: masked,
      restore: (value) => value.replace(
        new RegExp(escapeRegExp(marker) + '(\\d+)' + TOKEN_END, 'g'),
        (match, index) => store[Number(index)]
      )
    };
  }

  function hasLowercaseNeighbour(source, index) {
    const prev = index > 0 ? source[index - 1] : '';
    const next = index + 1 < source.length ? source[index + 1] : '';
    return LOWERCASE_LETTERS.test(prev) || LOWERCASE_LETTERS.test(next);
  }

  function toNewAlphabet(text, options) {
    if (!text) return text;
    const opts = Object.assign({ normalizeApostrophe: true, preserve: true }, options);
    const mask = opts.preserve ? maskProtected(text) : null;
    let res = mask ? mask.text : text;

    res = res.replace(/([OGog])['’‘ʻʼ`´]/g, (match, letter) => {
      if (letter === 'O') return 'Ö';
      if (letter === 'o') return 'ö';
      if (letter === 'G') return 'Ğ';
      if (letter === 'g') return 'ğ';
      return match;
    });

    res = res.replace(/([Ss])([Hh])/g, (match, s) => (s === 'S' ? 'Ş' : 'ş'));
    res = res.replace(/([Cc])([Hh])/g, (match, c) => (c === 'C' ? 'Ç' : 'ç'));

    if (opts.normalizeApostrophe) {
      const pattern = new RegExp(
        '(?<=[' + LETTER_CLASS + '])' + APOSTROPHES + '(?=[' + LETTER_CLASS + '])',
        'g'
      );
      res = res.replace(pattern, STANDART_TUTUQ);
    }

    return mask ? mask.restore(res) : res;
  }

  function toOldAlphabet(text, options) {
    if (!text) return text;
    const opts = Object.assign({ preserve: true }, options);
    const mask = opts.preserve ? maskProtected(text) : null;
    let res = mask ? mask.text : text;

    res = res.replace(/Ö/g, 'Oʻ').replace(/ö/g, 'oʻ');
    res = res.replace(/Ğ/g, 'Gʻ').replace(/ğ/g, 'gʻ');

    res = res.replace(/[Şş]/g, (ch, index, source) => {
      if (ch === 'ş') return 'sh';
      return hasLowercaseNeighbour(source, index) ? 'Sh' : 'SH';
    });

    res = res.replace(/[Çç]/g, (ch, index, source) => {
      if (ch === 'ç') return 'ch';
      return hasLowercaseNeighbour(source, index) ? 'Ch' : 'CH';
    });

    return mask ? mask.restore(res) : res;
  }

  function convert(text, direction, options) {
    if (direction === '1995_to_2026') return toNewAlphabet(text, options);
    if (direction === '2026_to_1995') return toOldAlphabet(text, options);
    throw new Error("Noma'lum yo'nalish: " + direction);
  }

  return {
    APOSTROPHES,
    STANDART_TUTUQ,
    PRESERVED_WORDS,
    toNewAlphabet,
    toOldAlphabet,
    convert
  };
});
