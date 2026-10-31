#!/usr/bin/env python3
"""Extract the exported symbols of a TypeScript module, one per line.

Prints `symbol<TAB>declaration` where `declaration` is the normalised
declaration text (kind, generics and parameter list, whitespace stripped).

Multi-line declarations are joined: a declaration ends at the first
`;` or at the `{` that opens a body, whichever comes first. That is what
makes `export function isLyingEnvelope<S extends StandardSkillResponse>(
  response: S | undefined | null,
): boolean {` come out as one entry rather than three fragments.

Used by scripts/ci/check-downstream-conformance.sh to compare a
downstream's copy of src/api/envelope.ts against the canonical
signatures recorded in the baseline. See docs/DOWNSTREAM_CONFORMANCE.md.

Usage:
    envelope-decls.py <path-to-module.ts>
    envelope-decls.py -   # read stdin

Exit codes: 0 = ok, 1 = usage error, 2 = file not found.
"""

from __future__ import annotations

import re
import sys

# `export` followed by a declaration keyword and a symbol name. The
# optional generic parameter list is captured separately so we can tell
# `isLyingEnvelope` from `isLyingEnvelope<T>`.
DECL_RE = re.compile(
    r"^export\s+"
    r"(?P<kind>interface|function|const|class|type|enum)\s+"
    r"(?P<name>[A-Za-z_$][A-Za-z0-9_$]*)"
    r"(?P<generics><[^>]*>)?",
    re.MULTILINE,
)

# A declaration body starts at the first `{` that is not part of a type
# literal — see _find_body_start.
BODY_END_RE = re.compile(r"[;{]")


def normalise(text: str) -> str:
    """Collapse whitespace and drop the export keyword.

    `export function isLyingEnvelope<T>(env: ApiEnvelope<T>): boolean`
    becomes `function isLyingEnvelope<T>(env:ApiEnvelope<T>):boolean`.

    The point is to compare SHAPE, not formatting: two copies of the same
    contract differ only in whitespace and line breaks.
    """
    text = re.sub(r"^export\s+", "", text.strip())
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*([<>()\[\],:|=])\s*", r"\1", text)
    text = re.sub(r"\s*\{\s*$", "", text)
    return text.strip()


def _find_body_start(source: str, start: int) -> int:
    """Return the index of the `{` that opens a declaration BODY.

    A `{` at paren-depth 0 after the parameter list may instead be a
    return-type object literal — e.g.
        function unwrapEnvelope<T>(raw: unknown): { data: T; lying?: boolean } {
    The literal closes with its own `}`, and the body `{` follows it. So
    walk forward: take the first top-level `{`, find its matching `}`, and
    if a `{` follows, that first one was a type literal and the body is
    the next one.
    """
    depth_paren = 0
    i = start
    while i < len(source):
        ch = source[i]
        if ch in "(<":
            depth_paren += 1
        elif ch in ")>":
            depth_paren -= 1
        elif ch == "{" and depth_paren <= 0:
            # Candidate. Find its matching close.
            level = 0
            j = i
            while j < len(source):
                if source[j] == "{":
                    level += 1
                elif source[j] == "}":
                    level -= 1
                    if level == 0:
                        break
                j += 1
            # If another `{` follows the literal's close, this was a type.
            k = j + 1
            while k < len(source) and source[k] in " \t\r\n":
                k += 1
            if k < len(source) and source[k] == "{":
                i = k
                continue
            return i
        i += 1
    return -1


def extract(source: str) -> list[tuple[str, str]]:
    """Return [(symbol, normalised declaration)] for each exported symbol."""
    out: list[tuple[str, str]] = []
    for match in DECL_RE.finditer(source):
        kind = match.group("kind")
        name = match.group("name")
        generics = match.group("generics") or ""

        body = _find_body_start(source, match.end())
        if body == -1:
            raw = source[match.start():]
        else:
            raw = source[match.start():body]

        symbol = f"{name}{generics}"
        out.append((symbol, normalise(raw)))
    return out


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 1
    path = argv[1]
    try:
        if path == "-":
            source = sys.stdin.read()
        else:
            with open(path, encoding="utf-8") as handle:
                source = handle.read()
    except OSError as exc:
        print(f"::error::cannot read {path}: {exc}", file=sys.stderr)
        return 2

    for symbol, decl in extract(source):
        print(f"{symbol}\t{decl}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
