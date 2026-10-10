#!/bin/bash
set -eo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Merge origin/main into prod and push"

BUILD=/tmp/goapi_merge_prod
git fetch origin main prod

git worktree prune
git worktree remove --force "$BUILD" 2>/dev/null || true
rm -rf "$BUILD"
git worktree add --detach "$BUILD" origin/prod

git -C "$BUILD" merge origin/main -m "merge main into prod"
git -C "$BUILD" push origin HEAD:prod

git worktree remove --force "$BUILD"

echo "Done. prod is updated on origin (includes merge of main)."
    