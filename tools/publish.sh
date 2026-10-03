#!/bin/sh
# 초안이 아닌 게임만 빌드해 main에 반영한다. 사용: sh tools/publish.sh "커밋 메시지"
set -e
cd "$(dirname "$0")/.."
for d in games/*/; do grep -q '"draft": true' "$d/meta.json" 2>/dev/null && rm -f "$d/index.html"; done
node tools/build.js
git add -A
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A66cW7uNj2wxMn5iPgjLMy"
git checkout -q main && git merge -q --ff-only wip/new-games && git push -q origin main wip/new-games && git checkout -q wip/new-games
echo published
