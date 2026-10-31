#!/usr/bin/env bash
# check-downstream-conformance.sh — §8 ratchet over the registered downstream repos.
#
# §8 ("What *not* to do") is a contract, and nothing checked it: every rule
# was broken by a downstream and no mechanism noticed. This is that mechanism.
#
# Spec (docs/DOWNSTREAM_CONFORMANCE.md):
#   * Per-metric. One metric regressing fails the check; the rest are still
#     reported so the fix is one named delta rather than a hunt.
#   * TWO DIRECTIONS, because §8 cuts both ways:
#       - "drift" metrics (violations present) may only DECREASE. A downstream
#         that gains a new violation fails.
#       - "adoption" metrics (canonical surface adopted) may only INCREASE. A
#         downstream that stops mirroring the canonical stdlib fails.
#   * The baseline is the only reviewable escape hatch. Raising a violation
#     count, or lowering an adoption count, needs an explicit baseline edit
#     AND a `_note` ledger entry saying why. Same shape as the
#     linux-desktop-seed surface ratchet (scripts/ci/surface-budget-baseline.json).
#
# Why it runs IN the downstream rather than only in the starter:
#   the starter and its consumers are separate private repos, and the starter
#   has no PAT with which to read them. So the starter ships the canonical
#   script + baseline, and each consumer MIRRORS them (the same way it already
#   mirrors src/api/envelope.ts, vite.config.ts and .pre-commit-config.yaml)
#   and runs this against ITSELF.
#
# The canonical stdlib signatures live IN the baseline, not in a copied file:
# the baseline is the reviewable contract, and a consumer that mirrors it gets
# the contract without needing the starter's source tree.
#
# Usage:
#   check-downstream-conformance.sh --self [--baseline <path>]
#   check-downstream-conformance.sh --repo <path> [--name <org/repo>] [--baseline <path>]
#   check-downstream-conformance.sh --update-baseline --note "<why>"
#
# Exit codes: 0 = conformant (or baseline updated), 1 = regression, 2 = usage error.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE="${ROOT}/scripts/ci/downstream-conformance-baseline.json"

REPO_PATH=""
REPO_NAME=""
UPDATE_BASELINE=0
NOTE=""

die() { printf '::error::%s\n' "$*" >&2; exit 2; }
info() { printf '%s\n' "$*"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)            REPO_PATH="${2:-}"; shift 2 ;;
    --name)            REPO_NAME="${2:-}"; shift 2 ;;
    --baseline)        BASELINE="${2:-}"; shift 2 ;;
    --note)            NOTE="${2:-}"; shift 2 ;;
    --update-baseline) UPDATE_BASELINE=1; shift ;;
    --self)            REPO_PATH="${ROOT}"; shift ;;
    -h|--help)         sed -n '2,45p' "$0"; exit 0 ;;
    *)                 die "unknown argument: $1" ;;
  esac
done

[ -n "${REPO_PATH}" ] || die "--repo <path> (or --self) is required"
[ -d "${REPO_PATH}" ] || die "not a directory: ${REPO_PATH}"
[ -f "${BASELINE}" ]  || die "baseline not found: ${BASELINE}"

jget() { jq -r "$2" "$1" 2>/dev/null; }

# ── helpers ───────────────────────────────────────────────────────────────────

plain_version() { printf '%s' "$1" | sed -E 's/^[^0-9]*//'; }

# version_lt A B -> true when A < B (semver-ish, via sort -V).
version_lt() {
  local a b
  a="$(plain_version "$1")"; b="$(plain_version "$2")"
  [ "$a" = "$b" ] && return 1
  [ "$(printf '%s\n%s\n' "$a" "$b" | sort -V | head -1)" = "$a" ]
}

# ── repo under check ─────────────────────────────────────────────────────────

pkg="${REPO_PATH}/package.json"
[ -f "${pkg}" ] || die "no package.json in ${REPO_PATH}"

if [ -z "${REPO_NAME}" ]; then
  REPO_NAME="$(git -C "${REPO_PATH}" remote get-url origin 2>/dev/null \
    | sed -E 's#^(git@github\.com:|https://github\.com/)##; s#\.git$##' \
    | head -1)"
  REPO_NAME="${REPO_NAME:-unknown/unknown}"
fi

floors_json="$(jget "${BASELINE}" '.starter_floors')"
[ -n "${floors_json}" ] && [ "${floors_json}" != "null" ] \
  || die "baseline has no .starter_floors"

canonical_json="$(jget "${BASELINE}" '.starter_canonical_stdlib_exports')"
[ -n "${canonical_json}" ] && [ "${canonical_json}" != "null" ] \
  || die "baseline has no .starter_canonical_stdlib_exports"

sigs_json="$(jget "${BASELINE}" '.starter_canonical_stdlib_signatures')"
[ -n "${sigs_json}" ] && [ "${sigs_json}" != "null" ] \
  || die "baseline has no .starter_canonical_stdlib_signatures"

