/* app.js - Genie Avatar prototype
   Chat flow, composer and avatar call are repurposed from ../agentic-revenue-enablement/app.js:
   - Start screen: avatar + composer + suggestion pills, recommended channels below the fold
   - First question: start screen hides, composer moves to the bottom bar
   - Processing dots, then a scripted answer from data.js with sources and follow-ups
   - Avatar call view with a "Joining..." state
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

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ----- Sounds -----
  var popSound = new Audio('assets/pop.wav');
  var sendSound = new Audio('assets/sent-message.mp3');
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

  document.getElementById('channels-grid').innerHTML = data.channels.map(function (c) {
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

  // Presets: Flashcards / Text, one at a time
  function activePreset() {
    var on = document.querySelector('.app-composer-preset[aria-pressed="true"]');
    return on ? on.getAttribute('data-preset') : null;
  }

  // ----- Conversation -----
  function scrollToBottom() {
    genieBody.scrollTop = genieBody.scrollHeight;
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

  function send(raw) {
    var text = String(raw || '').trim();
    if (!text) return;
    var preset = activePreset();

    enterChatMode();
    var userMsg = document.createElement('div');
    userMsg.className = 'app-user-msg';
    userMsg.innerHTML = '<div class="app-user-bubble">' + esc(text) + '</div>';
    chatStream.appendChild(userMsg);
    play(sendSound);

    setFollowUps([]);
    input.value = '';
    autoResize();
    syncSubmit();
    processing.hidden = false;
    scrollToBottom();

    var sentIn = session;
    setTimeout(function () {
      if (sentIn !== session) return;
      processing.hidden = true;
      play(popSound);
      renderAnswer(data.answers[text] || data.fallback, preset);
      scrollToBottom();
    }, 1200);
  }

  function renderAnswer(a, preset) {
    var html = '';
    if (preset) html += '<p>' + esc(data.presets[preset]) + '</p>';
    if (preset !== 'flashcards') html += '<p>' + esc(a.text) + '</p>';

    var cards = a.flashcards || a.highlights || [];
    if (preset === 'flashcards' && cards.length) {
      html += '<div class="app-flashcards">' + cards.map(function (h, i) {
        return '<button class="app-flashcard" type="button" aria-pressed="false">' +
          '<span class="app-flashcard-count">' + (i + 1) + ' / ' + cards.length + '</span>' +
          '<span class="app-flashcard-text">' + esc(h) + '</span></button>';
      }).join('') + '</div>';
    } else if (a.highlights && a.highlights.length) {
      {
        if (a.highlightsTitle) html += '<p class="app-agent-subtitle">' + esc(a.highlightsTitle) + '</p>';
        html += '<ul class="app-agent-highlights">' + a.highlights.map(function (h) {
          return '<li>' + esc(h) + '</li>';
        }).join('') + '</ul>';
      }
    }

    if (a.sources && a.sources.length) {
      html += '<div class="app-sources"><p class="app-sources-title">Sources</p><div class="app-sources-list">' +
        a.sources.map(function (s) {
          return '<button class="app-source" type="button" data-action="open-source">' +
            '<span class="app-source-thumb"><img src="' + s.image + '" alt="">' +
            '<span class="ds-badge-duration app-source-time">' + esc(s.time) + '</span></span>' +
            '<span class="app-source-title">' + esc(s.title) + '</span></button>';
        }).join('') + '</div></div>';
    }

    html += '<div class="app-agent-actions">' +
      '<button class="ds-btn ds-btn-sm ds-btn-secondary ds-btn-borderless ds-btn-icon" type="button" aria-label="Copy" data-action="copy"><ds-icon name="copy" size="16"></ds-icon></button>' +
      '<button class="ds-btn ds-btn-sm ds-btn-secondary ds-btn-borderless ds-btn-icon" type="button" aria-label="Good answer" data-action="like"><ds-icon name="like-hollow" size="16"></ds-icon></button>' +
      '<button class="ds-btn ds-btn-sm ds-btn-secondary ds-btn-borderless ds-btn-icon" type="button" aria-label="Bad answer" data-action="dislike"><ds-icon name="dislike-hollow" size="16"></ds-icon></button>' +
    '</div>';

    var msg = document.createElement('div');
    msg.className = 'app-agent-msg';
    msg.innerHTML =
      '<div class="app-agent-header"><span class="app-agent-avatar"><img src="assets/avatar.png" alt=""></span>' +
      '<span class="app-agent-name">Genie</span></div>' +
      '<div class="app-agent-content">' + html + '</div>';
    chatStream.appendChild(msg);
    setFollowUps(a.followUps);
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
  var joinTimer = null;
  function setAvatarCall(on) {
    avatarCall.hidden = !on;
    clearTimeout(joinTimer);
    avatarCall.classList.toggle('is-joining', on);
    if (on) {
      joinTimer = setTimeout(function () { avatarCall.classList.remove('is-joining'); }, 2500);
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !avatarCall.hidden) setAvatarCall(false);
  });

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

    var card = e.target.closest('.app-flashcard');
    if (card) {
      card.setAttribute('aria-pressed', card.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      return;
    }

    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.getAttribute('data-action')) {
      case 'new-thread': newThread(); input.focus(); break;
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
