# Courseware prototype with an avatar: summary report

**Date:** November 18, 2026
**What it is:** a prototype of an English lesson with Julia, an avatar teacher who talks with the student. Built in plain HTML, CSS and JS on Kaltura's design system (DS v1.0). It opens directly in the browser (`courseware/index.html`).
**Sources:** all the sessions on the prototype (editing the flow, the Figma connection, the design audit and today's session), the HANDOFF file and the audit.
**Status:** all the work is in the files, but it hasn't been saved as a version in git (no commit yet).

---

## 1. Principles we worked by

- **DS components and tokens only.** No hardcoded colors, spacing or font sizes, and no pasted icons. Whatever the DS lacks, we built in the prototype from DS tokens and marked it as a "DS candidate".
- **The same token in light and dark.** Dark mode is only a different set of values for the same tokens. A token is never swapped by theme.
- **Accessibility:** WCAG contrast, no state shown by color alone, screen reader support, and support for the "reduce motion" setting.
- **Simplicity:** one prototype that holds everything, with no extra pages or documents.

---

## 2. Decisions made

### Lesson structure and footer
- **One footer in every step** (following the English Learning module): `← Back` on the left, `Skip for now` and a primary button on the right. All DS buttons are xl (48px).
- **Quiz:** "Confirm answer" is disabled until an answer is picked. Correct answer: a green pulse and "Correct! Excellent job!", then it moves on to the next step by itself. Wrong answer: red, and a hint to ask Julia for help.
- **Writing activities:** a green field and "Great answer!", then on to the next step.
- **Reading:** "Start reading", then "Done reading" (primary button with ✓), then "Continue" and "Read again".
- **End of a milestone:** a button with the next milestone's name ("Continue to Tell the story"). If questions were skipped, there is no celebration. Instead: "You skipped N questions" and two buttons, "Continue anyway" and "Return to questions".
- **Review mode:** a step that was already answered opens locked, with a green border, the saved answer, and only `Back` + `Continue`. Julia doesn't start talking again.

### Progress bar
- 4 milestones. The current milestone's line is split into one segment per step: solid blue = done, hollow = skipped.
- **The current step has a blue outline**, with no animation.
- **The circles:** all exactly the same size. Done = filled, current = empty blue ring (no dot, for a clean look), not started = grey ring. Accessibility: the position and the split line mark the current step without color, and the screen reader gets hidden text ("Milestone 2, in progress").

### Session paused
- The End button or the "Session paused" tab shows a light layer (80% of the page color) with blur. The whole screen is locked except the progress bar and "▶ Continue lesson".
- The progress bar grows (40px circles with numbers, ✓ on completed steps), and it is centered with the button on the screen.
- **End button:** the DS danger button with the `exit` icon. **It always stays at the bottom right** (decided today; the top-right option was removed).

### Fields and answer cards (one family)
- Transparent background, so the field takes the card's color in both themes. The DS `tone-8` fill made a black "hole" in dark.
- Answer cards look like the LXP: a subtle `tone-5` border, 12px corners, left-aligned text, and the letter in a small circle.
- Placeholder in `tone-2` (4.95:1) instead of the DS `tone-3` (3.59:1), which fails accessibility.
- Height 48px, per the DS (see the request in section 4).

### Mic and bottom bar
- A grey mic pill (`tone-6`). **Muted keeps the same pill**; only the icon changes to the crossed-out mic. No red anywhere.
- **Mic states panel (T shortcut, or the "Mic states (T)" button):** all 11 mic states, each with its use case. Clicking one shows it on the bar.
- **Joining (new today):** while Julia loads (the splash screen and the start of the lesson), the mic and chat buttons stay in their place but are disabled, in the DS v1.1 disabled look (no fill, grey outline and icon). They turn on as she arrives.
- **Talking while muted:** a DS tooltip ("You're muted. Click the mic to talk") and a soft ripple around the pill, for about 3.5 seconds. Clicking the mic unmutes.
- **"Talk to interrupt" was removed: there is no such state** (in the lesson and in the Genie avatar call). The line over the mic shows only "Listening..." while the student talks, and feedback after an answer.

### Splash screen (new state)
- Before the lesson starts, Julia loads in the middle of the screen with the chosen loading animation (Mist so far), and "Joining..." under her, as in Figma. Then she appears, moves to her place in the lesson as the card fades in, and the lesson starts. Nothing else of the lesson shows; the bar keeps only the mic and End. Based on the Figma "Joining..." screen of the avatar call. **Size, as in production (Kino):** in the intro she is 600px wide at 3:4 (up to 800px tall), centered. It doesn't grow with the screen; on a short screen it scales down as a whole to fit (still 3:4, nothing cropped). When the lesson starts she shrinks into her place in the lesson (406×541).

### Julia's glow
- **Back to the original:** the soft glow behind Julia is a blurred still of her, so it takes her own colors. The blue glow that replaced it was removed.
- **Light mode only:** in dark there is no blur behind her, for a clean look. **To confirm with the developers.**

### Screen and card backgrounds (fixed)
- **The screen background is always the DS background** (`--ds-background`: white in light, #121212 in dark) and never changes: the "Background" options, the moving blue mesh and the grey layer that showed while Julia was shrunk were removed.
- **The cards have a plain fill, no light-blue gradient:** `--ds-elevated` (white in light, #333333 in dark).
- **Card shadow copied from the LXP:** `0 12px 40px` black 6%, exactly as in the LXP slide. It isn't a DS shadow (DS candidate). The "LXP card shadow" switch in the panel compares it with the earlier DS shadow.

### Minimized Julia ("Minimize Julia" tab), as in the LXP
- No "–" button on Julia's tile (removed). Minimizing shrinks her into a **64px circle in the middle of the bar, in place of the mic** (the mic leaves), with her face in it. The card moves to the middle. On hover or focus the circle gets a blue ring.
- **The move:** you see her travel from her place into the mic's spot, as in the LXP.
- **Talking:** clicking the circle floats her up as a 200px circle at the bottom right, and the mic comes back. A small X badge on the circle's edge takes her back to the circle.
- This replaces the earlier small tile at the top right. The behavior comes from the LXP prototype.
- **Julia states panel (J):** Joining, Introduction, In the lesson, Minimized and Talking, so each can be shown. Moving between them plays the matching animation: from the introduction she slides right and shrinks into the lesson (and back); from the lesson she flies into the bar circle (and back); far states go step by step. Which use case each state belongs to is not decided yet.

### Text chat with Julia
- **A side panel** on the right, full height. It **pushes the whole layout left** instead of floating over it: the card narrows, Julia takes her smaller size, and the bottom bar moves with the screen.
- Aligned with the DS: the `paper` surface (the DS surface for panels), a `tone-5` divider, an 18px title like a modal header, bubbles with 12px corners and 16px text.
- **The chat icon is in the bar**, 16px to the right of the mic (decided). The option on Julia's tile was removed.
- The input is the same field as "Or write your own answer…": 48px high, send button inside the field, disabled until something is typed.
- Hebrew aligns right automatically. Escape closes, and focus goes back to the icon.
- **"View new messages" (built today):** when the student has scrolled up to read earlier messages and Julia writes something new, the chat stays where it is and a "View new messages ⌄" button shows just above the field. A click scrolls down to the new message. It uses the DS floating layer (the `elevated` surface with the floating shadow), so it is correct in both dark and light.
- **"Julia is typing":** after the student sends, three dots show in Julia's bubble until her answer arrives.
- **Chat states panel (C key; removed from the main panel for now):** every chat state with its use case (just opened, writing, Julia is typing, conversation, view new messages). A click opens the chat in that state.
- **Bubble colors (decided today): option B.** Julia's bubbles are light blue (`primary-tint-10`), the student's are grey (`tone-6`), with dark text on both. It uses DS tokens only, the two sides are clearly different, and there is no solid blue block that looks like a button. The other five options (white/blue, both soft, gradient, outlined, teal) and their section in the demo panel were removed. The DS has no chat bubble component or bubble tokens, so this stays a DS candidate.

### Card layout (layout trial, hidden from the panel for now)
- One big card: the question and Julia's speech bubble on the left, the answers and the "write your own" field on the right.
- **The footer was replaced with the regular footer of the other screens**, inside the card. "‹ Go deeper ›" was removed.

### Fixes from the design audit (Nov 17)
- "Done reading" is back to being a DS primary button with ✓, instead of a DS button painted green.
- The writing fields are built on `ds-textarea` / `ds-input-xl`.
- The answers in Card layout moved to the Quiz answer component, so there is one component instead of two.
- Button height is 48px across the whole flow.
- The card in dark is a clean surface, without the blue tint.

### Removed by decision
A "Background" option that colored the page and cards in the color behind Julia (tried today; back to the blue).
The Flows panel and old demo scenarios, the "Mic while it's off" options (transparent, label, hidden), the "Current step" panel, the dot inside the current circle, "Talk to interrupt", and "Go deeper". The Genie and Push to Talk screens were taken out of the lesson because they aren't part of it.

---

## 3. Options built and waiting for a decision

| Topic | Options | My recommendation |
|---|---|---|
| **Julia's loading animation** when the lesson opens ("Avatar loading" panel, step with ‹ ›) | 30 options. The current direction: **"the tile forms itself"**: no frame while she loads, a soft edgeless presence that takes the shape of the tile (Becoming, Emerge, Coalesce, Mist, Fairy dust). Rule: nothing of Julia shows until she arrives, but the loading takes **the colors of her image** (decided today), so it leads into her. The developers compute the colors from each image. Before that: basic ones (glow, rings, blur to sharp, shimmer, "Julia is joining…"), creative ones (voice wave, iris, aurora, sunrise, bubble, orbit, color in, curtain), futuristic ones with a breathing gradient (Liquid, Glass orb, Edge glow, Hologram, Scan, Stardust, Prism), and ones that work with Julia herself (Halftone, Aura, Signal, Focus, Halo). | **4. Mist** is in use; the panel for choosing was removed |

---

## 4. Request for the manager

**Field and answer card height: 56px instead of 48px.**
The largest height in the DS is 48px (`ds-input-xl`, `ds-btn-xl`). The answer cards and fields are now aligned to 48px, but I'd like them taller (56px, like the LXP), because they are easier to tap and read for learners. The question is whether this size can be added to the DS, or approved as an exception in the prototype.

---

## 5. DS candidates (components we built because the DS lacks them)

Floating demo panel, pause layer, card footer, review mode, progress bar split into steps (including the current-step mark), progress pill on pause, speech bubble, answer card, "write your own" field with send inside, Quiz answer option, mic pill and muted state, tooltip and ripple when talking while muted, bar message chip, loader messages, avatar loading animation (including the Mist haze and the Fairy dust trail, in the colors of the image about to load), minimized avatar (circle in the bar, 200px circle to talk), splash screen, chat button in the bar, chat side panel and bubbles, "View new messages" button, "Julia is typing" bubble, avatar glow, and a token for a surface-relative fill (5% `tone-1`).
