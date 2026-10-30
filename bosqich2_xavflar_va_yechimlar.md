# 2-Bosqich: Fayllar bilan ishlashda yuzaga kelishi mumkin bo'lgan xatoliklar va ularning yechimlari

Ushbu hujjat kelgusida fayllar (.docx, .txt, .md, .pdf) ustida konvertatsiya funksiyasini ishlab chiqishda xatoliklarning oldini olish uchun texnik qo'llanma sifatida tayyorlandi.

---

## 1. Microsoft Word (`.docx`) fayllaridagi nozik xatoliklar

`.docx` fayli oddiy matn emas, balki XML arxivdir (`document.xml`). Unda matn paragraflar (`<w:p>`) va har bir paragraf ichidagi **"Run"** (`<w:r>`) lardan tashkil topadi.

### 🔴 1-Xato: "Run-splitting" (So'z bo'laklanishi)
* **Xatolik tabiati:** Foydalanuvchi matn terayotganda shrift o'zgarsa, orfografik tekshiruv (spellcheck) ishlagan bo'lsa yoki klaviaturada apostrof tili o'zgargan bo'lsa, bitta so'z ikki yoki undan ortiq alohida run'larga bo'linib qoladi.
  - *Misol:* `o'zbek` so'zida:
    - `run[0].text = "o"`
    - `run[1].text = "'zbek"`
  - Agar biz har bir `run.text` ni alohida konvertorga bersak, `o` va `'` bir-birini ko'rmaydi va `o'` $\rightarrow$ `ö` ga **aylanmay qoladi**.
* **✅ Yechimi:**
  1. Paragrafdagi barcha run matnlarini birlashtirib umumiy matn olinadi.
  2. Matn to'liq konvertatsiya qilinadi.
  3. Konvertatsiya qilingan harflar run formatlariga (bold, italic, color) moslab qayta taqsimlanadi yoki butun paragraf formatini asragan holda xavfsiz qayta yoziladi.

### 🔴 2-Xato: Ko'rinmas joylar (Jadvallar, Header/Footer, Izohlar)
* **Xatolik tabiati:** Dasturchi faqat asosiy paragraflarni (`doc.paragraphs`) o'qiydi, natijada:
  - Jadvallar ichidagi matnlar (`doc.tables`);
  - Sahifa yuqori va pastki qismi (`header` va `footer`);
  - Sahifa ostidagi izohlar (`footnotes` va `endnotes`) o'zgarishsiz qolib ketadi.
* **✅ Yechimi:**
  Barcha konteynerlarni rekursiv aylanib chiquvchi to'liq funksiya yozish:
  - `for p in doc.paragraphs`
  - `for table in doc.tables: for row in table.rows: for cell in row.cells: for p in cell.paragraphs`
  - `for section in doc.sections: (section.header, section.footer)`

### 🔴 3-Xato: Asl faylning buzilishi yoki yo'qotilishi
* **Xatolik tabiati:** Konvertatsiya paytida xatolik yuz bersa, asl fayl shikastlanishi mumkin.
* **✅ Yechimi:**
  Hech qachon asl fayl ustiga yozilmaydi. Har doim yangi fayl hosil qilinadi: `hujjat.docx` $\rightarrow$ `hujjat_2026.docx`.

---

## 2. Oddiy matnli fayllar (`.txt`) va Kodirovkalar (Encodings)

### 🔴 1-Xato: `UnicodeDecodeError` (Noto'g'ri kodirovka)
* **Xatolik tabiati:** Dastur barcha fayllarni `utf-8` deb o'qiydi. Lekin O'zbekistonda ko'p fayllar `Windows-1251`, `CP1254` yoki `UTF-8 with BOM` bo'lishi mumkin.
* **✅ Yechimi:**
  - Python'da `charset-normalizer` yoki `chardet` kutubxonasi yordamida fayl baytlaridan kodirovkani avtomatik aniqlash.
  - Zaxira kodirovkalar kaskadi: `utf-8` $\rightarrow$ `utf-8-sig` $\rightarrow$ `windows-1251` $\rightarrow$ `latin-1`.

---

## 3. Markdown (`.md`) va Texnik Hujjatlar

### 🔴 1-Xato: Dasturlash kodlari va havolalarning buzilishi
* **Xatolik tabiati:** Texnik fayllarda kod bloklari (`print("shahar")`) yoki URL manzillar (`https://example.com/choy`) bo'ladi. Agar butun fayl to'g'ridan-to'g'ri o'tkazilsa:
  - `def show():` $\rightarrow$ `def şow():` (Python kodi ishlamay qoladi);
  - URL manzillar buzilib, havolalar ishlamaydi.
* **✅ Yechimi:**
  - Kod bloklari (` ```...``` ` va `` `inline code` ``) hamda URL larni vaqtinchalik unikal identifikatorlar (masalan `__CODE_BLOCK_0__`) bilan almashtirib (masking), qolgan matn konvertatsiya qilinadi va so'ng identifikatorlar o'z joyiga qaytariladi.

---

## 4. Xotira (Memory) va Katta Hajmdagi Fayllar

### 🔴 1-Xato: Faylni to'liq RAM ga yuklab xotirani to'ldirish
* **Xatolik tabiati:** 100-200 MB hajmdagi katta loglar yoki matnli bazalar `file.read()` orqali xotiraga olinsa, server yoki dastur qotib qolishi mumkin.
* **✅ Yechimi:**
  Generator va streaming usulida ishlash:
  ```python
  with open("katta_fayl.txt", "r", encoding="utf-8") as infile, \
       open("natija_2026.txt", "w", encoding="utf-8") as outfile:
      for line in infile:
          outfile.write(to_new_alphabet(line))
  ```

---

## Kelgusida ishlab chiqish uchun tavsiya etiladigan kutubxonalar:
- **python-docx** — Word hujjatlari uchun.
- **charset-normalizer** — Kodirovkani aniqlash uchun.
- **openpyxl** — Agar Excel fayllari kerak bo'lsa.
