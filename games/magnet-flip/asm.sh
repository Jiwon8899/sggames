#!/bin/sh
cd /home/claude/sggames/games/magnet-flip
SEEDS=$(cat /tmp/claude-0/-home-claude-sggames/ec119f13-e376-5819-bb6a-b3f278d40fed/scratchpad/magnet-flip/seedtable.json 2>/dev/null || echo '[[1,2]]')
{ echo "/* 자석 뒤집기 (Magnet Flip) — 나는 자석! 탭 한 번으로 N/S 극을 뒤집어 고물상을 건넌다."
  echo "   시뮬레이션(고정 스텝·결정적)은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */"
  echo "(function(){"; echo "  'use strict';"
  cat core.part.js
  echo "  var HPAR=[1,1,2,1,3,1,2,2,2,4],SEEDS=$SEEDS;"
  cat render.part.js; echo "})();"; } > game.js
node -e "const C=require('./game.js');console.log(Object.keys(C).length)"
