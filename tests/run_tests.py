#!/usr/bin/env python3
"""converter.py ni tests/cases.json dagi umumiy testlar bilan tekshiradi."""

import codecs
import json
import sys
import tempfile
from pathlib import Path
from typing import List, Tuple

TESTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TESTS_DIR.parent))

from converter import convert, detect_encoding  # noqa: E402

EncodingCase = Tuple[str, bytes, str]


def encoding_cases() -> List[EncodingCase]:
    """Kodirovka aniqlash uchun chegara holatlari."""
    return [
        (
            "utf-8 (64KB chegarasida kesilgan harf)",
            b"a" * (65536 - 1) + "ö".encode("utf-8") + b"tail",
            "utf-8",
        ),
        ("utf-8 BOM", codecs.BOM_UTF8 + "şahar".encode("utf-8"), "utf-8-sig"),
        ("windows-1251", "Привет".encode("cp1251"), "windows-1251"),
        ("qisqa utf-8 fayl", "çoy".encode("utf-8"), "utf-8"),
    ]


def check_encoding_detection() -> Tuple[int, List[Tuple[str, str, str]]]:
    """detect_encoding ni tekshiradi: (testlar soni, xatolar) qaytaradi."""
    cases = encoding_cases()
    failures: List[Tuple[str, str, str]] = []

    for name, data, expected in cases:
        handle = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
        try:
            handle.write(data)
            handle.close()
            actual = detect_encoding(handle.name)
        finally:
            Path(handle.name).unlink(missing_ok=True)

        if actual != expected:
            failures.append((name, expected, actual))

    return len(cases), failures


def main() -> int:
    cases = json.loads((TESTS_DIR / "cases.json").read_text(encoding="utf-8"))["cases"]

    passed = 0
    failures = []

    for test_case in cases:
        actual = convert(test_case["input"], test_case["direction"])
        if actual == test_case["expected"]:
            passed += 1
        else:
            failures.append((test_case, actual))

    for test_case, actual in failures:
        print(f"FAIL [{test_case['direction']}] {test_case['note']}", file=sys.stderr)
        print(f"  input:    {test_case['input']!r}", file=sys.stderr)
        print(f"  expected: {test_case['expected']!r}", file=sys.stderr)
        print(f"  actual:   {actual!r}", file=sys.stderr)

    encoding_total, encoding_failures = check_encoding_detection()
    for name, expected, actual in encoding_failures:
        print(f"FAIL [encoding] {name}", file=sys.stderr)
        print(f"  expected: {expected!r}", file=sys.stderr)
        print(f"  actual:   {actual!r}", file=sys.stderr)

    print(f"\nconverter.py: {passed}/{len(cases)} passed")
    print(
        f"encoding: {encoding_total - len(encoding_failures)}/{encoding_total} passed"
    )
    return 0 if not failures and not encoding_failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
