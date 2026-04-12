#!/usr/bin/env bash
# Ensure every image referenced by the site exists on disk.
# If run inside a git checkout, also require each image be tracked
# (prevents "works locally, 404s after clean checkout / on CI").

set -euo pipefail

if git rev-parse --show-toplevel >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
  in_git=1
else
  in_git=0
fi

refs=$(grep -rhoE 'images/[A-Za-z0-9/_.-]+\.(jpg|jpeg|png|webp|gif|svg|mp4|webm)' \
  index.html js/ css/ 2>/dev/null | sort -u || true)

if [ -z "$refs" ]; then
  echo "check-images: no image references found"
  exit 0
fi

tracked=""
[ "$in_git" = "1" ] && tracked=$(git ls-files images/)

missing_file=()
missing_git=()

while IFS= read -r ref; do
  [ -z "$ref" ] && continue
  [ -f "$ref" ] || missing_file+=("$ref")
  if [ "$in_git" = "1" ] && ! printf '%s\n' "$tracked" | grep -qxF "$ref"; then
    missing_git+=("$ref")
  fi
done <<< "$refs"

fail=0
if [ ${#missing_file[@]} -gt 0 ]; then
  echo "check-images: FAIL — referenced but file missing on disk:" >&2
  printf '  %s\n' "${missing_file[@]}" >&2
  fail=1
fi
if [ ${#missing_git[@]} -gt 0 ]; then
  echo "check-images: FAIL — referenced but not tracked in git:" >&2
  printf '  %s\n' "${missing_git[@]}" >&2
  echo "  Run: git add <path> && git commit" >&2
  fail=1
fi

[ $fail -eq 1 ] && exit 1

total=$(printf '%s\n' "$refs" | wc -l | tr -d ' ')
echo "check-images: OK ($total images, all present$([ "$in_git" = "1" ] && echo ' and tracked'))"
