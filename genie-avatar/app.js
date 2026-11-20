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
  var joinTimer = null;
  function setAvatarCall(on) {
    avatarCall.hidden = !on;
    if (!on && typeof setMicMenu === 'function') setMicMenu(false);
    clearTimeout(joinTimer);
    avatarCall.classList.toggle('is-joining', on);
    if (on) {
      joinTimer = setTimeout(function () { avatarCall.classList.remove('is-joining'); }, 2500);
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
    if (!avatarCall.hidden) setAvatarCall(false);
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
  document.addEventListener('ds-theme-change', syncThemeSwitch);
  // TEMP: avatar glow before/after comparison
  document.getElementById('glow-switch').addEventListener('ds-change', function (e) {
    document.documentElement.classList.toggle('app-glow-before', e.detail.value === 'before');
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
