"""
Yangi O'zbek Alifbosi Konvertori (1995 -> 2026 va 2026 -> 1995).

O'zbekiston Respublikasining 2026-yil 21-oktyabrdagi O'RQ-1184-sonli
"Lotin yozuviga asoslangan o'zbek alifbosini joriy etish to'g'risida"gi
Qonuniga asosan ishlab chiqilgan.

Bu modul `converter.js` bilan bir xil qoidalarni amalga oshiradi va
`tests/cases.json` dagi umumiy testlar orqali tekshiriladi.

CLI sifatida ham ishlaydi:
    python3 converter.py matn.txt                    # matn_2026.txt yaratadi
    python3 converter.py matn.txt -o yangi.txt       # aniq faylga yozadi
    python3 converter.py --direction 2026_to_1995 -  # stdin -> stdout
"""

import argparse
import codecs
import os
import re
import sys
from typing import Callable, Optional, Tuple

APOSTROPHES = "['’‘ʻʼ`´]"
STANDART_TUTUQ = "ʼ"
LETTER_CLASS = "a-zA-ZöÖğĞşŞçÇ"
LOWERCASE_LETTERS = set("abcdefghijklmnopqrstuvwxyzöğşç")

PRESERVED_WORDS = (
    "Washington",
    "Chicago",
    "Manchester",
    "Shakespeare",
    "Sherlock",
    "Bach",
    "Richter",
    "Schubert",
    "Chen",
    "Chan",
    "Zhang",
)

TOKEN_START = "\ue000"
TOKEN_END = "\ue001"
URL_RE = re.compile(r'(?:https?://|www\.)[^\s<>"\']+', re.IGNORECASE)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PRESERVED_WORD_RE = re.compile(
    r"\b(" + "|".join(re.escape(word) for word in PRESERVED_WORDS) + r")\b",
    re.IGNORECASE,
)

ENCODING_CANDIDATES = (
    "utf-8",
    "windows-1251",
    "cp1254",
    "iso-8859-9",
    "latin-1",
)

# Namuna o'lchami. IncrementalDecoder ishlatilgani uchun bu chegarada
# kesilib qolgan ko'p baytli belgi noto'g'ri aniqlashga olib kelmaydi.
SAMPLE_SIZE = 65536


def _token_marker(text: str) -> str:
    """Matnda uchramaydigan token prefiksini tanlaydi (kolliziyani oldini oladi)."""
    marker = TOKEN_START
    while marker in text:
        marker += TOKEN_START
    return marker


def mask_protected(text: str) -> Tuple[str, Callable[[str], str]]:
    """URL, email va himoyalangan so'zlarni vaqtincha tokenlar bilan almashtiradi."""
    store = []
    marker = _token_marker(text)
    token_pattern = re.compile(re.escape(marker) + r"(\d+)" + re.escape(TOKEN_END))

    def protect(match: re.Match) -> str:
        token = f"{marker}{len(store)}{TOKEN_END}"
        store.append(match.group(0))
        return token

    masked = URL_RE.sub(protect, text)
    masked = EMAIL_RE.sub(protect, masked)
    if PRESERVED_WORDS:
        masked = PRESERVED_WORD_RE.sub(protect, masked)

    def restore(value: str) -> str:
        return token_pattern.sub(lambda m: store[int(m.group(1))], value)

    return masked, restore


def _replace_og(match: re.Match) -> str:
    letter = match.group(1)
    return {"O": "Ö", "o": "ö", "G": "Ğ", "g": "ğ"}.get(letter, match.group(0))


def _replace_sh(match: re.Match) -> str:
    return "Ş" if match.group(1) == "S" else "ş"


def _replace_ch(match: re.Match) -> str:
    return "Ç" if match.group(1) == "C" else "ç"


def _has_lowercase_neighbour(source: str, index: int) -> bool:
    prev_char = source[index - 1] if index > 0 else ""
    next_char = source[index + 1] if index + 1 < len(source) else ""
    return prev_char in LOWERCASE_LETTERS or next_char in LOWERCASE_LETTERS


def to_new_alphabet(
    text: str, normalize_apostrophe: bool = True, preserve: bool = True
) -> str:
    """1995-yilgi lotin alifbosidagi matnni 2026-yilgi tahrirga o'tkazadi."""
    if not text:
        return text

    if preserve:
        masked, restore = mask_protected(text)
    else:
        masked, restore = text, lambda value: value

    res = re.sub(rf"([OGog]){APOSTROPHES}", _replace_og, masked)
    res = re.sub(r"([Ss])([Hh])", _replace_sh, res)
    res = re.sub(r"([Cc])([Hh])", _replace_ch, res)

    if normalize_apostrophe:
        res = re.sub(
            rf"(?<=[{LETTER_CLASS}]){APOSTROPHES}(?=[{LETTER_CLASS}])",
            STANDART_TUTUQ,
            res,
        )

    return restore(res)


