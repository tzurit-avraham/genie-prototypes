# Courseware prototype: handoff for a new conversation

> **To start a new conversation:** paste this whole file and add:
> "Read `CLAUDE.md`, `ds/DS-GUIDE.md` and `courseware/HANDOFF.md`, then let's continue."

Last updated: 2026-11-18 (end of the session that built avatar loading, chat, minimize Julia).

**Summary report for my manager:** `courseware/SUMMARY-REPORT.md` (Hebrew): all decisions, options waiting, the 56px field-height request, DS questions, DS candidates, open items. Keep it up to date when decisions change.

---

## 1. Who I am and how to work with me

- I'm a **product designer**. I work on the **flow and the UI**, not on backend or tooling. Don't involve me in servers or setup: say it in one line at most.
- I write in **Hebrew** (sometimes English). Reply in the language I write in.
- To show me a page, **open it directly in the browser**: `open courseware/index.html` (everything works from `file://`).
- Before a big change, briefly show me what you found or the mapping, then build.
- Name things by the screen and the button, not the code.
- **Ask me questions one at a time**, not a list of decisions in one message.
- Think critically and keep it simple: one prototype with everything in it, no extra pages, links or spec files for developers.

## 2. Project and rules

- Repo: `~/Documents/GitHub/genie`. The prototype: `courseware/` (`index.html`, `app.css`, `app.js`, `assets/`).
- Plain HTML/CSS/JS, no build step. Rules in `CLAUDE.md`. DS v1.0 in `ds/` (**read-only**, don't edit). Guide: `ds/DS-GUIDE.md`.
- Use only DS components and tokens (`var(--ds-*)`), icons `<ds-icon>`. Anything missing is built in `app.css`/`app.js` under a "Prototype-only … (DS candidate)" comment, and I'm told it's a DS candidate.
- **Nothing is committed yet.** All the work below is uncommitted changes in `courseware/app.css`, `app.js` and `index.html`. Git works now (the Command Line Tools were installed).

## 3. Environment quirks (important for checking in the browser)

- **A background server can't read `~/Documents`** (macOS privacy). To test in the Browser pane: copy `courseware` and `ds` to `/tmp/genie-preview`, temporarily add a `tmp-preview` entry to `.claude/launch.json` (`ruby -run -e httpd /tmp/genie-preview -p 8795`), run `preview_start`, open `/courseware/index.html?v=<time>` (to avoid caching). When done: `git checkout -- .claude/launch.json` and delete `/tmp/genie-preview`.
- Set the viewport to 1440×900 (the frame's min-width is 1440). Hide the panels with `localStorage.setItem('courseware-demo-panel-hidden','1')`.
- **Figma:** the Figma MCP doesn't connect, and this session's sandbox can't reach `api.figma.com`. What works: run `curl` / a small Python script **in my Terminal panel** (`run_in_terminal`, my own shell) with the token I give in the chat (never write it to a file). File key `d1vmhNIIExuA0rOFj9jC5f`; page "Avatar/voice mode" `9983:3827`; "❖ Components" `715:5336` (the "Avatar mode" set is `14470:53022`). Read only, never edit the Figma file. Downloads go to `/tmp/genie-figma` (may be gone after a restart).
- **No internet access to GitHub, Confluence or kaltura.atlassian.net** (git clone and WebFetch fail). I clone repos with GitHub Desktop into `~/Documents/GitHub`.
- Known console noise (not from our changes): `AbortError: play() interrupted by pause()`, and media downloads cut off on the ruby test server.

## 4. Reference repos

- `~/Documents/GitHub/moe-english-prototypes`: the **footer** reference (English Learning Module). One `index.html` with embedded base64 images; strip them before reading (`re.sub` on `data:…;base64,…`). This is where the card footer, review mode and the segmented progress came from.
- **The LXP repo is `~/Documents/GitHub/lxp-teams`** (`hillel9/lxp-teams`, cloned 2026-11-18). The avatar flow is in `demo1/lxp.html` (strip base64 before reading): intro 600 wide / up to 800 tall (Figma 44:10472), then 3:4 beside the slide; on slides she minimizes to a **64px circle centered in the footer, in place of the mic** (Figma 67:10784; the mic slides out, Chat stays on the right; face zoomed ×1.8 from 50% 16%; `tone-8` 2px ring + shadow; hover/focus `primary` ring); a click floats her up as a 200px circle at the bottom right to talk, the mic comes back, an X closes it. `moe-720-prototypes` is an empty clone.
- Confluence spec (English Learning Module) not reachable from the session.

## 5. What's built (in the order of the tabs in the panel)

Tabs (`.site-nav`, value = activity index): Quiz (0) · Reading activity (1) · Input activity (7) · Short input activity (8) · Watch a video (2) · End of milestone (5, the "fade" variant) · Lesson completed (6) · Session paused (`pause`) · Card layout (9) · Minimize Julia (`mini`, the quiz). The step order of the lesson = the tab order.

### Floating demo panel (`#demo-panel`)
- Tabs in a column, the "Image" and "Dark theme" switches, the "Mic states (T)" button. Removed from the panel at my request (2026-11-18): the "Chat states (C)" button (C still opens it), the "Card layout" tab (hidden, code kept), the "Minimize Julia" tab (hidden, code kept: the Julia states panel shows the same states) and the "End button" position control (End always stays at the bottom right; `data-end-spot` is fixed to "bottom", the "top" styles are unused). (The "Flows" and "Mic while it's off" sections were removed at my request, 2026-11-18.)
- **Screen background is fixed (2026-11-18, my request):** always `--ds-background` (white / #121212), never changes. Removed: the "Background" radios, the B key, the moving mesh (`.mesh`, `--app-mesh-*`) and the `tone-7` background lift while Julia is shrunk (`.bg-lift`).
- **Cards: no light-blue gradient (2026-11-18, my request):** `--app-card-bg` is just `--ds-elevated` (white / #333333).
- **An earlier "Background" choice (Julia’s backdrop color): tried and removed (2026-11-18, my request).** Julia’s backdrop color (cream/pink) on the cards and the mesh instead of the blue; back to the blue, and the panel control is gone.
- **Draggable from anywhere** (4px threshold; the click after a drag is swallowed), stays on screen, position remembered (`localStorage: courseware-demo-panel-spot`). Every floating panel is pulled back into the window each time it opens (fix 2026-11-18: the Julia states panel opened off screen from an old saved spot).
- The **P** key hides and shows it (by `e.code`, so it works in Hebrew too; remembered in `courseware-demo-panel-hidden`).

### Card footer (from the reference) – all DS buttons, `ds-btn-xl`
- In quiz, reading, input, short input: `← Back` (text only, no frame: secondary + `ds-btn-borderless`, like Skip; 2026-11-18, my request; disabled on the first step) · `Skip for now` (borderless) · main button (primary).
- **Quiz:** Confirm disabled until a choice. Correct: green pulse + "Correct! Excellent job!" → next step after 650ms. Wrong: red + "Not quite. Try another option or ask Julia for a hint!".
- **Input/short input:** green field + "Great answer!" → next after 500ms.
- **Reading:** Start reading → Done reading (green) → `Continue →` + `Read again` (secondary).
- **Video:** no footer ("I'm done watching" in the bottom bar).
- **End of milestone:** `← Back` + `Continue to Tell the story →` (name of the next milestone, from the reference). If steps were skipped: no celebration, "You skipped N questions" + `Continue anyway` + `Return to questions →` (to the first skipped step).
- Code: `advanceLesson(record)`, `skipStep()`, `goBack()`, `returnToSkipped()`, `skippedActivities` (Set), `showBarMessage()`.

### Review mode
- A step that was answered (`completedActivities`: Map index → `{answer}` / `{text}` / `{}`) opens **locked**: green frame, ✓ in the corner, the answer kept (quiz: chosen answer green, others dimmed; text: locked green field), footer only `← Back` + `Continue →`, bar: "Ask Julia about this question/text". Julia doesn't start again.
- Kept until refresh. The "Session paused" tab always opens fresh (`goTo(0, { fresh: true })`).

### Top progress bar
- 4 milestones; milestone 2 in progress. **The line after milestone 2 is split into 5 segments** (the tabs before "End of milestone"): blue = done, hollow = skipped. The other lines are whole. At the end of the milestone the segments disappear and the whole line fills.
- **The current step:** the old breathing animation is gone (I asked: no animation). It's marked by a **blue outline** on its segment (empty, 1px `--ds-primary`, like the milestone's blue ring); my pick, 2026-11-18. My earlier tries I rejected: a big dot in the middle, and a thick glowing segment.
- **"Progress: current step" panel (S, or the button in the main panel), 2026-11-18, my request:** 10 best-practice ways to show the student which step they're on, waiting for my pick: 1. Outlined segment (now, default) · 2. Half-filled segment · 3. Pointer under the step (CSS triangle) · 4. Step name under it ("Writing") · 5. "Step 3 of 5" · 6. "Milestone 2 · Step 3 of 5" under the milestone ring · 7. Breadcrumb "Milestone 2 › Writing" left of the bar · 8. Highlighted milestone (`primary-tint-10` band behind its segments) · 9. Numbered step pills · 10. Labels on hover (DS hint with name + state). Code: `STEP_CUES`, `STEP_LABELS` (student names: Quiz, Reading, Writing, Short answer, Video), `setStepCue` (`data-step-cue` on `<html>`, remembered in `courseware-step-cue`); CSS "Current step options" in app.css. Hidden on the pause screen.
- The **current milestone number** is regular `--ds-primary` (4.6:1 in both themes), in a blue ring.
- Accessibility: hollow rings `tone-3` (3.59:1), white fill, numbers `tone-2`; done = filled, current = empty blue ring (no center dot: I asked for the cleanest look), not started = grey ring. All three dots draw the same 2px border, so they're exactly the same size. sr-only: "Milestone 2, in progress, N of 5 activities done". Reduced motion respected.

### Session paused
- The "Session paused" tab (quiz partway) or the **End** button → pause layer: wash + 4px blur, everything inert except the progress bar and `▶ Continue lesson` (primary, breathing outline). Space resumes. Paused videos resume.
- On pause the progress bar grows (40px dots with numbers, ✓ in completed ones) and **the bar + the button are one group, centered on the screen's height** (dots 64px above the middle, button 56px below, 76px of air between them). Live region: "Lesson paused" / "Lesson resumed".


### Fields and answer cards (one family)
- **Text fields** (`.input-box`, `.cl-own-input`) and **answer cards** (`.answer`) have a **transparent fill**: they take the card's color in both themes (the DS `tone-8` fill was a black "hole" in dark). Placeholder `tone-2` (the DS `tone-3` is 3.59:1).
- **Answer cards look like the LXP** (from my screenshot): light `tone-5` hairline, 12px corners, left-aligned; the letter in a small 24px circle filled with a **5% `tone-1` layer** (`color-mix`), so it follows the surface (light: #f5f5f5 like LXP; dark: a bit lighter than the card, not a hole); letter `tone-2`.
- "Or write your own answer…" (Card layout): same hairline and 12px corners as the answer cards.
- **Heights stay on the DS: 48px** (`ds-input-xl`; quiz and Card layout answers both 48). I'd like them taller (56px) and will ask my manager: **it's item 18 in `DS-QUESTIONS.md`, include it in the summary report.**

### Eyebrows (blue labels)
- "QUIZ", "TRY IT", "Congratulations"… are `--ds-primary-brighter` in both themes (a trial I asked for). Under 4.5:1 in both (2.9:1 on white, 4.3:1 on the #333 card): no single blue passes on both white and #333.

### Mic pill (bottom bar)
- Fill `tone-6`, hover `tone-5` (the DS secondary-button fill; `tone-7` vanished in dark). The "I'm done watching" pill matches.
- **Muted = the same pill** (fill, chevron, color, clickable); only the icon changes to the crossed-out mic. **No red anywhere** (the red ring option is deleted; Figma 10081:8324 still shows red, not updated).
- Mic while it's off (the system turns it off while the student clicks/types): the same pill with a crossed-out mic. The other looks (faded, short label, hidden) and their panel options were removed.
- **Mic states panel:** the **T** key (or "Mic states (T)" in the panel) opens a floating panel with all 11 mic states, each with its use case: Joining · Mic on · Listening · Julia is getting the answer · Answer feedback · Muted by the student · Off while answering · Talking while muted · Asking for the mic · Mic blocked · Watching a video. A click shows it in the real bar (`MIC_STATES`, `toggleMicStates`).
- **Joining (2026-11-18):** while the loading look plays (`setJoining`), the mic and chat buttons get `disabled` (`setBarLocked`): the DS v1.1 disabled look (transparent, `tone-4` inset outline and icon, not clickable), both in their place. On the splash screen the chat icon now shows (disabled) instead of being hidden. They turn on when she arrives.
- **Speaking while muted:** a DS hint over the mic ("You're muted. Click the mic to talk") + a faint neutral ripple around the pill, ~3.5s; shown from the mic states panel; clicking the mic then unmutes. No red.

### Line over the mic
- **No "Talk to interrupt" anywhere: there is no such state** (my decision; removed from genie-avatar too, 2026-11-18): the line is empty while Julia talks. It still shows "Listening..." while the student talks, and the answer feedback ("Correct! Excellent job!", "Great answer!"...).

### Avatar loading (when the lesson opens) – the "Avatar loading" panel (`#join-panel`) is removed from view (2026-11-18, my request)
- **The look is fixed to 4. Mist** (the favorite) in `app.js`; the panel stays hidden in `index.html` so its code keeps working, and P no longer shows it. Everything below is kept in the code and can come back with the panel.
- **No loading in her lesson spot (2026-11-18, my request):** "Start demo" starts the lesson right away; the loading look plays only on the splash screen (Julia states → Joining). `playJoining` is no longer called from `startDemo`, and the loading panel's Replay only works on the splash. (Before: her tile showed the look for 2.6s, `JOIN_MS`, then her video started.) Code: `playJoining`, `setJoining`, `cancelJoining`, `JOIN_STYLES`, `showJoinStyle` (`data-join-style` on `<html>`, remembered in `courseware-join-style`).
- The panel (top, left of where the chat opens; draggable, P hides it with the main panel): ‹ › move between the looks and play each right away; Replay plays it again on the screen showing now.
- 30 looks. **First, the direction I asked for most recently, "the tile forms itself"** (no frame while she loads; she fades in edgeless and takes form; mask/blur/fade on her video only, `--app-feather`): 1. Becoming (default) · 2. Emerge · 3. Coalesce · 4. Mist (refined: small, faint haze; **nothing of Julia shows, not even her colors, until she is fully there** — my rule) · 5. Fairy dust (a few tiny glints twinkle and gather, she appears; subtle). Mist was closest so far. Then the earlier ones: A. Breathing glow (Figma Loading 1) · B. Rings (Figma Loading 2) · C. Blurred to sharp (default) · D. Shimmer · E. "Julia is joining…" + dots · F. Voice wave · G. Iris · H. Aurora · I. Sunrise · J. Speech bubble · K. Orbit · L. Color in · M. Curtain · and the direction I asked for (futuristic, breathing gradient, subtle): **N. Liquid gradient · O. Glass orb · P. Edge glow · Q. Hologram · R. Scan · S. Stardust · T. Prism** (`--app-join-gradient`: primary, primary-brighter and a touch of `screen-green`) · and avatar-style ones that work with Julia herself: **U. Halftone · V. Aura · W. Signal · X. Focus · Y. Halo** (`@property --app-dot / --app-focus`). Waiting for me to pick (Claude's recommendation: Liquid gradient or Edge glow). Reduced motion: each holds still.

### Loading colors from the image (2026-11-18, my request)
- 4. Mist and 5. Fairy dust take **the colors of the image about to load**, so the loading leads into her. Each `.avatar` gets `--app-image-dark / -mid / -light / -accent` (`applyAvatarPalette`, app.js). `avatarPaletteFrom(img)` measures them from `.avatar-glow` (12×12 sample, k-means into 3 colors + the most saturated one), the way the developers will in the product; from `file://` the browser blocks reading pixels, so it falls back to `AVATAR_PALETTES` in the new `data.js` (measured from the same images). Without image colors: the DS blues and teal. This replaces my earlier rule "not even her colors".

### Splash screen ("Splash screen" tab) – DS candidate
- Before the lesson: Julia loads in the middle of the screen with the look picked in "Avatar loading" (4. Mist so far) and "Joining..." under her, as in Figma (24px bold, `font-size-h3` / `line-height-h3`, new in DS v1.1, `tone-1`). Based on the Figma "Joining..." frame `10070:5974` (also in genie-avatar and agentic-revenue-enablement).
- Hidden: the card, the progress, the chat icon, the line over the mic and "Ask for a hint"; the bar keeps the mic and End. Julia stays silent; after JOIN_MS she appears in the middle, "Joining..." fades, and after 1.2s she moves to her place (FLIP, 0.7s) while the card, progress and chat icon fade in, then the quiz starts; another tab cancels it; the panel's ‹ › and Replay play the new look on the splash.
- **Intro size, as in production** (kino.kaltura.com, measured from my two screenshots of the 2560×1440 screen, 2026-11-18): **600px wide at 3:4 (up to 800 tall)**, centered; it does not grow with the screen, and in a short window it **scales down as a whole** (still 3:4, not cropped; my correction): width `min(600px, 100cqw, (100cqh − gap − text) × 3/4)` with `container-type: size` on the canvas. This matches the Figma width (600). In the lesson she is 406×541 (my call: trust the prototype), so after the intro she **shrinks** into her place (FLIP with scale; the CSS size transition is off during it). `--app-avatar-intro-w` (600px), `.splash-demo .avatar` (aspect-ratio 3/4).
- Code: `splashTab`, `setSplashDemo`, `showSplash` (app.js), `.splash-demo` on `.avatar-view`, `.splash-loading` in the quiz canvas (app.css, end of file). Not the same as `.splash`, the "Start demo" screen.

### Julia's glow (blur behind her)
- **Light only (2026-11-18, my request):** in dark the blur image is hidden (`:root[data-theme="dark"] .avatar-glow`), for a clean look. **Remind me to confirm this with the developers.**
- **Back to the original** (my request, 2026-11-18): a blurred still of her behind the frame (`<img class="avatar-glow">`, `julia-glow-pink.png` on the first screen, `julia-glow-cream.png` on the rest), as in `courseware-original/`. The primary-colored CSS glow on `.avatar::before` is off (`--app-avatar-glow-color: transparent`); `::before` stays empty because Mist and Aura draw on it. The image hides in the minimized tile and while looks 1-5 play. Its "Same-token fixes" comparison item was removed.

### Chat with Julia (text) – DS candidate
- **The chat icon sits in the bar**, 16px right of the mic (my decision; the "on Julia's tile" option and its panel section were removed).
- Either opens the chat as a **side panel** (my decision: not floating): fixed on the right, full height, 352px (`--app-chat-w`), and **the whole layout moves left** (`.chat-docked` on `.frame`: padding-right, the bottom bar's right edge moves too). With less room the cards become flexible and Julia takes her smaller (shrunk) size; minimized Julia moves left of the panel.
- Aligned with the DS: `--ds-paper` panel (the DS surface for panels), one `tone-5` divider, no corners, no shadow; header like the DS modal header (18px bold title, `tone-5` divider, X); bubbles 16px text, 12px corners (4px at the tail), 12px apart, `dir="auto"` so Hebrew reads right to left; Escape closes and focus goes back to the icon; `aside` with `aria-labelledby` (no dialog role).
- The composer is the same field as "Or write your own answer…" (ds-input-xl, tone-5 frame, 12px corners, tone-2 placeholder, send inside, disabled until there's text). Fake replies after 0.9s.
- **Bubble colors: option B (decided 2026-11-18).** Julia `primary-tint-10`, me `tone-6`, text `tone-1`, set straight on `.chat-bubble.from-julia/.from-me`. The other options, `data-bubble-style` and the "Chat bubbles" panel section were removed.
- **"View new messages"** (DS candidate, 2026-11-18): when the student has scrolled up and Julia writes, the chat doesn't jump down; a pill shows centered just above the field (`.chat-new-messages`: `elevated` surface, `shadow-floating`, `tone-1` 14px bold, 8px corners, 32px high, `chevron-down` 16). A click scrolls down and hides it; scrolling down hides it too.
- **"Julia is typing"** (DS candidate): after the student sends, Julia's bubble with three `tone-2` dots for 1.2s, then her answer (`.chat-typing`).
- **Chat states panel (C, or "Chat states (C)" in the main panel):** like the mic states panel, each state with its use case; a click opens the chat in it: Just opened · Writing · Julia is typing · Conversation · View new messages. Code: `CHAT_STATES`, `resetChat`, `#chat-states-panel`.
- Audit ideas not built yet: quick-reply chips ("Give me a hint", "Explain this word"), what happens to voice/mic while the chat is open.

### Minimize Julia (tab "Minimize Julia") – rebuilt as in the LXP (2026-11-18, my request) – DS candidate
- Source: `lxp-teams/demo1/lxp.html` (Figma 67:10784). Opens the quiz. **No "–" on Julia's tile** (removed 2026-11-18, my request: it shouldn't be there); the Julia states panel (J) drives the moves.
- **Minimized:** "–" shrinks her into a **64px circle centered in the bar, in place of the mic** (the mic slides out: `.julia-minimized` on `.avatar-view`); face zoomed ×1.8 from 50% 16%; `tone-8` 2px ring + `shadow-floating`; hover/focus: `primary` ring. The card moves to the middle. With the chat open she stays centered in the narrower bar.
- **Talking:** a click on the circle floats her up as a **200px circle at the bottom right** above the bar (3px `tone-8` ring, face ×1.3); the mic comes back (`.julia-talking`); the X takes her back to the circle.
- **The move, as in the LXP (2026-11-18):** she travels by animating her real position, size and corners (0.7s, `cubic-bezier(.2,.8,.2,1)`), so you see her fly into the mic's place, and her face zooms with it; back into the lesson she grows from the circle with an even scale (no stretching); the card slides with a FLIP (`flipAvatar`, `JULIA_MOVE`).
- **The X, as in the LXP:** one 32px badge for the page (`.mini-talk-close`, `tone-8` with a `tone-1` 16px close icon, `shadow-menu`, `tone-7` hover), fixed on the talking circle's upper right edge (155px in, 13px down), outside the circle so it is never clipped; it pops in 0.5s after she arrives.
- Replaced: the 168px "Ask Julia" tile at the top right.
- **Moves between states (2026-11-18, my request):** the panel reads where she is now (`juliaStateNow`) and plays the move to the state picked (`goToJuliaState`, `juliaStep`): Joining → Introduction (she arrives); Introduction ↔ In the lesson (she slides right and shrinks into her place / slides to the middle and grows, even scale, `lessonToIntro`); In the lesson ↔ Minimized (she flies into the mic's spot and back); Minimized ↔ Talking (floats up / back down); In the lesson ↔ Talking directly. States that aren't neighbors go step by step through the order Joining · Introduction · In the lesson · Minimized · Talking (one move every 0.75s). Joining always starts the loading over.
- **Splash centering (2026-11-18):** on the splash the mic and chat are centered as a pair (both shift left by (56+16)/2), and slide back when the lesson starts; "Joining..." sits right under the haze (`margin-top: −20%` of her tile height, via `--app-intro-live`), so the two read as one centered group.
- **Julia states panel (J, or "Julia states (J)" in the main panel):** Joining · Introduction · In the lesson · Minimized · Talking, each with a short description of its look (`JULIA_STATES`; Joining/Introduction hold that splash stage via `showSplash({ stage })`). **Which use case each state belongs to is not decided yet (my call, 2026-11-18): the panel only shows them.** Open questions for later: which activities minimize her on their own (video? reading?), whether the activity pauses while she talks, and what triggers minimizing now that the "–" is gone (the LXP has none).
- Code: `setMiniDemo`, `setMinimized`, `setTalking`, `syncMiniView`, `flipAvatar` (app.js); `.mini-demo`, `.minimized`, `.talking`, `.mini-minimize`, `.mini-restore`, `.mini-talk-close` (app.css).

### Flows: removed (2026-11-18)
- The "Flows" section of the panel (joining, mic permission, voice, muted, mic off; step player + captions) was removed at my request.
- Kept in the code but not shown anywhere (DS candidates): bar message chip (`showBarChip`), loader messages (`startThinking`). The joining tile is back as "Avatar loading" above.

### Other
- **End** button: `ds-btn-xl ds-btn-danger` with the `exit` icon. Position option in the panel (`data-end-spot`): bottom right (default) or **top right**; with End at the top right, minimized Julia goes to the bottom right (above the bar) instead of the top right. The DS has an `exit` icon that may suit it better than `clear` (not decided).
- **Card layout** tab: a layout trial from a screenshot (one big card: prompt + Julia speech bubble on the left, answers + "Or write your own answer…" on the right). The footer is the shared card footer inside the card (← Back · Skip for now · Confirm answer, enabled once an answer is chosen or sent); "‹ Go deeper ›" was removed at my request. Hides the mic bar and the top progress. The tools pill is parked (`parked/tools-pill.md`).
- `genie-avatar/` is a separate prototype (Genie screen + avatar call). **All avatar states go into courseware**, not there.

## 6. Open items

1. **Theme gaps vs. the DS (not fixed, waiting for my decision):**
   1. **Card shadow = the LXP's, copied exactly (2026-11-18, my request):** `0 12px 40px` black 6% (lxp-teams demo1 `.deck`), written with DS tokens (`space-3`, `space-10`, `b-100` at 6%). Not a DS shadow (DS candidate); barely shows in dark. Before/after: the **"LXP card shadow"** switch in the panel (off = the earlier `--ds-shadow-floating`, `.card-shadow-before` on `<html>`).
   2. The tools pill in Card layout (`b-60`) disappears in dark (1.08:1). The DS switches to `w-60` in dark.
   3. "Ask for a hint"/"Need help?" and "Watch clip" (`b-60`) don't switch in dark.
   4. Primary text in dark (eyebrow, "Congratulations") is 3.41:1 on paper. `primary-brighter` would give 5.32:1 (a DS-team decision).
   5. ~~The card's blue radial gradient~~: removed, cards are plain `--ds-elevated`. A grey card (`paper`) is out (my call). **Shine trial (2026-11-18):** panel switches "Card shine" / "Screen shine" (off by default). My first try (diagonal streaks) was "too loud and coarse"; rebuilt on dark-surface practice: light from above, a 1px lit top edge at 5% white (`--app-card-edge`) + a 2.5% white wash fading by the middle (`--app-card-shine`); the screen gets a 2% wash from the top (`.avatar-view::before`). Only shows in dark. Waiting for my verdict.
   6. Card hairline `tone-6` is 1.6:1 in dark; the DS guide recommends `tone-5`.
   7. ~~Julia's glow in dark~~: hidden in dark (to confirm with the developers).
   8. ~~The background lift layer~~: removed (the screen background is fixed).
   9. Field/answer borders use `tone-5`/`tone-6`; the DS field border is `tone-3`.
   10. Our own tints (3%, 6%, 16%) vs. DS `primary-tint-6` / `primary-tint-10`.
   11. Glows aren't in the DS (candidates).
   12. The celebration colors were tuned for light only.
   - The LXP comparison is pending the LXP repo.
2. **Save a version (commit)**: nothing committed yet.
3. End uses the `exit` icon (done in the audit session).
4. "Next lesson" has no destination.
5. **DS candidates to report:** floating panel, pause layer, card footer, review mode, segmented stepper, progress pill on pause, speech bubble, answer card, "write your own" field, tools pill, mic-off states, quiz answer option, speaking-while-muted hint + ripple, bar message chip, loader messages, avatar joining tile, a surface-relative fill token (5% `tone-1`), avatar loading look, minimized avatar tile, chat button in the bar, chat side panel + bubbles.
7. **Field heights:** taller than 48px (56px), to ask my manager (DS-QUESTIONS item 18). It's in `SUMMARY-REPORT.md` section 4.
8. **Text field component (open idea):** I asked to think of the field as a component, not a form. Options proposed: transparent (done), tinted layer (5% `tone-1`), elevated fill, filled + underline; plus always-visible labels, a full state matrix, `tone-2` placeholder.
9. The Figma token was pasted in a chat: I should revoke it in Figma.
