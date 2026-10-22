#!/usr/bin/env bash
# Publishes site/ to the gh-pages branch as a single orphan commit. Upload-only: it never touches main.
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE="${REMOTE:-origin}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ALLOWED='\.(html|mp4|jpg|png|txt)$|^\.nojekyll$'
cp -r site/. "$TMP/"
touch "$TMP/.nojekyll"
BAD="$(cd "$TMP" && find . -type f | sed 's|^\./||' | grep -Ev "$ALLOWED" || true)"
if [ -n "$BAD" ]; then
  echo "Refusing to publish non-allowlisted files:" >&2
  echo "$BAD" >&2
  exit 1
fi

URL="$(git remote get-url "$REMOTE")"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-publish-pages}" -c user.email="${GIT_AUTHOR_EMAIL:-publish-pages@users.noreply.github.com}" \
  commit -q -m "Publish preview site"
git push -f "$URL" gh-pages
