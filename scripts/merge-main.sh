#!/bin/bash
set -eo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRANCH=$(git branch --show-current)
if [[ -z "$BRANCH" ]]; then
  echo "Not on a branch (detached HEAD). Check out a branch first." >&2
  exit 1
fi
if [[ "$BRANCH" == "main" ]]; then
  echo "Already on main. Check out the branch you want to merge, then run this script." >&2
  exit 1
fi

echo "Merge branch $BRANCH into main and push"

BUILD=/tmp/goapi_merge_main
git fetch origin main

git worktree prune
git worktree remove --force "$BUILD" 2>/dev/null || true
rm -rf "$BUILD"
git worktree add --detach "$BUILD" origin/main

git -C "$BUILD" merge "$BRANCH" -m "merge $BRANCH into main"
git -C "$BUILD" push origin HEAD:main

git worktree remove --force "$BUILD"

echo "Done. main is updated on origin (includes merge of $BRANCH)."
