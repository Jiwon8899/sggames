# SG Games — brief for building one game

You build ONE original, idea-driven HTML5 mini game in /home/claude/sggames. Other agents work in parallel on other games: ONLY create/edit files inside `games/<your-slug>/`. Never edit assets/, tools/, or other games. Never git commit or push.

## Bar
The owner rejected familiar-genre games (runner, brick breaker, snake) as too simple and approved these four as the standard: games/echo-maze, games/ghost-coop, games/shadow-match, games/one-stroke. Your game must be built around ONE clever idea the player has not seen before, teach itself in 5 seconds, and feel great. Spend effort on the core idea and its feel, not on feature count. Not achievable: "AAA". Target: a polished indie web game.

## Read first
assets/sg.js (shared shell), games/one-stroke/game.js or games/shadow-match/game.js (reference for quality), games/cucumber-cat/meta.json (metadata shape), tools/check.js (automated test).

## Files
1. `games/<slug>/game.js` — one IIFE calling `SG.run({id:'<slug>', title:{ko,en}, how:{ko,en}, init(a), update(dt,inp,a), draw(g,a)})`.
   - Canvas is 360x640 logical, portrait, phone-first.
   - `a`: W, H, lang ('ko'|'en'), add(n) score, over() ends the run, sfx('coin'|'hit'|'jump'|'win'|'tap'), beep(freq,dur,type), burst(x,y,color,n), pop(x,y,text,color), shake(v), tempo(1..1.6).
   - `inp`: x,y (pointer position in canvas coords, tracked while the pointer is down; null while the keyboard is in use), down (pointer held), tap (pressed this frame), left/right/up/dn (held keys), swipe ('left'|'right'|'up'|'down'|null for exactly one frame, on touch swipe release or on an arrow/WASD keypress).
   - The shell maps Space AND ArrowUp/W to inp.up + inp.tap. If you must tell them apart, add your own window keydown/keyup listeners in game.js using e.code (register once; guard with a window flag).
   - init() runs on every start/restart and must fully reset state. draw() is called in every state (before start, during play, after game over).
   - The shell provides background music, the score HUD (top), start and game-over overlays, and a mute button occupying the bottom-right 46x46 px corner — keep your UI and goals out of that corner and away from the top 30px HUD strip.
2. `games/<slug>/meta.json` — { "date": "2026-10-03", "emoji", "title":{ko,en}, "tagline":{ko,en}, "desc":{ko,en}, "controls":{ko,en}, "tips":{ko,en}, "tags":[4-6 lowercase English itch.io tags] }. desc+controls+tips: at least 3 real sentences per language, specific to this game, natural Korean and natural English.

## Hard requirements
- Fully playable touch-only (phone) AND keyboard-only (desktop).
- No external images, fonts, libraries, or network requests; draw with canvas shapes.
- Original characters and names only; no real people, brands, or existing game characters. No gore, gambling, or adult themes.
- Canvas text uses `'<size>px Jua, system-ui, sans-serif'` and is bilingual via a.lang. First level shows one line of hint text.
- The run MUST reach a.over() within 60 seconds of idle play or random tapping (use a global countdown that successes extend, with a cap). The automated test taps 8 times then idles.
- Visual polish: gradient background with at least 2 gently moving layers; a character/mascot with eyes that blinks and reacts; shading and shadows; every success/failure has sound plus burst or pop; smooth on phones.
- Puzzle content must be verified solvable: factor logic so it runs headless and write a scratch node script (outside the repo, or delete it afterwards) that proves every handcrafted level / generated puzzle has a solution, and that trivial non-solutions fail.

## Verify
From /home/claude/sggames: `DRAFTS=1 node tools/build.js` then `node tools/check.js <slug>` must print PASS. If another agent's unfinished folder breaks the build, wait 20s and retry; never touch their files.
Also write a temporary Playwright script (copy the static-server + chromium launch pattern from tools/check.js; `require('playwright')` resolves when the script sits in /home/claude/sggames/tools/ — delete it afterwards) that really plays the game with keyboard or mouse, and capture mid-play screenshots. Read them and judge honestly whether the idea reads at a glance and looks good; iterate until it does. Save ONE representative mid-play screenshot of just the #stage element as `shots/play-<slug>.png`.

## Final report (short, honest)
check PASS/FAIL; what you verified and how; what you did not verify; known weaknesses.
