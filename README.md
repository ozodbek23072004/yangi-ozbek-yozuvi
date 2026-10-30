# Yangi O'zbek Yozuvi Konvertori

O'zbek lotin yozuvini **1995-yilgi tahrir** va **2026-yilgi yangi tahrir** o'rtasida
o'giradigan yengil, server talab qilmaydigan veb-ilova.

- `oʻ / o'` ⇄ `ö`
- `gʻ / g'` ⇄ `ğ`
- `sh` ⇄ `ş`
- `ch` ⇄ `ç`
- tutuq belgisi `ʼ` (U+02BC) normallashtiriladi

## Tuzilma

```
.
├── index.html      # UI (ikkala panel, modal, qoidalar jadvali)
├── style.css       # Oq-ko'k dizayn, mobil moslashuv
├── converter.js    # Konvertatsiya mantig'i (brauzer + Node)
├── app.js          # Faqat DOM va UI logikasi
├── converter.py    # Xuddi shu qoidalar + CLI (fayllar bilan ishlash)
├── tests/
│   ├── cases.json     # Ikkala implementatsiya uchun yagona test to'plami
│   ├── run_tests.js   # JS test yuguruvchisi
│   └── run_tests.py   # Python test yuguruvchisi
└── bosqich2_xavflar_va_yechimlar.md  # .docx/.txt/.md uchun texnik reja
```

Mantiq **ikki joyda** yashaydi: `converter.js` (brauzer) va `converter.py` (CLI).
Ular bir xil bo'lib qolishi uchun ikkalasi ham `tests/cases.json` ga qarshi tekshiriladi.

## Ishga tushirish

To'g'ridan-to'g'ri `index.html` ni brauzerda ochish kifoya — tashqi
bog'liqlik yo'q, internet talab qilinmaydi.

Ixtiyoriy lokal server:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Testlar

```bash
node tests/run_tests.js
python3 tests/run_tests.py
```

Ikkalasi ham `48/48 passed` chiqishi kerak. `run_tests.py` qo'shimcha ravishda
kodirovka aniqlashning 4 ta chegara testini tekshiradi. Yangi qoida qo'shsangiz,
avval `tests/cases.json` ga test yozing, keyin ikkala implementatsiyani yangilang.

## CLI (fayllar bilan ishlash)

```bash
# matn.txt -> matn_2026.txt (kodirovka avtomatik aniqlanadi)
python3 converter.py matn.txt

# aniq faylga
python3 converter.py matn.txt -o natija.txt

# teskari yo'nalish
python3 converter.py matn.txt -d 2026_to_1995

# stdin -> stdout
cat matn.txt | python3 converter.py -
```

CLI xususiyatlari:

- BOM bo'lsa `utf-8-sig`, aks holda `utf-8 → windows-1251 → cp1254 → iso-8859-9 → latin-1`
  kaskadi orqali kodirovkani avtomatik aniqlaydi.
- Katta fayllarni qatorma-qator (streaming) o'qiydi, butun faylni RAM ga yuklamaydi.
- Asl fayl ustiga hech qachon yozmaydi; bir xil nom berilsa xato qaytaradi.

## Himoyalangan so'zlar va havolalar

Konvertor `sh`/`ch` ni har qanday joyda almashtirgani uchun `Chicago` kabi chet
so'zlar buzilishi mumkin. Shu sababli quyidagilar vaqtincha "maskalanadi" va
konvertatsiyadan keyin o'z holida qaytariladi:

- URL manzillar (`https://...`, `www....`)
- elektron pochta manzillari
- `PRESERVED_WORDS` ro'yxatidagi so'zlar (`converter.js` va `converter.py` da)

Ro'yxatni kengaytirish uchun ikkala fayldagi `PRESERVED_WORDS` ga so'z qo'shib,
`tests/cases.json` ga test yozing.

## Ma'lum cheklovlar

- `ng` alohida harf sifatida qaralmaydi (rasmiy qoidaga muvofiq).
- `2026 → 1995` yo'nalishida `oʻ` harfi doim U+02BB (`ʻ`) bilan yoziladi;
  asl matndagi ASCII apostrof qaytarilmaydi.
- `.docx`, `.pdf`, `.md` konvertatsiyasi hali yo'q — reja
  `bosqich2_xavflar_va_yechimlar.md` da.
