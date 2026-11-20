/* app.js - Genie Avatar + form prototype (copy of ../genie-avatar, plus the "A Few Details About You" form)
   - Whatever the user writes (or picks), the agent answers with the form (Figma 19562:22081)
   - The form has two steps: the fields, then "done". Submit / Continue add the next chat turns.
   - Avatar call: once the avatar joins, it "says" a line (captions) and the form opens:
     beside the avatar when there is room, under it (bottom sheet) when there isn't
   - Views (demo panel): Full screen, Side panel (Genie docked over a page), Mobile (phone-size frame)
*/

(function () {
  var data = window.APP_DATA;

  var genieBody = document.getElementById('genie-body');
  var genieInitial = document.getElementById('genie-initial');
  var channels = document.getElementById('channels');
  var chatStream = document.getElementById('chat-stream');
  var processing = document.getElementById('processing-indicator');
  var composerBox = document.getElementById('composer-box');
  var initialSlot = document.getElementById('initial-composer-slot');
  var bottomBar = document.getElementById('bottom-composer-bar');
  var composerWrap = document.getElementById('composer-wrap');
  var input = document.getElementById('prompt-input');
  var submit = document.getElementById('prompt-submit');
  var session = 0; // bumps on "New thread" so pending answers are dropped
  var EMBED = /[?&]embed=1/.test(location.search); // inside the Mobile view's phone frame
  if (EMBED) document.documentElement.classList.add('app-embed');

  // The Genie's own width picks its layout: narrow = side panel, phone or a small window
  var genie = document.getElementById('genie');
  // Narrow: labeled buttons become DS icon-only buttons (they keep their aria-label)
  function syncNarrow() {
    var narrow = genie.offsetWidth > 0 && genie.offsetWidth < 640;
    genie.classList.toggle('app-genie-narrow', narrow);
    document.querySelectorAll('.app-bar-btn, .app-composer-preset').forEach(function (b) {
      b.classList.toggle('ds-btn-icon', narrow);
    });
    document.querySelector('.app-header-ask').classList.toggle('ds-btn-icon', window.innerWidth < 768);
  }
  if (window.ResizeObserver) new ResizeObserver(syncNarrow).observe(genie);
  window.addEventListener('resize', syncNarrow);

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ----- Sounds -----
  var popSound = new Audio('assets/pop.wav');
  var sendSound = new Audio('assets/sent-message.mp3');
  var successSound = new Audio('assets/booking-success.mp3');
  function play(sound) {
    try { sound.currentTime = 0; sound.play().catch(function () {}); } catch (e) {}
  }

  // ----- Start screen content -----
  document.getElementById('suggestions').innerHTML = data.suggestions.map(function (s) {
    return '<button class="ds-btn ds-btn-md ds-btn-secondary app-suggestion" type="button" data-suggestion="' + esc(s) + '">' + esc(s) + '</button>';
  }).join('');

  var viewersHtml = data.viewers.map(function (src) {
    return '<span class="ds-user-picture ds-user-picture-sm ds-user-picture-round"><img src="' + src + '" alt=""></span>';
  }).join('');

  var channelsHtml = data.channels.map(function (c) {
    return '<article class="app-channel">' +
      '<div class="app-channel-thumb">' +
        '<img src="' + c.image + '" alt="">' +
        '<span class="ds-badge-duration app-channel-lessons">' + esc(c.lessons) + '</span>' +
      '</div>' +
      '<div class="app-channel-details">' +
        '<div class="app-channel-text">' +
          '<h3 class="app-channel-title">' + esc(c.title) + '</h3>' +
          '<p class="app-channel-desc">' + esc(c.description) + '</p>' +
          '<div class="app-channel-meta">' +
            '<span class="app-channel-viewers">' + viewersHtml + '</span>' +
            '<span class="app-channel-match">' + esc(c.match) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="app-channel-actions">' +
          '<button class="ds-btn ds-btn-md ds-btn-primary" type="button" data-action="start-watching">Start watching</button>' +
          '<button class="ds-btn ds-btn-md ds-btn-secondary ds-btn-borderless" type="button" data-action="subscribe" aria-pressed="false">' +
            '<ds-icon name="add"></ds-icon> <span>Subscribe</span></button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');
  document.getElementById('channels-grid').innerHTML = channelsHtml;
  document.getElementById('page-grid').innerHTML = channelsHtml;

  // Answer mode menu
  var modeMenu = document.querySelector('#mode-select .ds-select-menu');
  modeMenu.innerHTML = data.modes.map(function (m) {
    return '<button class="ds-select-item" role="option" data-value="' + m.value + '"' + (m.selected ? ' aria-selected="true"' : '') + '>' +
      '<span class="ds-select-item-label">' + esc(m.label) + '</span>' +
      (m.selected ? '<ds-icon class="ds-select-item-trailing" name="check" size="16"></ds-icon>' : '') +
    '</button>';
  }).join('');

  // Composer starts in the start screen, above the suggestions
  initialSlot.insertBefore(composerBox, initialSlot.firstChild);

  // ----- Composer -----
  function autoResize() {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  }

  function syncSubmit() {
    var hasText = input.value.trim().length > 0;
    submit.disabled = !hasText;
    submit.classList.toggle('ds-btn-primary', hasText);
    submit.classList.toggle('ds-btn-secondary', !hasText);
  }

  input.addEventListener('input', function () { autoResize(); syncSubmit(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
  });
  submit.addEventListener('click', function () { send(input.value); });

  // Presets: Flashcards / Text, one at a time (they toggle, but every message gets the form)

  // ----- Conversation -----
  // Soft scroll (instant when the user prefers reduced motion)
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function scrollToBottom() {
    genieBody.scrollTo({ top: genieBody.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function enterChatMode() {
    if (genieInitial.hidden) return;
    genieInitial.hidden = true;
    channels.hidden = true;
    composerWrap.appendChild(composerBox);
    bottomBar.hidden = false;
    document.getElementById('genie').classList.add('app-genie-chatting');
  }

  function setFollowUps(list) {
    var el = document.getElementById('followups');
    list = list || [];
    el.innerHTML = list.map(function (s) {
      return '<button class="app-followup" type="button" data-suggestion="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('');
    el.hidden = list.length === 0;
  }

  function addUserMsg(text) {
    var userMsg = document.createElement('div');
    userMsg.className = 'app-user-msg';
    userMsg.innerHTML = '<div class="app-user-bubble">' + esc(text) + '</div>';
    chatStream.appendChild(userMsg);
    play(sendSound);
  }

  // Agent message: avatar (no name), then the content (HTML string). Returns the content element.
  function addAgentMsg(html, withActions) {
    var msg = document.createElement('div');
    msg.className = 'app-agent-msg';
    msg.innerHTML =
      '<div class="app-agent-header"><span class="app-agent-avatar"><img src="assets/avatar.png" alt="Genie"></span></div>' +
      '<div class="app-agent-content">' + html + (withActions ? actionsHtml() : '') + '</div>';
    chatStream.appendChild(msg);
    return msg.querySelector('.app-agent-content');
  }

  function actionsHtml() {
    return '<div class="app-agent-actions">' +
      '<button class="ds-btn ds-btn-sm ds-btn-secondary ds-btn-borderless ds-btn-icon" type="button" aria-label="Copy" data-action="copy"><ds-icon name="copy" size="16"></ds-icon></button>' +
      '<button class="ds-btn ds-btn-sm ds-btn-secondary ds-btn-borderless ds-btn-icon" type="button" aria-label="Good answer" data-action="like"><ds-icon name="like-hollow" size="16"></ds-icon></button>' +
      '<button class="ds-btn ds-btn-sm ds-btn-secondary ds-btn-borderless ds-btn-icon" type="button" aria-label="Bad answer" data-action="dislike"><ds-icon name="dislike-hollow" size="16"></ds-icon></button>' +
    '</div>';
  }

  // Typing dots, then `then()` (dropped if the thread was reset meanwhile)
  function agentTurn(then, delay) {
    var sentIn = session;
    processing.hidden = false;
    scrollToBottom();
    setTimeout(function () {
      if (sentIn !== session) return;
      processing.hidden = true;
      play(popSound);
      then();
      revealLatest();
    }, delay || 1200);
  }

  // After a new agent message: to the bottom, but never past the message's start. A message taller
  // than the chat (the form, on mobile) shows from its top, and the user scrolls down through it.
  function revealLatest() {
    var msgs = chatStream.querySelectorAll('.app-agent-msg');
    var msg = msgs[msgs.length - 1];
    if (!msg) { scrollToBottom(); return; }
    var gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ds-space-4')) || 0;
    var start = msg.getBoundingClientRect().top - genieBody.getBoundingClientRect().top + genieBody.scrollTop - gap;
    var bottom = genieBody.scrollHeight - genieBody.clientHeight;
    genieBody.scrollTo({ top: Math.max(0, Math.min(bottom, start)), behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  // Prototype rule: whatever the user writes, the agent answers with the form
  function send(raw) {
    var text = String(raw || '').trim();
    if (!text) return;

    enterChatMode();
    addUserMsg(text);
    setFollowUps([]);
    input.value = '';
    autoResize();
    syncSubmit();

    agentTurn(function () {
      var content = addAgentMsg('<p>' + esc(data.form.intro) + '</p>');
      content.appendChild(createForm({
        context: 'chat',
        onSubmit: function (values, first) {
          if (!first) return; // editing again only updates the card
          var sentIn = session;
          setTimeout(function () {
            if (sentIn !== session) return;
            addUserMsg(data.form.userDone);
            agentTurn(function () {
              addAgentMsg('<p>' + esc(data.form.agentDone) + '</p>', true);
              setFollowUps(data.form.nextSteps);
            });
          }, dsMs('--ds-duration-enter') * 5); // the chat waits for the done mark to form and pulse once (2.5s)
        },
        onSkip: function () {
          addUserMsg(data.form.userSkip);
          agentTurn(function () {
            addAgentMsg('<p>' + esc(data.form.agentSkip) + '</p>', true);
            setFollowUps(data.form.nextSteps);
          });
        }
      }));
    });
  }

  // =========================================================
  // Prototype-only: form card "A Few Details About You" (DS candidate: form card in a conversation)
  // Built from DS form fields, inputs, select and buttons. Step 1 = fields, step 2 = done.
  // opts: { context: 'chat' | 'call', onSubmit(values, isFirstSubmit), onSkip(), onClose() }
  // =========================================================
  var formCount = 0;
  var CHECK16 = '<ds-icon class="ds-select-item-trailing" name="check" size="16"></ds-icon>';

  // Done step illustration, in the language of the LXP track icons (lxp-teams/lxp-assets/track-icon-chat.png,
  // -shield, -flag, -target): upright shapes with small corner radii, two flat shapes in one color family
  // overlapping, the front one translucent and darker where they meet, a soft top-to-bottom gradient, one
  // crisp white detail. Here: the details sheet behind, a check tile in front. Green = done.
  // Inline (not an <img>) so its parts can animate; artwork, so its colors are its own.
  // ids are per form, since several forms can be in the chat.
  function doneMarkSvg(id) {
    return '<svg class="app-done-art" viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<linearGradient id="' + id + '-back" x1="44" y1="20" x2="44" y2="72" gradientUnits="userSpaceOnUse"><stop stop-color="#9be6b0"/><stop offset="1" stop-color="#5fca86"/></linearGradient>' +
        '<linearGradient id="' + id + '-hi" x1="22" y1="20" x2="52" y2="50" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="' + id + '-front" x1="62" y1="44" x2="62" y2="80" gradientUnits="userSpaceOnUse"><stop stop-color="#2fbd66"/><stop offset="1" stop-color="#16924a"/></linearGradient>' +
        '<clipPath id="' + id + '-clip"><rect x="44" y="44" width="36" height="36" rx="5"/></clipPath>' +
      '</defs>' +
      '<g class="app-done-sheet">' +
        '<rect x="20" y="20" width="48" height="52" rx="5" fill="url(#' + id + '-back)"/>' +
        '<rect x="20" y="20" width="48" height="52" rx="5" fill="url(#' + id + '-hi)"/>' +
        '<rect class="app-done-line" x="28" y="30" width="22" height="4" rx="2" fill="#fff" fill-opacity=".75"/>' +
        '<rect class="app-done-line" x="28" y="39" width="14" height="4" rx="2" fill="#fff" fill-opacity=".75"/>' +
      '</g>' +
      '<g class="app-done-tile">' +
        '<rect x="44" y="44" width="36" height="36" rx="5" fill="url(#' + id + '-front)" fill-opacity=".92"/>' +
        '<g clip-path="url(#' + id + '-clip)"><rect x="20" y="20" width="48" height="52" rx="5" fill="#0b6a33" fill-opacity=".3"/></g>' +
        '<path class="app-done-check" pathLength="1" d="M53.5 62.5L59.5 68.5L71 56.5" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</g>' +
    '</svg>';
  }
  // Fields step mark, left of the title: the same language as the done mark (a details sheet behind, one
  // shape in front, translucent and darker where they meet, one crisp white detail), in the Gen AI sparkle
  // colors: the sheet goes green -> pink -> lilac, a blue sparkle sits on its corner. The sparkle is the
  // large one of the Gen AI icon on the home page (assets/gen-ai-gradient.svg, its 32px path, scaled 1.6x).
  // Artwork, so its colors are its own. ids are per form.
  var GENAI_SPARK = 'M12.6069 26.6648C12.3701 27.1859 11.6299 27.1859 11.3931 26.6648L8.66667 20.6667L2.66854 17.9402C2.14747 17.7034 2.14747 16.9633 2.66854 16.7264L8.66667 14L11.3931 8.00187C11.6299 7.48081 12.3701 7.48081 12.6069 8.00187L15.3333 14L21.3315 16.7264C21.8525 16.9633 21.8525 17.7034 21.3315 17.9402L15.3333 20.6667L12.6069 26.6648Z';
  function introMarkSvg(id) {
    var spark = '<path transform="translate(46.8 35.3) scale(1.6)" d="' + GENAI_SPARK + '"/>';
    return '<svg class="app-intro-art" viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<linearGradient id="' + id + '-back" x1="18" y1="72" x2="66" y2="18" gradientUnits="userSpaceOnUse"><stop stop-color="#7fd6a0"/><stop offset=".55" stop-color="#f7a8f2"/><stop offset="1" stop-color="#c9a4ff"/></linearGradient>' +
        '<linearGradient id="' + id + '-hi" x1="18" y1="18" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="' + id + '-front" x1=".5" y1="0" x2=".5" y2="1"><stop stop-color="#5b8dff"/><stop offset="1" stop-color="#006efa"/></linearGradient>' +
        '<clipPath id="' + id + '-clip">' + spark + '</clipPath>' +
      '</defs>' +
      '<g transform="translate(4 3)">' + // optical centering: the sheet is the heavy part, top left
      '<g class="app-intro-sheet">' +
        '<rect x="18" y="18" width="48" height="54" rx="5" fill="url(#' + id + '-back)"/>' +
        '<rect x="18" y="18" width="48" height="54" rx="5" fill="url(#' + id + '-hi)"/>' +
        '<rect x="26" y="28" width="22" height="4" rx="2" fill="#fff" fill-opacity=".8"/>' +
        '<rect x="26" y="37" width="14" height="4" rx="2" fill="#fff" fill-opacity=".8"/>' +
      '</g>' +
      '<g class="app-intro-spark">' +
        '<g fill="url(#' + id + '-front)" fill-opacity=".92">' + spark + '</g>' +
        '<g clip-path="url(#' + id + '-clip)"><rect x="18" y="18" width="48" height="54" rx="5" fill="#2a1a8a" fill-opacity=".3"/></g>' +
      '</g>' +
      '</g>' +
    '</svg>';
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Prototype-only: two looks for the form, switched in the demo panel.
  // 'before' = the first version (centered, paper card). 'after' = the ARE wizard look.
  function formLook() { return document.documentElement.getAttribute('data-form-look') || 'after'; }

  // Prototype-only: how many fields the form shows (1-8, set in the "Form fields" panel). The first N in Figma order.
  var fieldCount = data.form.fields.length;
  function activeFields() { return data.form.fields.slice(0, fieldCount); }

  // Reads a DS duration token (e.g. "0.2s") as milliseconds
  function dsMs(token) {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) * 1000;
  }

  function createForm(opts) {
    var f = data.form;
    var uid = 'form' + (++formCount);
    var values = {};
    var submitted = false;
    f.fields.forEach(function (field) { values[field.id] = field.value || ''; });

    var card = document.createElement('form');
    card.className = 'app-form app-form-' + opts.context;
    card.noValidate = true;
    card.setAttribute('aria-labelledby', uid + '-title');

    function fieldHtml(field) {
      var id = uid + '-' + field.id;
      var error = '<p class="ds-form-error" id="' + id + '-error" hidden></p>';
      if (field.type === 'select') {
        return '<div class="ds-form-field">' +
          '<span class="ds-form-label" id="' + id + '-label">' + esc(field.label) + '</span>' +
          '<div class="ds-select-wrapper app-form-select" data-field="' + field.id + '">' +
            '<button class="ds-select" type="button" id="' + id + '" aria-haspopup="listbox" aria-labelledby="' + id + '-label ' + id + '-value">' +
              '<span id="' + id + '-value">' + esc(values[field.id]) + '</span>' +
              '<ds-icon class="ds-select-chevron" name="chevron-down" size="16"></ds-icon>' +
            '</button>' +
            '<div class="ds-select-menu" role="listbox">' + field.options.map(function (o) {
              var on = o === values[field.id];
              return '<button class="ds-select-item" type="button" role="option" data-value="' + esc(o) + '"' + (on ? ' aria-selected="true"' : '') + '>' +
                '<span class="ds-select-item-label">' + esc(o) + '</span>' + (on ? CHECK16 : '') + '</button>';
            }).join('') + '</div>' +
          '</div>' + error +
        '</div>';
      }
      return '<div class="ds-form-field">' +
        '<label class="ds-form-label" for="' + id + '">' + esc(field.label) +
          (field.required ? '<span class="app-form-required" aria-hidden="true">*</span>' : '') + '</label>' +
        '<input class="ds-input ds-input-md" id="' + id + '" name="' + field.id + '" type="' + (field.type === 'email' ? 'email' : 'text') + '"' +
          (field.autocomplete ? ' autocomplete="' + field.autocomplete + '"' : '') +
          ' value="' + esc(values[field.id]) + '"' + (field.required ? ' required' : '') + ' aria-describedby="' + id + '-error">' + error +
      '</div>';
    }

    // Chat on a wide screen uses the larger buttons (as in the Figma frame)
    function btnSize() {
      return opts.context === 'chat' && !genie.classList.contains('app-genie-narrow') ? 'ds-btn-lg' : 'ds-btn-md';
    }

    // Secondary actions: a filled secondary button in the first look, borderless in the ARE look
    function secondaryClass() {
      return 'ds-btn ' + btnSize() + ' ds-btn-secondary' + (formLook() === 'after' ? ' ds-btn-borderless' : '');
    }

    // Both steps are always in the card, in one grid cell; only the current one shows,
    // and the card takes its height (goTo animates the change).
    function stepAttrs(name) {
      var current = card.getAttribute('data-step') === name;
      return ' data-step-name="' + name + '"' + (current ? '' : ' inert aria-hidden="true"');
    }

    function fieldsStepHtml() {
      return '<div class="app-form-step"' + stepAttrs('fields') + '>' +
          '<header class="app-form-header">' +
            '<span class="app-form-intro-mark">' + introMarkSvg(uid + '-intro') + '</span>' +
            '<div class="app-form-heading">' +
              '<h3 class="app-form-title" id="' + uid + '-title">' + esc(f.title) + '</h3>' +
              '<p class="app-form-subtitle">' + esc(f.subtitle) + '</p>' +
            '</div>' +
          '</header>' +
          '<div class="app-form-grid" data-count="' + activeFields().length + '">' + activeFields().map(fieldHtml).join('') + '</div>' +
          '<div class="app-form-footer">' +
            '<button class="' + secondaryClass() + '" type="button" data-form="skip">' + esc(f.skipLabel) + '</button>' +
            '<button class="ds-btn ' + btnSize() + ' ds-btn-primary" type="submit">' + esc(f.submitLabel) + '</button>' +
          '</div>' +
        '</div>';
    }

    function doneStepHtml() {
      // Only the fields the form showed (name and location join two fields each)
      var on = {};
      activeFields().forEach(function (x) { on[x.id] = true; });
      function join(ids, sep) {
        return ids.filter(function (id) { return on[id]; }).map(function (id) { return values[id].trim(); }).join(sep);
      }
      var rows = [
        ['Name', join(['first-name', 'last-name'], ' '), 'user'],
        ['Email', join(['email']), 'mail'],
        ['Job title', join(['job-title']), 'executives'],
        ['Company', join(['company']), 'group'],
        ['Location', join(['city', 'country'], ', '), 'globe'],
        ['Age range', join(['age']), 'calendar']
      ].filter(function (r) { return r[1]; });
      // ARE look: the details as an icon list in a bordered box. First look: label / value pairs.
      var summary = formLook() === 'after'
        ? '<ul class="app-form-details">' + rows.map(function (r) {
            return '<li class="app-form-detail"><ds-icon name="' + r[2] + '" size="24"></ds-icon>' +
              '<span><span class="app-form-detail-label">' + esc(r[0]) + '</span> ' + esc(r[1]) + '</span></li>';
          }).join('') + '</ul>'
        : '<dl class="app-form-summary">' + rows.map(function (r) {
            return '<div class="app-form-summary-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
          }).join('') + '</dl>';
      return '<div class="app-form-step"' + stepAttrs('done') + '>' +
          '<div class="app-form-done">' +
            '<span class="app-form-done-mark">' + doneMarkSvg(uid + '-mark') + '</span>' +
            '<header class="app-form-header">' +
              '<div class="app-form-heading">' +
                '<h3 class="app-form-title" id="' + uid + '-done-title" tabindex="-1">' + esc(firstName() ? f.done.title.replace('{first}', firstName()) : f.done.title.replace(', {first}', '')) + '</h3>' +
                '<p class="app-form-subtitle">' + esc(f.done.subtitle) + '</p>' +
              '</div>' +
            '</header>' +
            summary +
          '</div>' +
          '<div class="app-form-footer">' +
            '<button class="' + secondaryClass() + '" type="button" data-form="edit">' +
              '<ds-icon name="edit" size="16"></ds-icon> ' + esc(f.done.editLabel) + '</button>' +
            (opts.context === 'call'
              ? '<button class="ds-btn ' + btnSize() + ' ds-btn-primary" type="button" data-form="close">Done</button>'
              : '') +
          '</div>' +
        '</div>';
    }

    function firstName() {
      return activeFields().some(function (x) { return x.id === 'first-name'; }) ? String(values['first-name']).trim() : '';
    }

    // Submit stays disabled until every required field (email) has something in it
    function syncSubmit() {
      var btn = card.querySelector('[data-step-name="fields"] [type="submit"]');
      if (!btn) return;
      btn.disabled = activeFields().some(function (x) { return x.required && !String(values[x.id]).trim(); });
    }

    function render(step) {
      card.setAttribute('data-step', step);
      card.setAttribute('aria-labelledby', uid + (step === 'done' ? '-done-title' : '-title'));
      card.innerHTML = '<div class="app-form-stack">' + fieldsStepHtml() + doneStepHtml() + '</div>';
      syncSubmit();
    }
    function renderFields() { render('fields'); }
    function renderDone() { render('done'); }

    // Fields, labels, badge and buttons cascade in (ARE look only; CSS does nothing in the first look)
    function stagger() {
      card.querySelectorAll('.app-form-grid > .ds-form-field, .app-form-done > *, .app-form-details > *, .app-form-footer > *').forEach(function (el, i) {
        el.style.setProperty('--i', i);
      });
    }

    // Old step leaves (fades / slides away from `dir`), the card resizes, the new step comes in
    var busy = false;
    function goTo(render, focusSel, dir) {
      if (busy) return;
      busy = true;
      var startH = card.offsetHeight;
      card.style.height = startH + 'px';
      card.setAttribute('data-dir', dir || 'forward');
      card.classList.add('app-form-leaving');
      setTimeout(function () {
        if (!card.isConnected) return;
        render();
        stagger();
        card.classList.remove('app-form-leaving');
        card.style.height = 'auto';
        var endH = card.offsetHeight;
        card.style.height = startH + 'px';
        void card.offsetHeight;
        card.classList.add('app-form-resizing', 'app-form-entering');
        card.style.height = endH + 'px';
        var focusEl = focusSel && card.querySelector(focusSel);
        if (focusEl) focusEl.focus({ preventScroll: true });
        revealTop();
        setTimeout(function () {
          card.style.height = '';
          card.classList.remove('app-form-resizing', 'app-form-entering');
          card.removeAttribute('data-dir');
          busy = false;
        }, dsMs('--ds-duration-enter'));
      }, dsMs('--ds-duration-slow'));
    }

    // New step: the user scrolled down to Submit (or Edit), so the step's start is above the view (mostly
    // on mobile). Bring the card's top into view before the step builds up (the done mark, the first field).
    // Chat: the chat scrolls (the next messages scroll it down again once the mark is done). Call: the sheet
    // scrolls to its top.
    function revealTop() {
      var behavior = reduceMotion ? 'auto' : 'smooth';
      if (opts.context === 'call') {
        var sheet = card.parentElement;
        if (sheet && sheet.scrollTop > 0) sheet.scrollTo({ top: 0, behavior: behavior });
        return;
      }
      var gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ds-space-4')) || 0;
      var above = card.getBoundingClientRect().top - genieBody.getBoundingClientRect().top - gap;
      if (above < 0) genieBody.scrollTo({ top: genieBody.scrollTop + above, behavior: behavior });
    }

    function fieldById(id) {
      return f.fields.filter(function (x) { return x.id === id; })[0];
    }

    function errorText(field, value) {
      if (!String(value).trim()) return field.required ? 'Enter your ' + field.label.toLowerCase() + '.' : '';
      if (field.type === 'email' && !EMAIL_RE.test(value.trim())) return 'Enter a valid email.';
      return '';
    }

    function setError(field, msg) {
      var id = uid + '-' + field.id;
      var err = document.getElementById(id + '-error');
      var control = document.getElementById(id);
      if (!err) return;
      err.textContent = msg;
      err.hidden = !msg;
      if (control.classList.contains('ds-input')) {
        control.classList.toggle('ds-input-error', !!msg);
        control.setAttribute('aria-invalid', msg ? 'true' : 'false');
      }
    }

    function validate() {
      var firstBad = null;
      activeFields().forEach(function (field) {
        var msg = errorText(field, values[field.id]);
        setError(field, msg);
        if (msg && !firstBad) firstBad = document.getElementById(uid + '-' + field.id);
      });
      if (firstBad) firstBad.focus({ preventScroll: opts.context === 'call' });
      return !firstBad;
    }

    card.addEventListener('input', function (e) {
      if (!e.target.name) return;
      values[e.target.name] = e.target.value;
      syncSubmit();
      if (e.target.classList.contains('ds-input-error')) setError(fieldById(e.target.name), errorText(fieldById(e.target.name), e.target.value));
    });

    card.addEventListener('ds-change', function (e) {
      var wrap = e.target.closest('.app-form-select');
      if (wrap) values[wrap.getAttribute('data-field')] = e.detail.value;
    });

    card.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy || card.getAttribute('data-step') !== 'fields') return;
      if (!validate()) return;
      var first = !submitted;
      submitted = true;
      play(successSound);
      card.classList.add('app-form-celebrate'); // the done mark builds up (the card itself does not animate)
      setTimeout(function () { card.classList.remove('app-form-celebrate'); }, dsMs('--ds-duration-enter') * 7); // the mark builds up, then its halo pulses once
      goTo(renderDone, '[data-step-name="done"] .app-form-title', 'forward');
      if (opts.onSubmit) opts.onSubmit(values, first);
    });

    card.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-form]');
      if (!btn || busy) return;
      switch (btn.getAttribute('data-form')) {
        case 'skip':
          // Chat: the card stays in the conversation, locked. Call: the card closes.
          card.classList.add('app-form-skipped');
          card.querySelectorAll('input, button').forEach(function (el) { el.disabled = true; });
          if (opts.onSkip) opts.onSkip();
          break;
        case 'edit': goTo(renderFields, '[data-step-name="fields"] input', 'back'); break;
        case 'close': if (opts.onClose) opts.onClose(); break;
      }
    });

    // Switching the look redraws the current step with the values kept
    card.redraw = function () {
      if (busy) return;
      var skipped = card.classList.contains('app-form-skipped');
      if (card.getAttribute('data-step') === 'done') renderDone(); else renderFields();
      if (skipped) card.querySelectorAll('input, button').forEach(function (el) { el.disabled = true; });
    };

    // Narrow Genie (phone, side panel), call only: the sheet ends at the 4th row, where the buttons
    // start; the rest scrolls under them. In the chat the card grows with its content and only the chat scrolls.
    if (opts.context === 'call' && window.ResizeObserver) {
      var topWithin = function (el, root) {
        var t = 0;
        while (el && el !== root) { t += el.offsetTop; el = el.offsetParent; }
        return t;
      };
      var fitNarrow = function () {
        var root = card.parentElement;
        if (!root) return;
        // Rows, not fields: fields side by side (two columns) are one row
        var rows = [];
        card.querySelectorAll('[data-step-name="fields"] .app-form-grid > .ds-form-field').forEach(function (el) {
          var last = rows[rows.length - 1];
          if (!last || el.offsetTop > last.offsetTop) rows.push(el);
        });
        var foot = card.querySelector('[data-step-name="fields"] .app-form-footer');
        var on = genie.classList.contains('app-genie-narrow') && rows.length > 4 && foot;
        var h = on ? Math.round(topWithin(rows[3], root) + rows[3].offsetHeight * 0.4 + foot.offsetHeight) : 0;
        root.style.maxHeight = on ? 'min(62%, ' + h + 'px)' : '';
      };
      new ResizeObserver(fitNarrow).observe(card);
    }

    renderFields();
    stagger();
    card.classList.add('app-form-arriving');
    setTimeout(function () { card.classList.remove('app-form-arriving'); }, dsMs('--ds-duration-enter') * 3);
    return card;
  }

  function newThread() {
    session++;
    setAvatarCall(false);
    chatStream.innerHTML = '';
    processing.hidden = true;
    setFollowUps([]);
    input.value = '';
    input.style.height = '';
    syncSubmit();
    initialSlot.insertBefore(composerBox, initialSlot.firstChild);
    bottomBar.hidden = true;
    genieInitial.hidden = false;
    channels.hidden = false;
    document.getElementById('genie').classList.remove('app-genie-chatting');
    genieBody.scrollTop = 0;
  }

  // ----- Avatar call -----
  var avatarCall = document.getElementById('avatar-call');

  // Prototype-only: loading colors from the avatar image (same method as the courseware).
  // Sets --app-image-dark / -mid / -light / -accent on the call. Not used now: the "Joining..." glow
  // takes the Gen AI sparkle colors (--app-genai-*, app.css). Kept to switch back.
  // In the product the developers compute them; here we try the pixels first and fall back to
  // data.js, because from file:// the browser won't let the page read them.
  function paletteFrom(img) {
    var size = 12;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    var d = ctx.getImageData(0, 0, size, size).data; // throws when the image may not be read
    var px = [];
    for (var i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
    function lum(p) { return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; }
    function dist(p, c) { return Math.pow(p[0] - c[0], 2) + Math.pow(p[1] - c[1], 2) + Math.pow(p[2] - c[2], 2); }
    function sat(p) { return Math.max.apply(null, p) - Math.min.apply(null, p); }
    px.sort(function (a, b) { return lum(a) - lum(b); });
    var cents = [px[Math.floor(px.length / 6)], px[Math.floor(px.length / 2)], px[Math.floor(px.length * 5 / 6)]];
    for (var round = 0; round < 12; round++) {
      var groups = [[], [], []];
      px.forEach(function (p) {
        var best = 0;
        cents.forEach(function (c, j) { if (dist(p, c) < dist(p, cents[best])) best = j; });
        groups[best].push(p);
      });
      cents = groups.map(function (g, j) {
        if (!g.length) return cents[j];
        return [0, 1, 2].map(function (k) {
          return Math.round(g.reduce(function (sum, p) { return sum + p[k]; }, 0) / g.length);
        });
      });
    }
    cents.sort(function (a, b) { return lum(a) - lum(b); });
    var accent = px.reduce(function (a, b) { return sat(b) > sat(a) ? b : a; });
    function hex(c) { return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
    return { dark: hex(cents[0]), mid: hex(cents[1]), light: hex(cents[2]), accent: hex(accent) };
  }

  (function applyPalette() {
    var img = avatarCall.querySelector('.app-avatar-call-video');
    var src = img.getAttribute('src');
    function set(p) {
      if (!p) return;
      Object.keys(p).forEach(function (k) { avatarCall.style.setProperty('--app-image-' + k, p[k]); });
    }
    function measure() {
      try { set(paletteFrom(img)); } catch (err) { set(data.avatarPalettes[src]); }
    }
    if (img.complete && img.naturalWidth) measure();
    else { set(data.avatarPalettes[src]); img.addEventListener('load', measure, { once: true }); }
  })();
  var callForm = document.getElementById('call-form');
  var callCaption = document.getElementById('call-caption');
  var callEnd = avatarCall.querySelector('.app-avatar-call-end');
  var callTimers = [];
  var callOpener = null;

  function later(fn, ms) { callTimers.push(setTimeout(fn, ms)); }

  // What the avatar "says", as captions over the video
  function say(text) {
    callCaption.hidden = false;
    callCaption.textContent = text;
    callCaption.classList.remove('app-call-caption-in');
    void callCaption.offsetWidth;
    callCaption.classList.add('app-call-caption-in');
  }

  function setCallForm(on) {
    callForm.hidden = !on;
    avatarCall.classList.toggle('has-form', on);
    if (!on) callForm.innerHTML = '';
  }

  // Wide call: the avatar frame takes the form card's height, so the two share top and bottom
  // (the visible form area: when the card is taller than the screen it scrolls, the avatar does not grow with it)
  if (window.ResizeObserver) new ResizeObserver(function () {
    if (callForm.hidden) avatarCall.style.removeProperty('--app-call-form-h');
    else avatarCall.style.setProperty('--app-call-form-h', callForm.offsetHeight + 'px');
  }).observe(callForm);

  function openCallForm() {
    setCallForm(true);
    callForm.appendChild(createForm({
      context: 'call',
      onSubmit: function () { say(data.form.callDone); },
      onSkip: function () { setCallForm(false); say(data.form.callSkip); callEnd.focus({ preventScroll: true }); },
      onClose: function () { setCallForm(false); callEnd.focus({ preventScroll: true }); }
    }));
  }

  function setAvatarCall(on) {
    if (on && !avatarCall.hidden) return;
    avatarCall.hidden = !on;
    if (!on && typeof setMicMenu === 'function') setMicMenu(false);
    callTimers.forEach(clearTimeout);
    callTimers = [];
    setCallForm(false);
    callCaption.hidden = true;
    avatarCall.classList.toggle('is-joining', on);
    if (on) {
      callOpener = document.activeElement;
      callEnd.focus({ preventScroll: true });
      // The avatar joins, says hello, then the form opens
      later(function () { avatarCall.classList.remove('is-joining'); }, 2500);
      later(function () { say(data.form.callIntro); }, 3100);
      later(openCallForm, 4300);
    } else if (callOpener && callOpener.isConnected) {
      callOpener.focus({ preventScroll: true });
    }
  }

  // ----- Mic device menu (prototype-only: menu that opens upward) -----
  var micBtn = document.getElementById('mic-menu-btn');
  var micMenu = document.getElementById('mic-menu');
  var CHECK = '<ds-icon class="ds-select-item-trailing" name="check" size="16"></ds-icon>';

  micMenu.innerHTML = data.devices.map(function (g, gi) {
    return '<div class="ds-select-separator">' +
        (gi > 0 ? '<hr class="ds-select-separator-line">' : '') +
        '<span class="ds-select-separator-title">' + esc(g.title) + '</span></div>' +
      g.items.map(function (d) {
        return '<button class="ds-select-item" type="button" role="menuitemradio" data-device-group="' + g.group + '"' +
          ' aria-checked="' + (d.checked ? 'true' : 'false') + '" title="' + esc(d.label) + '">' +
          '<span class="ds-select-item-label ds-text-truncate">' + esc(d.label) + '</span>' +
          (d.checked ? CHECK : '') + '</button>';
      }).join('');
  }).join('');

  function menuItems() { return Array.prototype.slice.call(micMenu.querySelectorAll('.ds-select-item')); }

  function setMicMenu(open, focusFirst) {
    micMenu.hidden = !open;
    micBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && focusFirst) menuItems()[0].focus();
  }

  micBtn.addEventListener('click', function (e) {
    setMicMenu(micMenu.hidden, e.detail === 0);
  });

  micMenu.addEventListener('click', function (e) {
    var item = e.target.closest('.ds-select-item');
    if (!item) return;
    var group = item.getAttribute('data-device-group');
    micMenu.querySelectorAll('[data-device-group="' + group + '"]').forEach(function (b) {
      b.setAttribute('aria-checked', 'false');
      var c = b.querySelector('.ds-select-item-trailing');
      if (c) c.remove();
    });
    item.setAttribute('aria-checked', 'true');
    item.insertAdjacentHTML('beforeend', CHECK);
    setMicMenu(false);
    micBtn.focus();
  });

  micMenu.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    var items = menuItems();
    var i = items.indexOf(document.activeElement);
    i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[i].focus();
  });

  document.addEventListener('click', function (e) {
    if (!micMenu.hidden && !e.target.closest('.app-avatar-call-mic-wrap')) setMicMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!micMenu.hidden) { setMicMenu(false); micBtn.focus(); return; }
    // Escape inside the form (e.g. closing a select) doesn't end the call
    if (!avatarCall.hidden && !e.target.closest('.app-form')) setAvatarCall(false);
  });

  // ----- Theme panel (prototype-only) -----
  var themeSwitch = document.getElementById('theme-switch');
  function syncThemeSwitch() {
    var theme = DS.getTheme();
    themeSwitch.querySelectorAll('.ds-segmented-item').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-value') === theme ? 'true' : 'false');
    });
  }
  syncThemeSwitch();
  themeSwitch.addEventListener('ds-change', function (e) { DS.setTheme(e.detail.value); });
  document.addEventListener('ds-theme-change', function () { syncThemeSwitch(); sendThemeToPhone(); });

  // ----- Views (prototype-only): Full screen / Side panel / Mobile -----
  var phoneStage = document.getElementById('phone-stage');
  var phone = document.getElementById('phone');
  var phoneScreen = document.getElementById('phone-screen');
  var viewSwitch = document.getElementById('view-switch');
  var phoneSwitch = document.getElementById('phone-switch');
  var VIEW_KEY = 'genie-form-view';
  var PHONE_KEY = 'genie-form-phone';
  var view = 'full';
  var phoneSize = data.phones[0];

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function stored(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  function syncSegmented(group, value) {
    group.querySelectorAll('.ds-segmented-item').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-value') === value ? 'true' : 'false');
    });
  }

  function setView(v) {
    view = v;
    document.body.classList.toggle('app-view-panel', v === 'panel');
    document.body.classList.toggle('app-view-mobile', v === 'mobile');
    document.body.classList.remove('app-panel-closed');
    phoneStage.hidden = v !== 'mobile';
    if (v === 'mobile' && !phoneScreen.getAttribute('src')) phoneScreen.setAttribute('src', 'index.html?embed=1');
    syncSegmented(viewSwitch, v);
    if (!EMBED) store(VIEW_KEY, v);
    if (fieldsPanel && !fieldsPanel.hidden) placeFieldsPanel();
    fitPhone();
    syncNarrow();
  }

  phoneSwitch.innerHTML = data.phones.map(function (p) {
    return '<button class="ds-segmented-item" role="radio" aria-checked="false" data-value="' + p.value + '"><span>' + esc(p.label) + '</span></button>';
  }).join('');

  function setPhone(value) {
    phoneSize = data.phones.filter(function (p) { return p.value === value; })[0] || data.phones[0];
    syncSegmented(phoneSwitch, phoneSize.value);
    store(PHONE_KEY, phoneSize.value);
    fitPhone();
  }

  // Phone frame at the device's real size (100%), centered on the screen. The stage scrolls when the frame
  // is bigger than the window.
  function fitPhone() {
    phone.style.setProperty('--app-phone-w', phoneSize.width + 'px');
    phone.style.setProperty('--app-phone-h', phoneSize.height + 'px');
  }
  window.addEventListener('resize', fitPhone);

  // ----- Form fields panel (prototype-only): 1-8 fields -----
  var fieldsPanel = document.getElementById('fields-panel');
  var fieldsBtn = document.getElementById('fields-btn');
  var fieldsSwitch = document.getElementById('fields-switch');
  var fieldsList = document.getElementById('fields-list');
  var FIELDS_KEY = 'genie-form-fields';

  fieldsSwitch.innerHTML = data.form.fields.map(function (x, i) {
    return '<button class="ds-segmented-item" role="radio" aria-checked="false" data-value="' + (i + 1) + '" aria-label="' + (i + 1) + ' fields"><span>' + (i + 1) + '</span></button>';
  }).join('');

  function setFieldCount(n) {
    n = Math.max(1, Math.min(data.form.fields.length, parseInt(n, 10) || data.form.fields.length));
    fieldCount = n;
    syncSegmented(fieldsSwitch, String(n));
    fieldsBtn.querySelector('span').textContent = 'Form fields: ' + n;
    fieldsList.innerHTML = data.form.fields.map(function (x, i) {
      return '<li class="app-fields-item' + (i < n ? ' is-on' : '') + '">' +
        '<ds-icon name="' + (i < n ? 'check' : 'minus') + '" size="16"></ds-icon><span>' + esc(x.label) + '</span></li>';
    }).join('');
    if (!EMBED) store(FIELDS_KEY, String(n));
    document.querySelectorAll('.app-form').forEach(function (card) { if (card.redraw) card.redraw(); });
    sendThemeToPhone();
  }

  // Opens right above the demo panel (its height changes with the view)
  function placeFieldsPanel() {
    var top = document.getElementById('demo-panel').getBoundingClientRect().top;
    fieldsPanel.style.bottom = (window.innerHeight - top) + 'px';
  }
  window.addEventListener('resize', function () { if (!fieldsPanel.hidden) placeFieldsPanel(); });

  function setFieldsPanel(open) {
    if (open) placeFieldsPanel();
    fieldsPanel.hidden = !open;
    fieldsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) fieldsSwitch.querySelector('[aria-checked="true"]').focus();
  }
  fieldsBtn.addEventListener('click', function () { setFieldsPanel(fieldsPanel.hidden); });
  fieldsPanel.querySelector('[data-action="close-fields"]').addEventListener('click', function () { setFieldsPanel(false); fieldsBtn.focus(); });
  fieldsSwitch.addEventListener('ds-change', function (e) { setFieldCount(e.detail.value); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !fieldsPanel.hidden && fieldsPanel.contains(e.target)) { setFieldsPanel(false); fieldsBtn.focus(); }
  });

  // ----- Form look (prototype-only): always the ARE wizard look (the "Before" look was dropped) -----
  document.documentElement.setAttribute('data-form-look', 'after');

  // ----- Done step background in the ARE look (prototype-only): green = the ARE wash, plain = --ds-background -----
  var washSwitch = document.getElementById('wash-switch');
  var WASH_KEY = 'genie-form-wash';
  function doneWash() { return document.documentElement.getAttribute('data-done-wash') || 'plain'; }
  function setWash(wash) {
    document.documentElement.setAttribute('data-done-wash', wash);
    syncSegmented(washSwitch, wash);
    if (!EMBED) store(WASH_KEY, wash);
    sendThemeToPhone();
  }
  washSwitch.addEventListener('ds-change', function (e) { setWash(e.detail.value); });

  // ----- Form card (prototype-only): white = --ds-background + stroke, gray = --ds-paper, no stroke -----
  var cardSwitch = document.getElementById('card-switch');
  var CARD_KEY = 'genie-form-card';
  function formCard() { return document.documentElement.getAttribute('data-form-card') || 'white'; }
  function setFormCard(c) {
    document.documentElement.setAttribute('data-form-card', c);
    syncSegmented(cardSwitch, c);
    if (!EMBED) store(CARD_KEY, c);
    sendThemeToPhone();
  }
  cardSwitch.addEventListener('ds-change', function (e) { setFormCard(e.detail.value); });

  // ----- Follow-up chips (prototype-only): on/off for the chips above the bottom composer after the form is sent -----
  var chipsSwitch = document.getElementById('chips-switch');
  var CHIPS_KEY = 'genie-chips';
  function chipsState() { return document.documentElement.getAttribute('data-chips') || 'on'; }
  function setChips(c) {
    document.documentElement.setAttribute('data-chips', c);
    syncSegmented(chipsSwitch, c);
    if (!EMBED) store(CHIPS_KEY, c);
    sendThemeToPhone();
  }
  chipsSwitch.addEventListener('ds-change', function (e) { setChips(e.detail.value); });

  // ----- Page background (prototype-only): plain = --ds-background, gradient = background -> tone-7, gradient-dark = -> tone-6, gradient-gray = tone-7 -> tone-6 -----
  var bgSwitch = document.getElementById('bg-switch');
  var BG_KEY = 'genie-page-bg';
  function pageBg() { return document.documentElement.getAttribute('data-page-bg') || 'plain'; }
  function setPageBg(bg) {
    document.documentElement.setAttribute('data-page-bg', bg);
    syncSegmented(bgSwitch, bg);
    if (!EMBED) store(BG_KEY, bg);
    sendThemeToPhone();
  }
  bgSwitch.addEventListener('ds-change', function (e) { setPageBg(e.detail.value); });

  // The phone frame is the same page in an iframe: send it the theme and the form look
  function sendThemeToPhone() {
    if (phoneScreen.getAttribute('src') && phoneScreen.contentWindow) {
      phoneScreen.contentWindow.postMessage({ type: 'app-theme', theme: DS.getTheme(), fields: fieldCount, wash: doneWash(), bg: pageBg(), card: formCard(), chips: chipsState() }, '*');
    }
  }
  phoneScreen.addEventListener('load', sendThemeToPhone);
  window.addEventListener('message', function (e) {
    if (!EMBED || !e.data || e.data.type !== 'app-theme') return;
    if (e.data.theme !== DS.getTheme()) DS.setTheme(e.data.theme);
    if (e.data.fields && e.data.fields !== fieldCount) setFieldCount(e.data.fields);
    if (e.data.wash && e.data.wash !== doneWash()) setWash(e.data.wash);
    if (e.data.bg && e.data.bg !== pageBg()) setPageBg(e.data.bg);
    if (e.data.card && e.data.card !== formCard()) setFormCard(e.data.card);
    if (e.data.chips && e.data.chips !== chipsState()) setChips(e.data.chips);
  });

  viewSwitch.addEventListener('ds-change', function (e) { setView(e.detail.value); });
  phoneSwitch.addEventListener('ds-change', function (e) { setPhone(e.detail.value); });
  setFieldCount(EMBED ? data.form.fields.length : (stored(FIELDS_KEY) || data.form.fields.length));
  setWash(EMBED ? 'plain' : (stored(WASH_KEY) || 'plain'));
  setPageBg(EMBED ? 'plain' : (stored(BG_KEY) || 'plain'));
  setFormCard(EMBED ? 'white' : (stored(CARD_KEY) || 'white'));
  setChips(EMBED ? 'on' : (stored(CHIPS_KEY) || 'on'));
  setPhone(stored(PHONE_KEY) || '375');
  setView(EMBED ? 'full' : (stored(VIEW_KEY) || 'full'));

  // ----- Clicks -----
  document.addEventListener('click', function (e) {
    var sug = e.target.closest('[data-suggestion]');
    if (sug) { send(sug.getAttribute('data-suggestion')); return; }

    var preset = e.target.closest('.app-composer-preset');
    if (preset) {
      var wasOn = preset.getAttribute('aria-pressed') === 'true';
      document.querySelectorAll('.app-composer-preset').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      preset.setAttribute('aria-pressed', wasOn ? 'false' : 'true');
      return;
    }

    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.getAttribute('data-action')) {
      case 'new-thread': newThread(); input.focus(); break;
      case 'ask-anything':
        // Side panel: opens the panel. Full screen: starts a new thread.
        if (view === 'panel' && document.body.classList.contains('app-panel-closed')) {
          document.body.classList.remove('app-panel-closed');
          syncNarrow();
          input.focus();
        } else { newThread(); input.focus(); }
        break;
      case 'expand-panel': setView('full'); break;
      case 'close-panel':
        setAvatarCall(false);
        document.body.classList.add('app-panel-closed');
        document.querySelector('.app-header-ask').focus();
        break;
      case 'history': DS.showToast({ message: 'History is not part of this prototype.' }); break;
      case 'start-avatar-call': setAvatarCall(true); break;
      case 'end-avatar-call': setAvatarCall(false); break;
      case 'show-more': DS.showToast({ message: 'All recommended channels are shown.' }); break;
      case 'start-watching':
      case 'open-source': DS.showToast({ message: 'Playback is not part of this prototype.' }); break;
      case 'subscribe':
        var on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.querySelector('ds-icon').setAttribute('name', on ? 'check' : 'add');
        btn.querySelector('span').textContent = on ? 'Subscribed' : 'Subscribe';
        break;
      case 'copy': DS.showToast({ type: 'success', message: 'Answer copied.' }); break;
      case 'like':
      case 'dislike':
        var name = btn.getAttribute('data-action');
        var icon = btn.querySelector('ds-icon');
        var filled = icon.getAttribute('name') === name;
        icon.setAttribute('name', filled ? name + '-hollow' : name);
        break;
    }
  });
})();
