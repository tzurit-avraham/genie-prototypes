/* app.js - Demo interaction logic:
   - Initial state: all UI elements vertically centered inside widget body
   - Composer starts inside the initial centered state; moves to pinned bottom bar on turn 1
   - 8px gap between agent avatar and answer
   - Sources show overlapping thumbnails (matches Figma 18540:13118)
   - Auto-copies script to clipboard on input focus
   - Submit button dynamically switches to ds-btn-primary when input has text
   - Pulsing processing state before agent response
   - GenUI formatted card for Turn 2 with individual section boxes, single media preview with thumbnail, and Learn more per module
   - Piece 4: Step-by-step Meeting Scheduler Wizard (Form -> Slots -> Confirmation)
*/

(function () {
  var data = window.APP_DATA;
  var currentTurnIndex = 0;

  var genie = document.getElementById('genie');
  var genieCollapsed = document.getElementById('genie-collapsed');
  var genieInitial = document.getElementById('genie-initial');
  var chatStream = document.getElementById('chat-stream');
  var processingIndicator = document.getElementById('processing-indicator');
  var genieBody = document.getElementById('genie-body');

  var composerBox = document.getElementById('composer-box');
  var initialComposerSlot = document.getElementById('initial-composer-slot');
  var bottomComposerBar = document.getElementById('bottom-composer-bar');

  var composerWrap = document.getElementById('composer-wrap');
  var canvasPanel = document.getElementById('canvas-panel');

  var input = document.getElementById('prompt-input');
  var submit = document.getElementById('prompt-submit');

  var genieUnread = document.getElementById('genie-unread');
  var genieTeaser = document.getElementById('genie-teaser');
  document.getElementById('genie-teaser-text').textContent = data.genie.greeting.text;
  var greetingPending = false;

  // Sound effect when incoming messages arrive
  var popSound = new Audio('assets/Ni%20Sound%20-%20Clear%20UI%20-%20Simple%20Modern%20Pop.wav');
  function playPop() {
    try {
      popSound.currentTime = 0;
      popSound.play().catch(function () {});
    } catch (e) {}
  }

  // Sound effect when the user sends a message
  var sendSound = new Audio('assets/sent-message.mp3');
  function playSend() {
    try {
      sendSound.currentTime = 0;
      sendSound.play().catch(function () {});
    } catch (e) {}
  }

  // Sound effect when the meeting is booked
  var successSound = new Audio('assets/booking-success.mp3');
  function playSuccess() {
    try {
      successSound.currentTime = 0;
      successSound.play().catch(function () {});
    } catch (e) {}
  }

  // Auto-resize textarea to fit content and avoid inner scroll
  function autoResizeInput() {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  }

  // Place composer inside initial centered slot at start
  initialComposerSlot.insertBefore(composerBox, initialComposerSlot.firstChild);

  // ----- Toggle collapsed / expanded state -----
  function openGenie() {
    genieCollapsed.hidden = true;
    genie.hidden = false;
    if (greetingPending) {
      greetingPending = false;
      setUnread(false);
      renderGreeting();
    }
    input.focus();
  }

  function collapseGenie() {
    genie.hidden = true;
    genieCollapsed.hidden = false;
  }

  genieCollapsed.addEventListener('click', openGenie);

  // ----- Proactive greeting: sound + red dot on the launcher; message shows when the widget opens -----
  function setUnread(on) {
    genieUnread.hidden = !on;
    genieTeaser.hidden = !on;
    genieCollapsed.setAttribute('aria-label', on ? 'Open Ask anything, 1 new message' : 'Open Ask anything');
  }

  function receiveGreeting() {
    if (chatStream.children.length) return; // conversation already started
    playPop();
    if (genie.hidden) {
      greetingPending = true;
      setUnread(true);
    } else {
      renderGreeting();
    }
  }

  function renderGreeting() {
    var g = data.genie.greeting;
    enterChatMode();

    var msg = document.createElement('div');
    msg.className = 'app-agent-msg app-chunk-in';
    msg.innerHTML =
      '<div class="app-agent-header"><div class="app-agent-avatar"><img src="assets/chat-avatar.png" alt="Kaltura Genie"></div></div>' +
      '<div class="app-agent-content">' +
        '<p>' + g.text + '</p>' +
      '</div>';
    chatStream.appendChild(msg);
    revealChunks(msg.querySelector('.app-agent-content'));
    setFollowUps(g.suggestions);
  }

  // ----- Follow-up bubbles above the composer (replaced on every agent answer, cleared on send) -----
  function setFollowUps(list) {
    var followUpsEl = document.getElementById('followups');
    list = list || [];
    followUpsEl.innerHTML = list.map(function (s) {
      return '<button class="app-followup" type="button" data-suggestion="' + s + '">' + s + '</button>';
    }).join('');
    followUpsEl.hidden = list.length === 0;
  }

  var greetingTimer = setTimeout(receiveGreeting, data.genie.greeting.delay);

  // ----- Close (X): reset the demo to its page-load state -----
  var session = 0; // bumps on reset so pending agent replies are dropped

  // ----- Avatar call: clicking the avatar (start screen or composer) opens the call view -----
  var avatarCall = document.getElementById('avatar-call');
  var avatarJoinTimer = null;
  function setAvatarCall(on) {
    avatarCall.hidden = !on;
    clearTimeout(avatarJoinTimer);
    // Show "Joining..." first, then the avatar
    avatarCall.classList.toggle('is-joining', on);
    var video = document.getElementById('avatar-call-video');
    video.pause();
    if (on) {
      avatarJoinTimer = setTimeout(function () {
        avatarCall.classList.remove('is-joining');
        // Autoplay from the start once the avatar has joined (no controls)
        video.currentTime = 0;
        video.play().catch(function () {});
      }, 2500);
    }
  }

  function resetGenie() {
    setAvatarCall(false);
    session++;
    clearTimeout(greetingTimer);
    setFullscreen(false);
    closeCanvas(); // also stops the video player
    chatStream.innerHTML = '';
    setFollowUps([]);
    processingIndicator.hidden = true;
    currentTurnIndex = 0;
    wizBusy = false;

    input.value = '';
    input.style.height = '';
    syncSubmitButton();

    initialComposerSlot.insertBefore(composerBox, initialComposerSlot.firstChild);
    bottomComposerBar.hidden = true;
    genieInitial.hidden = false;
    genieBody.scrollTop = 0;

    greetingPending = false;
    setUnread(false);
    collapseGenie();
    greetingTimer = setTimeout(receiveGreeting, data.genie.greeting.delay);
  }

  // Mode select dropdown
  var menu = document.querySelector('#mode-select .ds-select-menu');
  data.genie.modes.forEach(function (opt) {
    var item = document.createElement('button');
    item.className = 'ds-select-item';
    item.setAttribute('role', 'option');
    item.setAttribute('data-value', opt.value);
    item.innerHTML = '<span class="ds-select-item-label">' + opt.label + '</span>';
    if (opt.selected) item.setAttribute('aria-selected', 'true');
    menu.appendChild(item);
  });

  // ----- Clipboard Helper on input focus -----
  input.addEventListener('focus', function () {
    var turnData = data.scenario[currentTurnIndex];
    if (turnData && turnData.userPrompt && navigator.clipboard) {
      navigator.clipboard.writeText(turnData.userPrompt).then(function () {
        console.log('[Demo] Copied current turn prompt to clipboard:', turnData.userPrompt);
      }).catch(function () {
        // Fallback silently if clipboard permission is denied
      });
    }
  });

  // ----- Dynamic Submit Button (ds-btn-primary when filled) -----
  function syncSubmitButton() {
    var hasText = input.value.trim().length > 0;
    submit.disabled = !hasText;
    if (hasText) {
      submit.classList.remove('ds-btn-secondary');
      submit.classList.add('ds-btn-primary');
    } else {
      submit.classList.remove('ds-btn-primary');
      submit.classList.add('ds-btn-secondary');
    }
  }

  input.addEventListener('input', function () {
    autoResizeInput();
    syncSubmitButton();
  });

  // Switch from the centered start screen to the chat layout (composer pinned to the bottom)
  function enterChatMode() {
    if (genieInitial.hidden) return;
    genieInitial.hidden = true;
    composerWrap.appendChild(composerBox);
    bottomComposerBar.hidden = false;
  }

  // ----- Send message and trigger agent turn -----
  function sendMessage() {
    var text = input.value.trim();
    if (!text) return;

    // 1. First turn transition: hide initial centered greeting, move composer to pinned bottom bar
    enterChatMode();

    // 2. Append user message bubble
    var userMsg = document.createElement('div');
    userMsg.className = 'app-user-msg';
    userMsg.innerHTML = '<div class="app-user-bubble">' + text + '</div>';
    chatStream.appendChild(userMsg);
    playSend();

    setFollowUps([]);

    // Reset input
    input.value = '';
    autoResizeInput();
    syncSubmitButton();
    scrollToBottom();

    // 3. Show processing state
    processingIndicator.hidden = false;
    scrollToBottom();

    // 4. Simulate realistic agent delay (1.2s)
    var sentIn = session;
    setTimeout(function () {
      if (sentIn !== session) return; // widget was reset while waiting
      processingIndicator.hidden = true;
      playPop();
      renderAgentTurn(currentTurnIndex);
      currentTurnIndex++;
      scrollToBottom();
    }, 1200);
  }

  // Render agent message (Turn 1: standard, Turn 2: GenUI card, Turn 3: Wizard)
  function renderAgentTurn(turnIndex) {
    var turn = data.scenario[turnIndex];
    if (!turn) return;

    var resp = turn.agentResponse;
    var agentMsg = document.createElement('div');
    agentMsg.className = 'app-agent-msg app-chunk-in';

    var bodyHtml = '';

    if (resp.type === 'standard') {
      // Turn 1 format: text + highlights + recommended media card
      var highlightsHtml = resp.highlights.map(function (h) {
        return '<li>' + h + '</li>';
      }).join('');

      bodyHtml =
        '<p>' + resp.text + '</p>' +
        '<p><strong>' + resp.highlightsTitle + '</strong></p>' +
        '<ul class="app-agent-highlights">' + highlightsHtml + '</ul>' +
        // Recommended video, shown as a resource row like the PDF list
        '<article class="app-resource-row" data-action="play-video" style="cursor: pointer;" aria-label="Play video: ' + resp.recommendedMedia.title + '">' +
          '<div class="app-resource-thumb app-resource-thumb-video">' +
            '<img src="' + resp.recommendedMedia.thumbnail + '" alt="">' +
            '<span class="ds-btn-circular ds-btn-circular-sm" aria-hidden="true"><ds-icon name="play"></ds-icon></span>' +
            '<span class="ds-badge-duration app-resource-duration">' + resp.recommendedMedia.duration + '</span>' +
          '</div>' +
          '<div class="app-resource-body">' +
            '<p class="app-resource-eyebrow">' + resp.recommendedMedia.eyebrow + '</p>' +
            '<h4 class="app-resource-title"><span>' + resp.recommendedMedia.title + '</span></h4>' +
            '<p class="app-resource-desc">' + resp.recommendedMedia.description + ' ' +
              '<span class="ds-chip app-resource-chip"><ds-icon name="video" size="16"></ds-icon><span class="ds-chip-content">' + resp.recommendedMedia.sourceTag + '</span></span>' +
            '</p>' +
          '</div>' +
        '</article>';
    } else if (resp.type === 'genui') {
      // Turn 2 GenUI format: clean, unboxed layout with DS components only
      var card = resp.card;
      var sectionsHtml = card.sections.map(function (sec, index) {
        return (
          '<article class="app-resource-row" data-pdf-index="' + index + '" style="cursor: pointer;">' +
            '<div class="app-resource-thumb">' +
              '<img src="' + sec.media.thumbnail + '" alt="">' +
            '</div>' +
            '<div class="app-resource-body">' +
              '<p class="app-resource-eyebrow">' + sec.eyebrow + '</p>' +
              '<h4 class="app-resource-title">' +
                '<span>' + sec.title + '</span>' +
              '</h4>' +
              '<p class="app-resource-desc">' + sec.text + ' ' +
                '<span class="ds-chip app-resource-chip"><ds-icon name="file" size="16"></ds-icon><span class="ds-chip-content">' + sec.sourceTag + '</span></span>' +
              '</p>' +
            '</div>' +
          '</article>'
        );
      }).join('');

      bodyHtml =
        '<p>' + resp.intro + '</p>' +
        '<div class="app-genui-card">' +
          '<div class="app-genui-header">' +
            '<h4 class="app-genui-title">' + card.title + '</h4>' +
          '</div>' +
          '<div class="app-genui-sections">' +
            sectionsHtml +
          '</div>' +
        '</div>';
    } else if (resp.type === 'wizard') {
      // Turn 3: Step-by-step meeting scheduler wizard
      var wiz = resp.wizard;
      var s1 = wiz.step1;

      var fieldsHtml = s1.fields.map(function (f) {
        var spanClass = (f.id === 'wiz-company' || f.id === 'wiz-email') ? ' span-2' : '';
        return (
          '<div class="ds-form-field' + spanClass + '">' +
            '<label class="ds-form-label" for="' + f.id + '">' + f.label + '</label>' +
            '<input class="ds-input ds-input-md" id="' + f.id + '" value="' + f.value + '">' +
          '</div>'
        );
      }).join('');

      bodyHtml =
        '<p>' + resp.intro + '</p>' +
        '<div class="app-wizard-card" id="meeting-wizard">' +
          '<div class="app-wizard-header">' +
            '<h3 class="app-wizard-title" id="wiz-header-title">' + s1.title + '</h3>' +
            '<div class="app-wizard-steps" id="wiz-steps" data-step="1" role="img" aria-label="' + s1.subtitle + '">' +
              '<span class="app-wizard-step-seg"></span>' +
              '<span class="app-wizard-step-seg"></span>' +
            '</div>' +
          '</div>' +
          '<div class="app-wizard-body" id="wiz-body">' +
            '<div class="app-wizard-grid">' + fieldsHtml + '</div>' +
          '</div>' +
          '<div class="app-wizard-footer" id="wiz-footer">' +
            '<button class="ds-btn ' + wizBtnSize() + ' ds-btn-primary" id="wiz-next-btn" type="button">' + s1.buttonLabel + '</button>' +
          '</div>' +
        '</div>';
    } else if (resp.type === 'qualify') {
      // Turn 4: qualification questions, one at a time (filled by renderQualifyStep)
      var segsHtml = resp.questions.map(function () {
        return '<span class="app-wizard-step-seg"></span>';
      }).join('');

      bodyHtml =
        '<p>' + resp.intro + '</p>' +
        '<div class="app-wizard-card" id="qualify-card">' +
          '<div class="app-wizard-header">' +
            '<h3 class="app-wizard-title" id="qualify-title"></h3>' +
            '<div class="app-wizard-steps" id="qualify-steps" role="img">' + segsHtml + '</div>' +
          '</div>' +
          '<div class="app-wizard-body" id="qualify-body"></div>' +
          '<div class="app-wizard-footer" id="qualify-footer"></div>' +
        '</div>';
    }

    // Follow-ups show as bubbles above the composer, not inside the message
    var nextStepsHtml = '';
    setFollowUps(resp.nextSuggestions);

    // Actions & sources toolbar (omitted for wizard and qualification cards)
    var actionsHtml = '';
    if (resp.type !== 'wizard' && resp.type !== 'qualify') {
      actionsHtml =
        '<div class="app-agent-actions">' +
          '<button class="ds-btn ds-btn-md ds-btn-secondary ds-btn-borderless ds-btn-icon" aria-label="Share"><ds-icon name="share"></ds-icon></button>' +
          '<button class="ds-btn ds-btn-md ds-btn-secondary ds-btn-borderless ds-btn-icon" aria-label="Copy"><ds-icon name="copy"></ds-icon></button>' +
          '<button class="ds-btn ds-btn-md ds-btn-secondary ds-btn-borderless ds-btn-icon" aria-label="Like"><ds-icon name="like-hollow"></ds-icon></button>' +
          '<button class="ds-btn ds-btn-md ds-btn-secondary ds-btn-borderless ds-btn-icon" aria-label="Dislike"><ds-icon name="dislike-hollow"></ds-icon></button>' +
          '<div class="app-agent-sources">' +
            '<div class="app-sources-thumbs">' +
              '<div class="app-source-thumb"><img src="assets/source-1.png" alt=""></div>' +
              '<div class="app-source-thumb"><img src="assets/source-2.png" alt=""></div>' +
              '<div class="app-source-thumb"><img src="assets/source-3.png" alt=""></div>' +
            '</div>' +
            '<span class="app-sources-label">' + resp.sourcesCount + ' sources</span>' +
          '</div>' +
        '</div>';
    }

    agentMsg.innerHTML =
      '<div class="app-agent-header">' +
        '<div class="app-agent-avatar"><img src="assets/chat-avatar.png" alt="Kaltura Genie"></div>' +
      '</div>' +
      '<div class="app-agent-content">' +
        bodyHtml +
        actionsHtml +
        nextStepsHtml +
      '</div>';

    chatStream.appendChild(agentMsg);
    revealChunks(agentMsg.querySelector('.app-agent-content'));

    // Form fields cascade in once the wizard card appears (offset so the card leads)
    if (resp.type === 'wizard') {
      staggerWizard(agentMsg.querySelector('.app-wizard-card'), 3);
    }

    if (resp.type === 'qualify') {
      qualifyAnswers = {};
      renderQualifyStep(0);
      staggerWizard(agentMsg.querySelector('.app-wizard-card'), 3);
    }
  }

  // ----- Proactive follow-up message (typing indicator, then the message with a next-step button) -----
  function sendFollowUp(f) {
    var sentIn = session;
    setTimeout(function () {
      if (sentIn !== session) return;
      processingIndicator.hidden = false;
      scrollToBottom();

      setTimeout(function () {
        if (sentIn !== session) return;
        processingIndicator.hidden = true;
        playPop();

        var msg = document.createElement('div');
        msg.className = 'app-agent-msg app-chunk-in';
        msg.innerHTML =
          '<div class="app-agent-header"><div class="app-agent-avatar"><img src="assets/chat-avatar.png" alt="Kaltura Genie"></div></div>' +
          '<div class="app-agent-content">' +
            '<p>' + f.text + '</p>' +
          '</div>';
        chatStream.appendChild(msg);
        revealChunks(msg.querySelector('.app-agent-content'));
        setFollowUps([f.suggestion]);
        scrollToBottom();
      }, 1200);
    }, f.delay);
  }

  // ----- Chunk-by-chunk fade-in of agent answers -----
  // Containers are split into their children so lists, card sections and next-step buttons appear one by one
  var SPLIT_SELECTOR = '.app-agent-highlights, .app-genui-card, .app-genui-sections, .app-next-steps';
  var CHUNK_DELAY = 220;

  function collectChunks(el, out) {
    if (el.matches(SPLIT_SELECTOR)) {
      el.classList.add('app-chunk-pending');
      Array.prototype.forEach.call(el.children, function (child) { collectChunks(child, out); });
    } else {
      el.classList.add('app-chunk-pending');
      out.push(el);
    }
  }

  function revealChunks(content) {
    var chunks = [];
    Array.prototype.forEach.call(content.children, function (child) { collectChunks(child, chunks); });

    chunks.forEach(function (chunk, i) {
      setTimeout(function () {
        // Reveal any still-hidden parent containers along with their first chunk
        var node = chunk;
        while (node && node !== content) {
          if (node.classList.contains('app-chunk-pending')) {
            node.classList.remove('app-chunk-pending');
            node.classList.add('app-chunk-in');
          }
          node = node.parentElement;
        }
        scrollToBottom();
      }, i * CHUNK_DELAY);
    });
  }

  // ----- Step progression inside the Meeting Scheduler Wizard -----
  // ----- Wizard motion: staggered load + animated step transitions -----
  var WIZ_STAGGER = [
    '.app-wizard-grid > .ds-form-field',
    '.app-wizard-body > .ds-form-field > .ds-form-label',
    '.app-wizard-pill',
    '.app-wizard-slot-group > *',
    '.app-wizard-confirmed > *',
    '.app-qualify-step > :not(.app-qualify-checks):not(.app-wizard-pills)',
    '.app-qualify-checks > *',
    '.app-wizard-footer > *'
  ].join(', ');
  var wizBusy = false;

  // Reads a DS duration token (e.g. "0.2s") as milliseconds
  function dsMs(token) {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) * 1000;
  }

  function staggerWizard(card, offset) {
    if (!card) return;
    Array.prototype.forEach.call(card.querySelectorAll(WIZ_STAGGER), function (el, i) {
      el.style.setProperty('--i', i + offset);
      el.classList.add('app-wiz-item-in');
      el.addEventListener('animationend', function done(e) {
        if (e.target !== el) return;
        el.classList.remove('app-wiz-item-in');
        el.removeEventListener('animationend', done);
      });
    });
  }

  // Current step slides out, card resizes to the new step, new step cascades in
  function transitionWizard(cardId, direction, render) {
    var card = document.getElementById(cardId);
    if (!card || wizBusy) return;
    wizBusy = true;

    var startHeight = card.offsetHeight;
    card.style.height = startHeight + 'px';
    card.classList.remove('app-wiz-enter-forward', 'app-wiz-enter-back');
    card.classList.add('app-wiz-busy', 'app-wiz-leave-' + direction);

    setTimeout(function () {
      if (!card.isConnected) return; // widget was reset mid-transition
      render();
      card.classList.remove('app-wiz-leave-' + direction);
      card.classList.add('app-wiz-enter-' + direction);
      staggerWizard(card, 0);

      // Measure the new step, then animate the card height to it
      card.style.height = 'auto';
      var endHeight = card.offsetHeight;
      card.style.height = startHeight + 'px';
      void card.offsetHeight;
      card.classList.add('app-wiz-resize');
      card.style.height = endHeight + 'px';

      setTimeout(function () {
        card.style.height = '';
        card.classList.remove('app-wiz-busy', 'app-wiz-resize');
        wizBusy = false;
        scrollToBottom();
      }, dsMs('--ds-duration-enter'));
    }, dsMs('--ds-duration-slow'));
  }

  // Wizard CTAs use the larger DS button size in the expanded widget
  function wizBtnSize() {
    return genie.classList.contains('app-genie-fullscreen') ? 'ds-btn-lg' : 'ds-btn-md';
  }

  // Step pills in the wizard header: '1' | '2' | 'done' (styled in CSS via data-step)
  function setWizardStep(step, label) {
    var steps = document.getElementById('wiz-steps');
    if (!steps) return;
    steps.setAttribute('data-step', step);
    steps.setAttribute('aria-label', label);
  }

  function goToWizardStep2() {
    var wiz = data.scenario[2].agentResponse.wizard;
    var s2 = wiz.step2;

    document.getElementById('wiz-header-title').textContent = s2.title;
    setWizardStep('2', s2.subtitle);

    var datesHtml = s2.dates.map(function (d) {
      var activeClass = d.selected ? ' active' : '';
      return (
        '<button class="app-wizard-pill' + activeClass + '" type="button" data-wiz-date="' + d.date + '">' +
          '<span>' + d.label + '</span>' +
          '<span class="app-wizard-pill-sub">' + d.date + '</span>' +
        '</button>'
      );
    }).join('');

    // One stacked column per time of day (Morning, Afternoon...)
    var periods = [];
    s2.slots.forEach(function (s) {
      if (periods.indexOf(s.period) === -1) periods.push(s.period);
    });

    var slotsHtml = periods.map(function (period) {
      var buttons = s2.slots.filter(function (s) { return s.period === period; }).map(function (s) {
        var activeClass = s.selected ? ' active' : '';
        return (
          '<button class="app-wizard-slot' + activeClass + '" type="button" data-wiz-slot="' + s.time + '">' +
            s.time +
          '</button>'
        );
      }).join('');
      return (
        '<div class="app-wizard-slot-group">' +
          '<p class="ds-form-desc">' + period + '</p>' +
          buttons +
        '</div>'
      );
    }).join('');

    var body = document.getElementById('wiz-body');
    body.innerHTML =
      '<div class="ds-form-field">' +
        '<span class="ds-form-label">Date</span>' +
        '<div class="app-wizard-pills">' + datesHtml + '</div>' +
      '</div>' +
      '<div class="ds-form-field">' +
        '<span class="ds-form-label">Time (EDT)</span>' +
        '<div class="app-wizard-slots">' + slotsHtml + '</div>' +
      '</div>';

    var footer = document.getElementById('wiz-footer');
    footer.innerHTML =
      '<button class="ds-btn ' + wizBtnSize() + ' ds-btn-secondary ds-btn-borderless" id="wiz-back-btn" type="button">Back</button>' +
      '<button class="ds-btn ' + wizBtnSize() + ' ds-btn-primary" id="wiz-confirm-btn" type="button">' + s2.buttonLabel + '</button>';

    scrollToBottom();
  }

  function goToWizardStep1() {
    var wiz = data.scenario[2].agentResponse.wizard;
    var s1 = wiz.step1;

    document.getElementById('wiz-header-title').textContent = s1.title;
    setWizardStep('1', s1.subtitle);

    var fieldsHtml = s1.fields.map(function (f) {
      var spanClass = (f.id === 'wiz-company' || f.id === 'wiz-email') ? ' span-2' : '';
      return (
        '<div class="ds-form-field' + spanClass + '">' +
          '<label class="ds-form-label" for="' + f.id + '">' + f.label + '</label>' +
          '<input class="ds-input ds-input-md" id="' + f.id + '" value="' + f.value + '">' +
        '</div>'
      );
    }).join('');

    var body = document.getElementById('wiz-body');
    body.innerHTML = '<div class="app-wizard-grid">' + fieldsHtml + '</div>';

    var footer = document.getElementById('wiz-footer');
    footer.innerHTML = '<button class="ds-btn ' + wizBtnSize() + ' ds-btn-primary" id="wiz-next-btn" type="button">' + s1.buttonLabel + '</button>';

    scrollToBottom();
  }

  function goToWizardConfirmed() {
    var wiz = data.scenario[2].agentResponse.wizard;
    var conf = wiz.confirmed;

    playSuccess();
    document.getElementById('meeting-wizard').classList.add('app-wizard-booked');

    var detailsHtml = conf.details.map(function (d) {
      return (
        '<div class="app-wizard-detail-item">' +
          '<ds-icon name="' + d.icon + '" size="24"></ds-icon>' +
          '<span>' + d.label + '</span>' +
        '</div>'
      );
    }).join('');

    var body = document.getElementById('wiz-body');
    body.innerHTML =
      '<div class="app-wizard-confirmed">' +
        '<div class="app-wizard-check-badge">' +
          '<ds-icon name="check" size="24"></ds-icon>' +
        '</div>' +
        '<h4 class="app-wizard-conf-title">' + conf.title + '</h4>' +
        '<p class="app-wizard-conf-sub">' + conf.subtitle + '</p>' +
        '<div class="app-wizard-details-list">' + detailsHtml + '</div>' +
      '</div>';

    var footer = document.getElementById('wiz-footer');
    footer.innerHTML =
      '<button class="ds-btn ds-btn-sm ds-btn-secondary ds-btn-borderless" type="button" onclick="window.print()">' +
        '<ds-icon name="download" size="16"></ds-icon> Add to Calendar (.ics)' +
      '</button>';

    scrollToBottom();

    // Agent suggests prepping the meeting (leads into the qualification turn)
    if (data.scenario[2].agentResponse.followUp) sendFollowUp(data.scenario[2].agentResponse.followUp);
  }

  // ----- Qualification card (Turn 4): one question at a time, answers kept for Back / Edit -----
  var qualifyIndex = 0;
  var qualifyAnswers = {};
  var CHECK_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function qualifyData() {
    return data.scenario[3].agentResponse;
  }

  function formatRange(q, v) {
    return Number(v).toLocaleString('en-US') + (Number(v) >= q.max ? '+' : '');
  }

  function rangeFill(q, v) {
    return ((v - q.min) / (q.max - q.min) * 100) + '%';
  }

  function qualifyControlHtml(q, answer) {
    if (q.type === 'range') {
      var v = answer !== undefined ? answer : q.value;
      return (
        '<div class="app-range">' +
          '<p class="app-range-value"><strong id="qualify-range-out">' + formatRange(q, v) + '</strong> ' + q.unit + '</p>' +
          '<input type="range" class="app-range-input" id="qualify-input" aria-label="' + q.title + '"' +
            ' min="' + q.min + '" max="' + q.max + '" step="' + q.step + '" value="' + v + '"' +
            ' style="--fill: ' + rangeFill(q, v) + '">' +
          '<div class="app-range-scale"><span>' + formatRange(q, q.min) + '</span><span>' + formatRange(q, q.max) + '</span></div>' +
        '</div>'
      );
    }
    if (q.type === 'checkbox') {
      return (
        '<div class="app-qualify-checks">' +
          q.options.map(function (o) {
            var checked = answer !== undefined ? answer.indexOf(o.label) !== -1 : o.checked;
            return (
              '<label class="ds-checkbox app-qualify-check">' +
                '<input type="checkbox" class="ds-checkbox-input" value="' + o.label + '"' + (checked ? ' checked' : '') + '>' +
                '<span class="ds-checkbox-indicator">' + CHECK_SVG + '</span>' +
                '<span class="ds-checkbox-label">' + o.label + '</span>' +
              '</label>'
            );
          }).join('') +
        '</div>'
      );
    }
    if (q.type === 'pills') {
      var picked = answer !== undefined ? answer : q.value;
      return (
        '<div class="app-wizard-pills">' +
          q.options.map(function (o) {
            return (
              '<button class="app-wizard-pill' + (o.label === picked ? ' active' : '') + '" type="button" data-qualify-pill="' + o.label + '">' +
                '<span>' + o.label + '</span>' +
                '<span class="app-wizard-pill-sub">' + o.sub + '</span>' +
              '</button>'
            );
          }).join('') +
        '</div>'
      );
    }
    // text
    return '<input class="ds-input ds-input-md" id="qualify-input" aria-label="' + q.title + '" placeholder="' + q.placeholder + '" value="' + (answer || '') + '">';
  }

  // Reads the current question's control into qualifyAnswers
  function saveQualifyAnswer() {
    var q = qualifyData().questions[qualifyIndex];
    var body = document.getElementById('qualify-body');
    if (!q || !body) return;
    if (q.type === 'range') qualifyAnswers[q.id] = Number(body.querySelector('#qualify-input').value);
    if (q.type === 'text') qualifyAnswers[q.id] = body.querySelector('#qualify-input').value.trim();
    if (q.type === 'checkbox') {
      qualifyAnswers[q.id] = Array.prototype.map.call(body.querySelectorAll('.ds-checkbox-input:checked'), function (i) { return i.value; });
    }
    if (q.type === 'pills') {
      var on = body.querySelector('[data-qualify-pill].active');
      qualifyAnswers[q.id] = on ? on.getAttribute('data-qualify-pill') : q.value;
    }
  }

  function renderQualifyStep(i) {
    var qd = qualifyData();
    var q = qd.questions[i];
    var last = i === qd.questions.length - 1;
    qualifyIndex = i;

    document.getElementById('qualify-card').classList.remove('app-qualify-done');
    document.getElementById('qualify-title').textContent = qd.title;

    var steps = document.getElementById('qualify-steps');
    steps.removeAttribute('data-step');
    steps.setAttribute('aria-label', 'Question ' + (i + 1) + ' of ' + qd.questions.length);
    Array.prototype.forEach.call(steps.children, function (seg, n) {
      seg.classList.toggle('is-done', n < i);
      seg.classList.toggle('is-current', n === i);
    });

    document.getElementById('qualify-body').innerHTML =
      '<div class="app-qualify-step">' +
        '<p class="app-qualify-question">' + q.title + '</p>' +
        qualifyControlHtml(q, qualifyAnswers[q.id]) +
      '</div>';

    document.getElementById('qualify-footer').innerHTML =
      (i > 0 ? '<button class="ds-btn ' + wizBtnSize() + ' ds-btn-secondary ds-btn-borderless" id="qualify-back" type="button">Back</button>' : '') +
      '<button class="ds-btn ' + wizBtnSize() + ' ds-btn-primary" id="qualify-next" type="button">' + (last ? qd.finishLabel : qd.nextLabel) + '</button>';

    scrollToBottom();
  }

  function qualifySummary(q) {
    var a = qualifyAnswers[q.id];
    var empty = a === undefined || a === '' || (Array.isArray(a) && !a.length);
    if (empty && q.emptySummary) return q.emptySummary;
    var value = q.type === 'range' ? formatRange(q, a) : Array.isArray(a) ? a.join(', ') : a;
    return q.summary.replace('{value}', value);
  }

  function renderQualifyDone() {
    var qd = qualifyData();
    document.getElementById('qualify-card').classList.add('app-qualify-done');
    document.getElementById('qualify-steps').setAttribute('data-step', 'done');

    var detailsHtml = qd.questions.map(function (q) {
      return (
        '<div class="app-wizard-detail-item">' +
          '<ds-icon name="' + q.summaryIcon + '" size="24"></ds-icon>' +
          '<span>' + qualifySummary(q) + '</span>' +
        '</div>'
      );
    }).join('');

    document.getElementById('qualify-body').innerHTML =
      '<div class="app-wizard-confirmed">' +
        '<div class="app-wizard-check-badge"><ds-icon name="check" size="24"></ds-icon></div>' +
        '<h4 class="app-wizard-conf-title">' + qd.done.title + '</h4>' +
        '<p class="app-wizard-conf-sub">' + qd.done.subtitle + '</p>' +
        '<div class="app-wizard-details-list">' + detailsHtml + '</div>' +
      '</div>';

    document.getElementById('qualify-footer').innerHTML =
      '<button class="ds-btn ds-btn-sm ds-btn-secondary ds-btn-borderless" id="qualify-edit" type="button">' +
        '<ds-icon name="edit" size="16"></ds-icon> ' + qd.done.editLabel +
      '</button>';

    scrollToBottom();
  }

  // ----- Document canvas: side-by-side PDF viewer (Gemini-style) -----
  function pdfFooter(page) {
    return '<footer class="app-pdf-footer"><span>Kaltura · Prepared for MightyTech</span><span>' + page + '</span></footer>';
  }

  function renderPdfPages(sec) {
    var doc = sec.doc;

    var stepsHtml = doc.steps.map(function (s, i) {
      return (
        (i > 0 ? '<ds-icon name="arrow-right" size="16"></ds-icon>' : '') +
        '<div class="app-pdf-step">' +
          '<span class="app-pdf-step-num">0' + (i + 1) + '</span>' +
          '<strong>' + s.title + '</strong>' +
          '<span>' + s.text + '</span>' +
        '</div>'
      );
    }).join('');

    var sectionHtml = function (s) {
      return '<h3 class="app-pdf-h2">' + s.h + '</h3><p class="app-pdf-p">' + s.p + '</p>';
    };

    var page1 =
      '<section class="app-pdf-page">' +
        '<img class="app-pdf-cover" src="' + sec.media.thumbnail + '" alt="">' +
        '<p class="app-pdf-tag">Kaltura Enterprise Learning</p>' +
        '<h2 class="app-pdf-title">' + doc.title + '</h2>' +
        '<p class="app-pdf-sub">' + doc.subtitle + '</p>' +
        '<dl class="app-pdf-meta">' +
          '<div><dt>Prepared for</dt><dd>MightyTech</dd></div>' +
          '<div><dt>Audience</dt><dd>' + doc.audience + '</dd></div>' +
          '<div><dt>Status</dt><dd>Tailored draft</dd></div>' +
        '</dl>' +
        '<h3 class="app-pdf-h2">1. Executive summary</h3>' +
        '<p class="app-pdf-p">' + doc.summary + '</p>' +
        '<div class="app-pdf-flow">' + stepsHtml + '</div>' +
        pdfFooter(1) +
      '</section>';

    var page2 =
      '<section class="app-pdf-page">' +
        doc.sections.slice(0, 2).map(sectionHtml).join('') +
        pdfFooter(2) +
      '</section>';

    var page3 =
      '<section class="app-pdf-page">' +
        doc.sections.slice(2).map(sectionHtml).join('') +
        pdfFooter(3) +
      '</section>';

    return '<div class="app-canvas-pages app-chunk-in">' + page1 + page2 + page3 + '</div>';
  }

  function openPdfCanvas(index) {
    var turn = data.scenario[1];
    if (!turn || !turn.agentResponse || !turn.agentResponse.card) return;
    var sec = turn.agentResponse.card.sections[index];
    if (!sec || !sec.doc) return;

    // The widget stays docked on the right and the canvas expands out to its left
    setCanvasMode('pdf', sec.media.title.replace(/\s*\(PDF\)$/, ''));

    var body = document.getElementById('canvas-body');
    body.innerHTML = renderPdfPages(sec);
    body.scrollTop = 0;

    canvasPanel.hidden = false;
    genie.classList.add('app-genie-canvas-open');
  }

  // ----- Video canvas: Turn 1 thumbnail opens the Kaltura player in the side panel -----
  var canvasPlayer = null;

  function destroyCanvasPlayer() {
    if (!canvasPlayer) return;
    try { canvasPlayer.destroy(); } catch (e) {}
    canvasPlayer = null;
  }

  // Header icon, title and actions for the current canvas content ('pdf' | 'video')
  function setCanvasMode(mode, title) {
    clearTimeout(canvasCloseTimer); // reopened mid close animation
    canvasPanel.classList.remove('app-canvas-closing');
    destroyCanvasPlayer();
    genie.classList.toggle('app-genie-canvas-video', mode === 'video');
    document.getElementById('canvas-icon').setAttribute('name', mode === 'video' ? 'video' : 'pdf');
    document.getElementById('canvas-title').textContent = title;
  }

  function openVideoCanvas() {
    var media = data.scenario[0].agentResponse.recommendedMedia;

    setCanvasMode('video', media.title);

    var body = document.getElementById('canvas-body');
    body.innerHTML =
      '<div class="app-canvas-video app-chunk-in">' +
        '<img class="app-canvas-video-bg" src="' + media.thumbnail + '" alt="" aria-hidden="true">' +
        '<div class="app-media-player-wrap"><div id="kaltura_player_canvas"></div></div>' +
      '</div>';
    body.scrollTop = 0;

    canvasPanel.hidden = false;
    genie.classList.add('app-genie-canvas-open');

    if (!window.KalturaPlayer) return;
    try {
      canvasPlayer = KalturaPlayer.setup({
        targetId: 'kaltura_player_canvas',
        provider: { partnerId: 811441, uiConfId: 51773822 },
        playback: { autoplay: true }
      });
      canvasPlayer.loadMedia({ entryId: '1_qxskuo8y' });
    } catch (e) {
      console.error('[KalturaPlayer]', e.message);
    }
  }

  var canvasCloseTimer = null;

  function finishCloseCanvas() {
    clearTimeout(canvasCloseTimer);
    canvasPanel.classList.remove('app-canvas-closing');
    destroyCanvasPlayer();
    canvasPanel.hidden = true;
    genie.classList.remove('app-genie-canvas-open', 'app-genie-canvas-video');
  }

  // animate: slide the panel out before hiding it (close button). Otherwise hide at once (minimize / reset).
  function closeCanvas(animate) {
    if (canvasPanel.hidden) return;
    if (!animate) {
      finishCloseCanvas();
      return;
    }
    if (canvasPlayer) {
      try { canvasPlayer.pause(); } catch (e) {}
    }
    canvasPanel.classList.add('app-canvas-closing');
    clearTimeout(canvasCloseTimer);
    canvasCloseTimer = setTimeout(finishCloseCanvas, dsMs('--ds-duration-exit'));
  }

  function setFullscreen(on) {
    genie.classList.toggle('app-genie-fullscreen', on);
    var expandIcon = document.getElementById('expand-icon');
    if (expandIcon) expandIcon.setAttribute('name', on ? 'minimize' : 'expand');
    var toggleBtn = document.querySelector('[data-action="toggle-fullscreen"]');
    if (toggleBtn) toggleBtn.setAttribute('aria-label', on ? 'Minimize' : 'Expand');
    // Resize wizard / qualification CTAs already on screen
    document.querySelectorAll('.app-wizard-footer .ds-btn-md, .app-wizard-footer .ds-btn-lg').forEach(function (btn) {
      btn.classList.toggle('ds-btn-lg', on);
      btn.classList.toggle('ds-btn-md', !on);
    });
  }

  function scrollToBottom() {
    genieBody.scrollTop = genieBody.scrollHeight;
  }

  // Keyboard and click handlers
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  submit.addEventListener('click', sendMessage);

  // Range slider: live value + filled track
  document.addEventListener('input', function (e) {
    if (!e.target.matches('.app-range-input')) return;
    var q = qualifyData().questions[qualifyIndex];
    e.target.style.setProperty('--fill', rangeFill(q, e.target.value));
    document.getElementById('qualify-range-out').textContent = formatRange(q, e.target.value);
  });

  document.addEventListener('click', function (e) {
    // Clicking a suggestion sends it right away as the user's message
    var pill = e.target.closest('[data-suggestion]');
    if (pill) {
      input.value = pill.getAttribute('data-suggestion');
      sendMessage();
      return;
    }

    // Wizard navigation buttons
    if (e.target.closest('#wiz-next-btn')) {
      transitionWizard('meeting-wizard', 'forward', goToWizardStep2);
      return;
    }
    if (e.target.closest('#wiz-back-btn')) {
      transitionWizard('meeting-wizard', 'back', goToWizardStep1);
      return;
    }
    if (e.target.closest('#wiz-confirm-btn')) {
      transitionWizard('meeting-wizard', 'forward', goToWizardConfirmed);
      return;
    }

    // Qualification card navigation
    if (e.target.closest('#qualify-next')) {
      if (wizBusy) return;
      saveQualifyAnswer();
      var lastQ = qualifyIndex === qualifyData().questions.length - 1;
      transitionWizard('qualify-card', 'forward', lastQ ? renderQualifyDone : function () { renderQualifyStep(qualifyIndex + 1); });
      return;
    }
    if (e.target.closest('#qualify-back')) {
      if (wizBusy) return;
      saveQualifyAnswer();
      transitionWizard('qualify-card', 'back', function () { renderQualifyStep(qualifyIndex - 1); });
      return;
    }
    if (e.target.closest('#qualify-edit')) {
      transitionWizard('qualify-card', 'back', function () { renderQualifyStep(0); });
      return;
    }

    // Selecting a date pill in wizard
    var dateBtn = e.target.closest('[data-wiz-date]');
    if (dateBtn) {
      document.querySelectorAll('[data-wiz-date]').forEach(function (btn) {
        btn.classList.remove('active');
      });
      dateBtn.classList.add('active');
      return;
    }

    // Selecting a launch-timeline pill in the qualification card
    var qualifyPill = e.target.closest('[data-qualify-pill]');
    if (qualifyPill) {
      document.querySelectorAll('[data-qualify-pill]').forEach(function (btn) {
        btn.classList.remove('active');
      });
      qualifyPill.classList.add('active');
      return;
    }

    // Selecting a time slot in wizard
    var slotBtn = e.target.closest('[data-wiz-slot]');
    if (slotBtn) {
      document.querySelectorAll('[data-wiz-slot]').forEach(function (btn) {
        btn.classList.remove('active');
      });
      slotBtn.classList.add('active');
      return;
    }

    // Click on a recommended document to open it in the side canvas
    var resourceRow = e.target.closest('[data-pdf-index]');
    if (resourceRow) {
      openPdfCanvas(parseInt(resourceRow.getAttribute('data-pdf-index'), 10));
      return;
    }

    if (e.target.closest('[data-action="dismiss-teaser"]')) {
      genieTeaser.hidden = true; // red dot stays until the widget is opened
      return;
    }

    if (e.target.closest('[data-action="open-genie"]')) {
      openGenie();
      return;
    }

    if (e.target.closest('[data-action="play-video"]')) {
      openVideoCanvas();
      return;
    }

    if (e.target.closest('[data-action="close-canvas"]')) {
      closeCanvas(true);
      return;
    }

    if (e.target.closest('[data-action="collapse-genie"]')) {
      collapseGenie();
      return;
    }

    if (e.target.closest('[data-action="toggle-fullscreen"]')) {
      setFullscreen(!genie.classList.contains('app-genie-fullscreen'));
      return;
    }

    if (e.target.closest('.app-genie-start, .app-composer-avatar-btn')) {
      setAvatarCall(true);
      return;
    }

    if (e.target.closest('[data-action="end-avatar-call"]')) {
      setAvatarCall(false);
      return;
    }

    if (e.target.closest('[data-action="close-genie"]')) {
      resetGenie();
      return;
    }
  });

  // ----- Mockup mode (index.html?mockup): opens straight into the first answer, used by slate.html -----
  if (/[?&]mockup\b/.test(location.search)) {
    clearTimeout(greetingTimer);
    openGenie();
    renderGreeting();
    input.value = data.scenario[0].userPrompt;
    sendMessage();
  }
})();
