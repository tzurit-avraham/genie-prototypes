# Design audit: Courseware flow vs. DS v1.0

Date: 2026-11-17. Scope: every screen in `index.html` (Quiz, Reading, Input, Short input, Watch a video, End of milestone, Lesson completed, Session paused, Card layout), `app.css`, `app.js`.

**How it was checked:** scanned the CSS for raw values and for overrides of DS classes, scanned the HTML for DS markup, icons, inline SVG and custom controls, and reviewed the screens in light and dark during this session.

**Overall:** the base is clean. There are no hex/rgb colors, no raw font sizes or weights, no pasted SVG or emoji, and every icon name is valid. All colors come from DS tokens or `color-mix()` of DS tokens. The inconsistencies below are about **scale** (sizes the DS doesn't have), **two DS buttons restyled by our CSS**, and **custom controls built where the DS already has a component**.

Severity: **High** = breaks a DS rule or accessibility. **Medium** = visible inconsistency. **Low** = cleanup.

---

## 1. Rule breaks (fix in the prototype)

| # | Where | Issue | Suggestion | Severity |
|---|---|---|---|---|
| 1.1 | Reading: "Done reading" | `.ds-btn.read-button.finish` paints a DS primary button green. That restyles a DS component, which the guide forbids. | Use a documented variant, i.e. keep "Done reading" primary and show success another way (✓ icon, or the green field/frame used in review mode). Or keep it and log a **"success button" DS candidate** (see DS-QUESTIONS 13). | High |
| 1.2 | Reading: "Read again" | `.ds-btn.read-button.again` copies the secondary look with our own CSS. | Swap the class to `ds-btn-secondary` in JS instead of overriding colors. | High |
| 1.3 | "Continue lesson", reading CTA | `.ds-btn.outlined::after` adds a breathing outline around a DS button. | Acceptable as a prototype-only decoration, but log it as a DS candidate ("attention CTA"), or drop it when the button is already the only primary on screen. | Low |
| 1.4 | Input and Short input fields, "Or write your own answer…" | Built as custom `.input-box` / `.cl-own-input`. The DS has `ds-input` / `ds-textarea` (+ `ds-input-error`). | Use `ds-textarea` / `ds-input-xl` as the base. Our success state (green frame) has no DS variant, so log a **success field** candidate. | Medium |

## 2. Scale outside the DS (inconsistent or DS gaps)

| # | Where | Issue | Suggestion | Severity |
|---|---|---|---|---|
| 2.1 | Titles, reading text, speech bubble | Font sizes 20, 24, 32 and 36px. The DS scale goes 11-18 and then 48. | DS gap: log it (DS-QUESTIONS 10). In the meantime, reduce to **two** custom steps (e.g. 24 reading / 32 title) so the prototype doesn't drift into five sizes. | Medium |
| 2.2 | Reading text, bubble, answers, titles | Unitless line heights (1.15, 1.2, 1.4, 1.45, 1.5) next to DS tokens (`line-height-16`…`24`). | Use one ratio per role (1.5 body, 1.2 titles), and DS tokens wherever the font size is a DS size. | Low |
| 2.3 | Cards (16px, 24px), avatar (16px), mic pill (fully round), "Continue lesson" outline (10px) | Corner radii above the DS max (`roundness-3` = 12px). There are 6 different radii on screen: 4, 8, 12, 16, 24 and pill. | DS gap: log it (DS-QUESTIONS 11). Settle on 3 roles: controls `roundness-2`, answer/field `roundness-3`, large surfaces one `--app-radius-lg`. Drop `radius-xl` or keep it for one surface only. | Medium |
| 2.4 | Eyebrow ("QUIZ", "CONGRATULATIONS") | Letter-spacing 2.24px, not a DS token. | Fine as prototype-only; mention it along with the type scale. | Low |
| 2.5 | Motion | 8 custom durations (0.3–2.4s) as multiples of `duration-slow`. The DS has 6 durations. | Map short transitions (0.3s, 0.4s) to `duration-exit` (0.35s) / `duration-enter` (0.5s), and keep the custom ones for celebration and ambient motion only. | Low |

## 3. Visual inconsistency between screens

| # | Where | Issue | Suggestion | Severity |
|---|---|---|---|---|
| 3.1 | Card layout vs. every other screen | Card layout buttons are `ds-btn-lg` (40px); the rest of the flow uses `ds-btn-xl` (48px). The send button is `-md` (32px). | Pick one size for the main actions in the flow (xl), and use `-md` only inside a field. | Medium |
| 3.2 | Quiz answers vs. Card layout answers | Two different answer components: `.answer` (centered text, letter at the side) and `.cl-answer` (left-aligned, letter badge on top-left). Same hover/selected tokens, different structure. | Merge into one answer-option component, which is already a DS candidate. | Medium |
| 3.3 | "Ask for a hint", "Need help?", "Watch clip" | Custom overlay buttons (`b-60` + blur). The closest DS option is `ds-btn-circular`, which is icon-only. | Keep (DS candidate: "overlay text button"), but give all three the same height, radius and padding. Today the label is 48px and the hint button is 40px. | Low |
| 3.4 | Card surfaces | The blue radial gradient on cards (`--app-card-bg`) is the same in both themes, which tints cards blue in dark (open gap #5). It isn't a DS surface. | Decide: drop it (plain `elevated`) or keep it as a DS candidate. Dropping it is the most DS-consistent option. | Medium |
| 3.5 | Speech bubble vs. cards | The bubble border is `tone-5` (card border) while answers/fields are `tone-3` (field border). That's correct by role, but they sit side by side in Card layout and read as two border weights. | No change needed; just confirm it's intended. | Low |
| 3.6 | Glows | Four glow strengths (35, 50, 55, 80%) plus Julia's 18%. There are no DS glow tokens. | Reduce to two (soft, strong) and log them with DS-QUESTIONS 7. | Low |
| 3.7 | "End" button | `ds-btn-danger` xl with the `clear` (×) icon. × reads as "close", not "end session". The `exit` icon exists. | Use `exit` (open item #3 in the handoff). | Low |

## 4. Accessibility

| # | Where | Issue | Suggestion | Severity |
|---|---|---|---|---|
| 4.1 | Session paused | ~~The progress bar has no surface; its contrast depends on the activity behind it.~~ **Fixed:** the pause layer is now 80% of the page color (option B). | Done. | ~~High~~ |
| 4.2 | Progress bar | With the pulse removed, the current step's segment looks exactly like a done segment. "You are here" is shown only by the milestone ring. | Give the current segment a different shape/marker (e.g. a hollow segment with a primary outline, or a small dot), not color alone. | Medium |
| 4.3 | Card shadow in dark | The DS shadow is black and invisible in dark. Surfaces rely only on the `tone-5` border. | Already logged (DS-QUESTIONS 2). The border is enough for now. | Low |

## 5. Prototype-only scaffolding to remove before handoff

- The "Same-token fixes" switch and its `before-token-fixes` CSS block.
- `parked/tools-pill.md` (keep or delete).

---

## Suggested order

1. **1.1 + 1.2** (DS button overrides): rule issues.
2. **3.1 + 3.2**: one button size and one answer component across the flow.
3. **3.4**: decide on the card gradient.
4. **2.1 + 2.3**: shrink the custom type and radius scales, and send the gaps to the DS team.
5. The rest are low-priority cleanup.