def to_old_alphabet(text: str, preserve: bool = True) -> str:
    """2026-yilgi tahrirdagi matnni 1995-yilgi lotin alifbosiga qaytaradi."""
    if not text:
        return text

    if preserve:
        masked, restore = mask_protected(text)
    else:
        masked, restore = text, lambda value: value

    res = masked.replace("Ö", "Oʻ").replace("ö", "oʻ")
    res = res.replace("Ğ", "Gʻ").replace("ğ", "gʻ")

    def replace_sh_back(match: re.Match) -> str:
        if match.group(0) == "ş":
            return "sh"
        return "Sh" if _has_lowercase_neighbour(match.string, match.start()) else "SH"

    def replace_ch_back(match: re.Match) -> str:
        if match.group(0) == "ç":
            return "ch"
        return "Ch" if _has_lowercase_neighbour(match.string, match.start()) else "CH"

    res = re.sub(r"[Şş]", replace_sh_back, res)
    res = re.sub(r"[Çç]", replace_ch_back, res)

    return restore(res)


def convert(
    text: str,
    direction: str = "1995_to_2026",
    normalize_apostrophe: bool = True,
    preserve: bool = True,
) -> str:
    """Umumiy konvertatsiya funksiyasi."""
    if direction == "1995_to_2026":
        return to_new_alphabet(
            text, normalize_apostrophe=normalize_apostrophe, preserve=preserve
        )
    if direction == "2026_to_1995":
        return to_old_alphabet(text, preserve=preserve)
    raise ValueError(
        f"Noma'lum yo'nalish: {direction}. "
        "Faqat '1995_to_2026' yoki '2026_to_1995' bo'lishi mumkin."
    )


def _is_decodable(sample: bytes, encoding: str) -> bool:
    """Namuna shu kodirovkada o'qilishini tekshiradi.

    `IncrementalDecoder` `final=False` bilan chaqirilganda namuna oxirida
    kesilib qolgan ko'p baytli belgi xato hisoblanmaydi. Shu sababli 64KB
    chegarasiga to'g'ri kelgan UTF-8 harfi kodirovkani buzmaydi.
    """
    decoder = codecs.getincrementaldecoder(encoding)(errors="strict")
    try:
        decoder.decode(sample, final=False)
    except UnicodeDecodeError:
        return False
    return True


def detect_encoding(path: str) -> str:
    """Fayl baytlaridan kodirovkani aniqlaydi (tashqi kutubxonasiz kaskad usuli)."""
    with open(path, "rb") as handle:
        sample = handle.read(SAMPLE_SIZE)

    if sample.startswith(codecs.BOM_UTF8):
        return "utf-8-sig"

    for encoding in ENCODING_CANDIDATES:
        if _is_decodable(sample, encoding):
            return encoding

    return "latin-1"


def default_output_path(input_path: str, direction: str) -> str:
    suffix = "_2026" if direction == "1995_to_2026" else "_1995"
    stem, extension = os.path.splitext(input_path)
    return f"{stem}{suffix}{extension or '.txt'}"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="O'zbek lotin yozuvini 1995 va 2026 tahrirlari orasida o'giradi."
    )
    parser.add_argument(
        "input",
        nargs="?",
        help="Kiruvchi fayl. '-' yoki bo'sh bo'lsa stdin o'qiladi.",
    )
    parser.add_argument(
        "-o",
        "--output",
        help="Natija fayli. Bo'sh bo'lsa avtomatik nom yoki stdout.",
    )
    parser.add_argument(
        "-d",
        "--direction",
        choices=("1995_to_2026", "2026_to_1995"),
        default="1995_to_2026",
        help="Konvertatsiya yo'nalishi (default: 1995_to_2026).",
    )
    parser.add_argument(
        "-e",
        "--encoding",
        default="auto",
        help="Kiruvchi fayl kodirovkasi (default: auto).",
    )
    parser.add_argument(
        "--no-normalize-apostrophe",
        action="store_true",
        help="Tutuq belgisini ʼ (U+02BC) ga normallashtirmaslik.",
    )
    parser.add_argument(
        "--no-preserve",
        action="store_true",
        help="URL, email va himoyalangan so'zlarni maskalamaslik.",
    )
    return parser


def _cli(argv: Optional[list] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    use_stdin = args.input in (None, "-")
    if use_stdin:
        source = sys.stdin
        encoding = args.encoding if args.encoding != "auto" else "utf-8"
    else:
        if not os.path.isfile(args.input):
            parser.error(f"Fayl topilmadi: {args.input}")
        encoding = args.encoding if args.encoding != "auto" else detect_encoding(args.input)
        source = open(args.input, "r", encoding=encoding, newline="")

    output_path = args.output
    if output_path is None and not use_stdin:
        output_path = default_output_path(args.input, args.direction)

    if output_path and not use_stdin:
        if os.path.abspath(output_path) == os.path.abspath(args.input):
            parser.error("Kiruvchi va chiquvchi fayl bir xil bo'lmasligi kerak.")

    sink = (
        open(output_path, "w", encoding="utf-8", newline="")
        if output_path
        else sys.stdout
    )

    try:
        with source as infile, sink as outfile:
            for line in infile:
                outfile.write(
                    convert(
                        line,
                        direction=args.direction,
                        normalize_apostrophe=not args.no_normalize_apostrophe,
                        preserve=not args.no_preserve,
                    )
                )
    except UnicodeDecodeError as error:
        print(
            f"Kodirovka xatosi: {error}. --encoding bilan qo'lda ko'rsating.",
            file=sys.stderr,
        )
        return 1

    if output_path:
        print(f"Tayyor: {output_path} (kodirovka: {encoding})", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
