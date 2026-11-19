# Parked: lesson tools pill (Card layout)

Removed from the "Card layout" screen on 2026-11-17, kept here in case we need it again.
A pill hanging from the top-right corner of the Card layout screen, with 4 icon buttons
(search, transcript, about this lesson, report a problem). None of them do anything yet.
Built from a screenshot in an earlier conversation.

To bring it back: paste the HTML into `index.html` right after
`<p class="cl-lesson-title">This, that, these and those</p>`, and the CSS into `app.css`
right before `.cl-card {`.

## HTML

```html
        <div class="cl-toolbar" role="toolbar" aria-label="Lesson tools">
          <button class="cl-tool" type="button" aria-label="Search"><ds-icon name="search"></ds-icon></button>
          <button class="cl-tool" type="button" aria-label="Transcript"><ds-icon name="notes"></ds-icon></button>
          <button class="cl-tool" type="button" aria-label="About this lesson"><ds-icon name="info"></ds-icon></button>
          <button class="cl-tool" type="button" aria-label="Report a problem"><ds-icon name="feedback"></ds-icon></button>
        </div>
```

## CSS

```css
/* lesson tools: a dark pill hanging from the top-right corner */
.cl-toolbar {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  display: flex;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2) var(--ds-space-4) var(--ds-space-2) var(--ds-space-6);
  border-bottom-left-radius: var(--app-radius-xl);
  background: var(--ds-tone-1); /* one token: a dark pill in light, a white pill in dark */
}

.cl-tool {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--ds-space-8) + var(--ds-space-2)); /* 40px */
  height: calc(var(--ds-space-8) + var(--ds-space-2));
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--ds-tone-8);
  cursor: pointer;
  transition: background var(--ds-duration-base) ease;
}

.cl-tool:hover { background: var(--ds-tone-2); }
.cl-tool:focus-visible { outline: 2px solid var(--ds-tone-8); outline-offset: -2px; }
```

```css
/* Before view of the same-token fixes (only if the comparison switch is still around) */
:root.before-token-fixes .cl-toolbar { background: var(--ds-b-60); }
:root.before-token-fixes[data-theme="dark"] .cl-toolbar { background: var(--ds-w-60); }
:root.before-token-fixes .cl-tool { color: var(--ds-w-100); }
:root.before-token-fixes .cl-tool:hover { background: var(--ds-w-20); }
:root.before-token-fixes .cl-tool:focus-visible { outline-color: var(--ds-w-100); }
```
