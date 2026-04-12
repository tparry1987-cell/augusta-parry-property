#!/usr/bin/env bash
# Fail if any image referenced in index.html or js/*.js is missing from git.
# Runs from repo root.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

refs=$(grep -rhoE 'images/[A-Za-z0-9/_.-]+\.(jpg|jpeg|png|webp|gif|svg|mp4|webm)' \
  index.html js/ css/ 2>/dev/null | sort -u || true)

if [ -z "$refs" ]; then
  echo "check-images: no image references found"
  exit 0
fi

tracked=$(git ls-files images/)
missing=()

while IFS= read -r ref; do
  [ -z "$ref" ] && continue
  if ! printf '%s\n' "$tracked" | grep -qxF "$ref"; then
    missing+=("$ref")
  fi
done <<< "$refs"

if [ ${#missing[@]} -gt 0 ]; then
  echo "check-images: FAIL — referenced but not tracked in git:" >&2
  printf '  %s\n' "${missing[@]}" >&2
  echo >&2
  echo "Run: git add <path> && git commit" >&2
  exit 1
fi

echo "check-images: OK ($(printf '%s\n' "$refs" | wc -l | tr -d ' ') images, all tracked)"