# ── current metrics ──────────────────────────────────────────────────────────

# --- deps_below_floor (drift) ---
deps_below=0
deps_detail=""
for dep in $(jget "${BASELINE}" '.starter_floors | keys_unsorted[]'); do
  floor="$(jget "${BASELINE}" ".starter_floors[\"${dep}\"]")"
  have="$(jq -r --arg d "${dep}" \
    '.dependencies[$d] // .devDependencies[$d] // empty' "${pkg}" 2>/dev/null)"
  [ -n "${have}" ] || continue
  if version_lt "${have}" "${floor}"; then
    deps_below=$((deps_below + 1))
    deps_detail="${deps_detail} ${dep}(${have}<${floor})"
  fi
done

# --- missing_required_files (drift) ---
missing_required=0
missing_detail=""
for f in $(jget "${BASELINE}" '.required_ci_surfaces | keys_unsorted[]'); do
  if [ ! -e "${REPO_PATH}/${f}" ]; then
    missing_required=$((missing_required + 1))
    missing_detail="${missing_detail} ${f}"
  fi
done

# --- forbidden_files (drift) ---
# Tracked-ness, not filesystem presence: §8 is about what gets COMMITTED.
# A stale local leftover that is gitignored is not a violation.
forbidden_present=0
forbidden_detail=""
for f in $(jget "${BASELINE}" '.forbidden_files | keys_unsorted[]'); do
  if git -C "${REPO_PATH}" ls-files --error-unmatch -- "${f}" >/dev/null 2>&1; then
    forbidden_present=$((forbidden_present + 1))
    forbidden_detail="${forbidden_detail} ${f}"
  fi
done

# --- npm_package_manager (drift) ---
npm_pm=0
pm="$(jq -r '.packageManager // empty' "${pkg}" 2>/dev/null)"
if printf '%s' "${pm}" | grep -q '^npm@'; then
  npm_pm=1
fi

# --- cloudflare_workers_types (drift) ---
workers_types=0
if jq -e '(.devDependencies // {})["@cloudflare/workers-types"] != null' "${pkg}" >/dev/null 2>&1; then
  workers_types=1
fi

# --- starter_aliases_redefined (drift) ---
# §8: "Don't redefine STARTER_ALIASES. Do extend them." A local
# declaration is a redefinition. The starter is the definition site, so it
# is never counted.
aliases_redefined=0
if [ "${REPO_NAME}" != "DarojaAI/daroja-frontend-starter" ]; then
  if grep -qE '^[[:space:]]*(export[[:space:]]+)?const[[:space:]]+STARTER_ALIASES' \
       "${REPO_PATH}/vite.config.ts" 2>/dev/null; then
    aliases_redefined=1
  fi
fi

# --- stdlib_adoption (adoption) + stdlib_unknown_exports (drift) ---
# adoption = how many of the canonical PROVENANCE-stdlib exports the consumer
#            has. The starter's canonical provenance surface is
#            ApiEnvelope + isLyingApiEnvelope + unwrapEnvelope.
# unknown  = exports the consumer has that the starter does not have at all,
#            i.e. it invented a third shape.
adoption=0
unknown=0
unknown_detail=""
consumer_decls=""
if [ -f "${REPO_PATH}/src/api/envelope.ts" ]; then
  # The Python parser joins multi-line declarations; a grep cannot.
  consumer_decls="$("${SCRIPT_DIR}/lib/envelope-decls.py" \
                      "${REPO_PATH}/src/api/envelope.ts" 2>/dev/null)"
  while IFS="$(printf '\t')" read -r sym decl; do
    [ -n "${sym}" ] || continue
    # Key on the BASE name: `isLyingEnvelope` and `isLyingEnvelope<T>` are
    # the same symbol, and a generic-parameter difference is part of the
    # declaration (so it shows up as signature divergence, not as an
    # unknown export).
    base="${sym%%<*}"
    if printf '%s' "${canonical_json}" | jq -e --arg s "${base}" 'index($s) != null' >/dev/null 2>&1; then
      adoption=$((adoption + 1))
    elif printf '%s' "${sigs_json}" | jq -e --arg s "${base}" 'has($s)' >/dev/null 2>&1; then
      : # a known starter export, just not part of the canonical provenance set
    else
      unknown=$((unknown + 1))
      unknown_detail="${unknown_detail} ${sym}"
    fi
  done <<< "${consumer_decls}"
fi

# --- stdlib_signature_divergent (drift) ---
# Same symbol name, DIFFERENT declaration = a forked shape.
#
# This is the metric that actually catches the fork, because all three
# copies reuse the name `isLyingEnvelope`:
#   starter          isLyingEnvelope(envelope: Envelope)
#   console          isLyingEnvelope<T>(env: ApiEnvelope<T>)
#   dev-nexus-front  isLyingEnvelope<S extends StandardSkillResponse>(...)
# A name-only comparison sees "isLyingEnvelope present" in all three and
# reports nothing. Comparing the normalised declaration sees three
# different contracts sharing one name.
divergent=0
divergent_detail=""
while IFS="$(printf '\t')" read -r sym decl; do
  [ -n "${sym}" ] || continue
  base="${sym%%<*}"
  want="$(printf '%s' "${sigs_json}" | jq -r --arg s "${base}" '.[$s] // empty')"
  [ -n "${want}" ] || continue
  if [ "${decl}" != "${want}" ]; then
    divergent=$((divergent + 1))
    divergent_detail="${divergent_detail} ${sym}"
  fi
