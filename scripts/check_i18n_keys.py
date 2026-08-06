#!/usr/bin/env python3
"""
Scan dashboard source files for static t('...') translation keys and compare them
against the locale JSON files used by apps/dashboard/src/hooks/useLanguage.tsx.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_ROOTS = [ROOT / "apps" / "dashboard" / "src"]
DEFAULT_LOCALE_DIR = ROOT / "packages" / "server" / "src" / "locales"
SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}

STATIC_T_PATTERNS = [
    re.compile(r"\bt\s*\(\s*'((?:\\.|[^'\\])*)'"),
    re.compile(r'\bt\s*\(\s*"((?:\\.|[^"\\])*)"'),
    re.compile(r"\bt\s*\(\s*`((?:\\.|[^`\\])*)`"),
]
DYNAMIC_T_PATTERN = re.compile(r"\bt\s*\(\s*(?!['\"`])([^\n\r)]{1,140})")


@dataclass(frozen=True)
class Location:
    file: str
    line: int
    column: int

    def display(self) -> str:
        return f"{self.file}:{self.line}:{self.column}"


@dataclass(frozen=True)
class DynamicCall:
    file: str
    line: int
    column: int
    expression: str

    def display(self) -> str:
        return f"{self.file}:{self.line}:{self.column}  t({self.expression.strip()}...)"


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def line_column(text: str, index: int) -> tuple[int, int]:
    line = text.count("\n", 0, index) + 1
    line_start = text.rfind("\n", 0, index) + 1
    return line, index - line_start + 1


def unescape_key(raw: str) -> str:
    try:
        return bytes(raw, "utf-8").decode("unicode_escape")
    except UnicodeDecodeError:
        return raw


def iter_source_files(source_roots: list[Path]) -> list[Path]:
    files: list[Path] = []
    for root in source_roots:
        if root.is_file() and root.suffix in SOURCE_EXTENSIONS:
            files.append(root)
            continue
        if root.is_dir():
            files.extend(
                path
                for path in root.rglob("*")
                if path.is_file()
                and path.suffix in SOURCE_EXTENSIONS
                and "node_modules" not in path.parts
            )
    return sorted(set(files))


def scan_source_files(files: list[Path]) -> tuple[dict[str, list[Location]], list[DynamicCall]]:
    key_locations: dict[str, list[Location]] = defaultdict(list)
    dynamic_calls: list[DynamicCall] = []

    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")

        static_spans: list[tuple[int, int]] = []
        for pattern in STATIC_T_PATTERNS:
            for match in pattern.finditer(text):
                raw_key = match.group(1)
                if "${" in raw_key:
                    line, column = line_column(text, match.start())
                    dynamic_calls.append(
                        DynamicCall(rel(path), line, column, raw_key.replace("\n", " "))
                    )
                    static_spans.append(match.span())
                    continue

                key = unescape_key(raw_key).strip()
                if not key:
                    continue

                line, column = line_column(text, match.start())
                key_locations[key].append(Location(rel(path), line, column))
                static_spans.append(match.span())

        for match in DYNAMIC_T_PATTERN.finditer(text):
            if any(start <= match.start() < end for start, end in static_spans):
                continue

            expression = match.group(1).strip()
            if not expression:
                continue

            line, column = line_column(text, match.start())
            dynamic_calls.append(DynamicCall(rel(path), line, column, expression))

    return dict(sorted(key_locations.items())), dynamic_calls


def load_locale_files(locale_dir: Path, selected_locales: set[str] | None) -> dict[str, Any]:
    locales: dict[str, Any] = {}
    for path in sorted(locale_dir.glob("*.json")):
        locale_name = path.stem
        if selected_locales and locale_name not in selected_locales:
            continue
        with path.open("r", encoding="utf-8-sig") as file:
            locales[locale_name] = json.load(file)
    return locales


def get_path_value(data: Any, dotted_key: str) -> tuple[bool, Any]:
    current = data
    for part in dotted_key.split("."):
        if not isinstance(current, dict) or part not in current:
            return False, None
        current = current[part]
    return True, current


def set_nested_value(data: dict[str, Any], dotted_key: str, value: str) -> None:
    current = data
    parts = dotted_key.split(".")
    for part in parts[:-1]:
        child = current.setdefault(part, {})
        if not isinstance(child, dict):
            child = {}
            current[part] = child
        current = child
    current[parts[-1]] = value


def humanize_key(key: str) -> str:
    leaf = key.split(".")[-1]
    leaf = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", leaf)
    leaf = leaf.replace("_", " ").replace("-", " ")
    return leaf[:1].upper() + leaf[1:]


def build_missing_templates(
    missing: dict[str, dict[str, list[str]]],
    locales: dict[str, Any],
    base_locale: str,
) -> dict[str, dict[str, Any]]:
    templates: dict[str, dict[str, Any]] = {}
    base_data = locales.get(base_locale, {})

    for locale, missing_keys in missing.items():
        template: dict[str, Any] = {}
        for key in missing_keys:
            exists_in_base, base_value = get_path_value(base_data, key)
            value = base_value if exists_in_base and isinstance(base_value, str) else humanize_key(key)
            set_nested_value(template, key, value)
        templates[locale] = template

    return templates


def build_report(
    key_locations: dict[str, list[Location]],
    dynamic_calls: list[DynamicCall],
    locales: dict[str, Any],
    max_locations: int,
    base_locale: str,
) -> dict[str, Any]:
    missing: dict[str, dict[str, list[str]]] = {}
    non_string: dict[str, dict[str, list[str]]] = {}

    for locale_name, data in locales.items():
        missing[locale_name] = {}
        non_string[locale_name] = {}

        for key, locations in key_locations.items():
            exists, value = get_path_value(data, key)
            display_locations = [loc.display() for loc in locations[:max_locations]]
            if len(locations) > max_locations:
                display_locations.append(f"...and {len(locations) - max_locations} more")

            if not exists:
                missing[locale_name][key] = display_locations
            elif not isinstance(value, str):
                non_string[locale_name][key] = display_locations

    used_keys = sorted(key_locations.keys())
    missing_counts = {locale: len(keys) for locale, keys in missing.items()}
    non_string_counts = {locale: len(keys) for locale, keys in non_string.items()}

    return {
        "summary": {
            "usedStaticKeys": len(used_keys),
            "dynamicCalls": len(dynamic_calls),
            "locales": sorted(locales.keys()),
            "missingCounts": missing_counts,
            "nonStringCounts": non_string_counts,
        },
        "missing": missing,
        "nonString": non_string,
        "missingTemplates": build_missing_templates(missing, locales, base_locale),
        "dynamicCalls": [call.__dict__ for call in dynamic_calls],
    }


def print_text_report(report: dict[str, Any]) -> None:
    summary = report["summary"]
    print("i18n key scan")
    print("=" * 12)
    print(f"Static keys found: {summary['usedStaticKeys']}")
    print(f"Dynamic calls found: {summary['dynamicCalls']}")
    print(f"Locales checked: {', '.join(summary['locales'])}")
    print()

    has_missing = any(report["missing"][locale] for locale in summary["locales"])
    has_non_string = any(report["nonString"][locale] for locale in summary["locales"])

    if has_missing:
        print("Missing keys")
        print("-" * 12)
        for locale in summary["locales"]:
            keys = report["missing"][locale]
            if not keys:
                continue
            print(f"\n[{locale}] {len(keys)} missing")
            for key, locations in keys.items():
                print(f"  {key}")
                for location in locations:
                    print(f"    {location}")
    else:
        print("Missing keys: none")

    if has_non_string:
        print("\nNon-string translation values")
        print("-" * 29)
        for locale in summary["locales"]:
            keys = report["nonString"][locale]
            if not keys:
                continue
            print(f"\n[{locale}] {len(keys)} non-string")
            for key, locations in keys.items():
                print(f"  {key}")
                for location in locations:
                    print(f"    {location}")

    if report["dynamicCalls"]:
        print("\nDynamic calls to review manually")
        print("-" * 30)
        for call in report["dynamicCalls"]:
            print(
                f"  {call['file']}:{call['line']}:{call['column']}  "
                f"t({call['expression'].strip()}...)"
            )


def print_markdown_report(report: dict[str, Any]) -> None:
    summary = report["summary"]
    print("# i18n Key Scan")
    print()
    print(f"- Static keys found: `{summary['usedStaticKeys']}`")
    print(f"- Dynamic calls found: `{summary['dynamicCalls']}`")
    print(f"- Locales checked: `{', '.join(summary['locales'])}`")
    print()

    print("## Missing Keys")
    any_missing = False
    for locale in summary["locales"]:
        keys = report["missing"][locale]
        if not keys:
            continue
        any_missing = True
        print()
        print(f"### {locale} ({len(keys)})")
        for key, locations in keys.items():
            print(f"- `{key}`")
            for location in locations:
                print(f"  - `{location}`")
    if not any_missing:
        print()
        print("No missing keys found.")

    print()
    print("## Non-String Values")
    any_non_string = False
    for locale in summary["locales"]:
        keys = report["nonString"][locale]
        if not keys:
            continue
        any_non_string = True
        print()
        print(f"### {locale} ({len(keys)})")
        for key, locations in keys.items():
            print(f"- `{key}`")
            for location in locations:
                print(f"  - `{location}`")
    if not any_non_string:
        print()
        print("No non-string translation values found.")

    if report["dynamicCalls"]:
        print()
        print("## Dynamic Calls To Review")
        for call in report["dynamicCalls"]:
            print(
                f"- `{call['file']}:{call['line']}:{call['column']}` "
                f"`t({call['expression'].strip()}...)`"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find frontend t('key') calls missing from locale JSON files."
    )
    parser.add_argument(
        "--source",
        action="append",
        default=[],
        help="Source file or directory to scan. Defaults to apps/dashboard/src.",
    )
    parser.add_argument(
        "--locale-dir",
        default=str(DEFAULT_LOCALE_DIR),
        help="Directory containing locale JSON files.",
    )
    parser.add_argument(
        "--locales",
        default="",
        help="Comma-separated locale names to check, for example en,fr,ar.",
    )
    parser.add_argument(
        "--base-locale",
        default="en",
        help="Locale used for suggested values in JSON missingTemplates.",
    )
    parser.add_argument(
        "--namespace",
        action="append",
        default=[],
        help="Only report keys in this namespace, for example fees or students.form.",
    )
    parser.add_argument(
        "--format",
        choices=["text", "json", "markdown"],
        default="text",
        help="Report format.",
    )
    parser.add_argument("--out", help="Write report to a file instead of stdout.")
    parser.add_argument(
        "--max-locations",
        type=int,
        default=5,
        help="Maximum locations printed per key.",
    )
    parser.add_argument(
        "--no-fail",
        action="store_true",
        help="Always exit 0, even when missing keys are found.",
    )
    return parser.parse_args()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    args = parse_args()
    source_roots = [Path(path).resolve() for path in args.source] or DEFAULT_SOURCE_ROOTS
    locale_dir = Path(args.locale_dir).resolve()
    selected_locales = (
        {locale.strip() for locale in args.locales.split(",") if locale.strip()}
        if args.locales
        else None
    )

    source_files = iter_source_files(source_roots)
    if not source_files:
        print("No source files found.", file=sys.stderr)
        return 2

    locales = load_locale_files(locale_dir, selected_locales)
    if not locales:
        print(f"No locale JSON files found in {locale_dir}.", file=sys.stderr)
        return 2

    key_locations, dynamic_calls = scan_source_files(source_files)
    namespaces = tuple(namespace.strip() for namespace in args.namespace if namespace.strip())
    if namespaces:
        key_locations = {
            key: locations
            for key, locations in key_locations.items()
            if any(key == namespace or key.startswith(f"{namespace}.") for namespace in namespaces)
        }
        dynamic_calls = [
            call
            for call in dynamic_calls
            if any(
                call.expression == namespace or call.expression.startswith(f"{namespace}.")
                for namespace in namespaces
            )
        ]

    report = build_report(
        key_locations,
        dynamic_calls,
        locales,
        args.max_locations,
        args.base_locale,
    )

    if args.format == "json":
        output = json.dumps(report, ensure_ascii=False, indent=2)
    else:
        from io import StringIO

        buffer = StringIO()
        original_stdout = sys.stdout
        sys.stdout = buffer
        try:
            if args.format == "markdown":
                print_markdown_report(report)
            else:
                print_text_report(report)
        finally:
            sys.stdout = original_stdout
        output = buffer.getvalue()

    if args.out:
        Path(args.out).write_text(output, encoding="utf-8")
    else:
        print(output, end="" if output.endswith("\n") else "\n")

    has_missing = any(report["missing"][locale] for locale in report["summary"]["locales"])
    has_non_string = any(
        report["nonString"][locale] for locale in report["summary"]["locales"]
    )
    return 0 if args.no_fail or not (has_missing or has_non_string) else 1


if __name__ == "__main__":
    raise SystemExit(main())