done <<< "${consumer_decls}"

# ── baseline update mode ─────────────────────────────────────────────────────

if [ "${UPDATE_BASELINE}" -eq 1 ]; then
  [ -n "${NOTE}" ] || die "--update-baseline requires --note \"<why>\""
  tmp="$(mktemp)"
  jq --arg name "${REPO_NAME}" --arg note "${NOTE}" \
     --argjson deps "${deps_below}" \
     --argjson missing "${missing_required}" \
     --argjson forbidden "${forbidden_present}" \
     --argjson npmpm "${npm_pm}" \
     --argjson wt "${workers_types}" \
     --argjson aliases "${aliases_redefined}" \
     --argjson adopt "${adoption}" \
     --argjson unk "${unknown}" \
     --argjson div "${divergent}" \
     '.consumers[$name] = {
        deps_below_floor: $deps,
        missing_required_files: $missing,
        forbidden_files: $forbidden,
        npm_package_manager: $npmpm,
        cloudflare_workers_types: $wt,
        starter_aliases_redefined: $aliases,
        stdlib_adoption: $adopt,
        stdlib_unknown_exports: $unk,
        stdlib_signature_divergent: $div
      }
      | .["_note"] = ((.["_note"] // "") + " | " + $name + ": " + $note)' \
     "${BASELINE}" > "${tmp}" && mv "${tmp}" "${BASELINE}"
  info "[downstream-conformance] baseline updated for ${REPO_NAME}: ${NOTE}"
  exit 0
fi

# ── compare against the baseline ──────────────────────────────────────────────

consumers_json="$(jget "${BASELINE}" '.consumers')"
[ -n "${consumers_json}" ] && [ "${consumers_json}" != "null" ] \
  || die "baseline has no .consumers registry"

if [ "$(jget "${BASELINE}" ".consumers[\"${REPO_NAME}\"]")" = "null" ]; then
  die "no baseline entry for ${REPO_NAME}. The registry is the reviewable escape hatch: add an entry to ${BASELINE}."
fi

fail=0
report() { # metric direction current baseline detail
  local metric="$1" dir="$2" cur="$3" was="$4" detail="${5:-}"
  local delta status
  delta=$((cur - was))
  if [ "${dir}" = "down" ]; then
    if [ "${cur}" -le "${was}" ]; then status="OK"; else status="REGRESSION"; fail=1; fi
  else
    if [ "${cur}" -ge "${was}" ]; then status="OK"; else status="REGRESSION"; fail=1; fi
  fi
  if [ "${status}" = "REGRESSION" ]; then
    printf '%s: %s -> %s (%+d) %s%s\n' "${metric}" "${was}" "${cur}" "${delta}" "${status}" "${detail:+ [${detail}]}"
  else
    printf '%s: %s -> %s (%+d) %s\n' "${metric}" "${was}" "${cur}" "${delta}" "${status}"
  fi
}

base() { jget "${BASELINE}" ".consumers[\"${REPO_NAME}\"][\"$1\"]"; }

report deps_below_floor           down "${deps_below}"       "$(base deps_below_floor)"       "${deps_detail}"
report missing_required_files    down "${missing_required}"  "$(base missing_required_files)" "${missing_detail}"
report forbidden_files            down "${forbidden_present}" "$(base forbidden_files)"       "${forbidden_detail}"
report npm_package_manager        down "${npm_pm}"           "$(base npm_package_manager)"
report cloudflare_workers_types   down "${workers_types}"    "$(base cloudflare_workers_types)"
report starter_aliases_redefined  down "${aliases_redefined}" "$(base starter_aliases_redefined)"
report stdlib_unknown_exports     down "${unknown}"          "$(base stdlib_unknown_exports)" "${unknown_detail}"
report stdlib_signature_divergent down "${divergent}"        "$(base stdlib_signature_divergent)" "${divergent_detail}"
report stdlib_adoption            up   "${adoption}"         "$(base stdlib_adoption)"

if [ "${fail}" -ne 0 ]; then
  printf '::error::downstream conformance regression for %s — §8 is a contract (docs/DOWNSTREAM_CONFORMANCE.md). Drift metrics may only decrease and adoption metrics may only increase. If the change is intentional, update the baseline with --update-baseline --note "<why>"; the baseline is the only reviewable escape hatch.\n' "${REPO_NAME}" >&2
  exit 1
fi

info "[downstream-conformance] OK: ${REPO_NAME} conforms to §8"
