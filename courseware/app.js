/* app.js - Courseware: avatar mode learning activities.
   Ported from the "learning-activity" (Avatar MD) prototype. Behavior is unchanged; it now drives
   DS components: the activity tabs are a DS tablist, the image toggle is a DS switch, and icons are
   <ds-icon> (the mic icon swaps its name instead of an image file). */

// Spark / ember colors: CSS custom properties built from DS tokens (see app.css)
const SPARK_COLORS = ['var(--app-spark-white)', 'var(--app-spark-light)', 'var(--app-spark-blue)', 'var(--app-spark-gold)'];

// ---- Shared mic / bottom bar -------------------------------------------------
// state: 'idle' | 'muted' | 'listening'
const micPill = document.querySelector('.mic-pill');
const micIcon = micPill.querySelector('.mic-icon');
const micMessage = document.getElementById('mic-message');

// Bar message variants (Figma "Message" + "Messages" loader): a chip for mic access and the loader
// messages. Nothing on screen calls them since the Flows were removed from the demo panel; kept as
// DS candidates. Kept here, by setMic, so any setMic() call clears them.
const barMessageEl = micMessage.parentElement;
const THINKING_MESSAGES = [
  'Looking up the info for you',
  'Checking the knowledge base',
  'Getting the details now',
  'Searching for the right info',
  'Finding the answer for you',
];
const barExtras = { thinkingTimer: null, swapTimer: null };

function clearBarExtras() {
  clearInterval(barExtras.thinkingTimer);
  clearTimeout(barExtras.swapTimer);
  barExtras.thinkingTimer = null;
  barMessageEl.classList.remove('chip', 'with-icon', 'thinking', 'swap');
}

// A chip over the mic ("Allow access to your mic" with a warning icon, "Enable your mic to talk")
function showBarChip(text, { icon = false } = {}) {
  clearBarExtras();
  micMessage.textContent = text;
  barMessageEl.classList.remove('away');
  barMessageEl.classList.add('chip');
  barMessageEl.classList.toggle('with-icon', icon);
}

// Julia is getting the answer: the line cycles through the 5 loader messages
function startThinking() {
  setMic('idle');
  barMessageEl.classList.remove('away');
  barMessageEl.classList.add('thinking');
  let i = 0;
  micMessage.textContent = THINKING_MESSAGES[0];
  barExtras.thinkingTimer = setInterval(() => {
    i = (i + 1) % THINKING_MESSAGES.length;
    barMessageEl.classList.add('swap');
    barExtras.swapTimer = setTimeout(() => {
      micMessage.textContent = THINKING_MESSAGES[i];
      barMessageEl.classList.remove('swap');
    }, 200);
  }, 1800);
}

function setMic(state) {
  clearBarExtras();
  const muted = state === 'muted';
  if (!muted) micPill.closest('.bottom-bar').classList.remove('talking-muted');
  micPill.classList.toggle('muted', muted);
  micPill.classList.toggle('listening', state === 'listening');
  micPill.setAttribute('aria-pressed', String(muted));
  micIcon.setAttribute('name', muted ? 'microphone-muted' : 'microphone');
  // The line over the mic only shows "Listening..." while the student talks. Otherwise it is hidden
  // (no "Talk to interrupt" in this lesson, for a cleaner bar); it keeps its space, so the bar does
  // not change height. The same 'away' class is used by the video activity.
  const listening = state === 'listening';
  micMessage.parentElement.classList.toggle('away', !listening);
  if (listening) micMessage.textContent = 'Listening...';
}

// Feedback line over the mic (from the reference: "Correct! Excellent job!", "Great answer!", ...).
// Shown even while the mic is off; the next setMic() call puts the usual line back.
function showBarMessage(text) {
  clearBarExtras();
  micMessage.textContent = text;
  micMessage.parentElement.classList.remove('away');
}

// How long the correct-answer feedback shows before the lesson moves on (from the reference)
const CORRECT_ADVANCE = 650; // quiz
const ANSWER_ADVANCE = 500;  // written answers

// Sounds are synthesized so no audio file is needed
let audioCtx;
function getAudioCtx() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// One soft sine note: quick attack, exponential decay over `length` seconds
function playTone(freq, offset, peak = 0.25, length = 0.4) {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + offset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

// Short two-note "go ahead, I'm listening" chime
function playStartSound() {
  playTone(660, 0);
  playTone(990, 0.12);
}

// Milestone reached: bright rising arpeggio (C major) that ends in a high shimmer
function playMilestoneSound() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => playTone(freq, i * 0.1, 0.22, 1.1));
  [1567.98, 2093, 2637.02].forEach((freq, i) => playTone(freq, 0.42 + i * 0.08, 0.07, 0.6));
}

// A milestone lit by the line of fire: one bright bell note that rises with each milestone passed
function playSparkSound(index) {
  const freq = [523.25, 659.25, 783.99, 1046.5][index] || 1046.5;
  playTone(freq, 0, 0.2, 0.9);
  playTone(freq * 2, 0.05, 0.06, 0.5);
}

// Lesson completed: the same rising arpeggio, then a full held chord and a longer shimmer
function playLessonSound() {
  playMilestoneSound();
  [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq) => playTone(freq, 0.5, 0.14, 1.9));
  [2093, 2637.02, 3135.96, 4186].forEach((freq, i) => playTone(freq, 0.55 + i * 0.09, 0.05, 0.9));
}

// Click sound played when the user finishes reading
const doneSound = new Audio('assets/Ni Sound - Soft UI - Short Simple Click.wav');
doneSound.preload = 'auto';
function playDoneSound() {
  doneSound.currentTime = 0;
  doneSound.play();
}

// ---- Activity 1: quiz --------------------------------------------------------
function quizActivity(root) {
  const answers = root.querySelectorAll('.answer');
  const confirmButton = root.querySelector('.cta-button');
  let advanceTimer = null;
  answers.forEach((answer) => {
    answer.addEventListener('click', () => {
      if (advanceTimer) return; // already answered correctly, moving on
      answers.forEach((a) => {
        a.setAttribute('aria-checked', String(a === answer));
        a.classList.remove('wrong');
      });
      confirmButton.disabled = false;
    });
  });

  // "Confirm answer" (reference behavior): correct = green pulse, "Correct! Excellent job!", and
  // the lesson moves on; wrong = red, "Not quite...", and the student tries again
  confirmButton.addEventListener('click', () => {
    const chosen = root.querySelector('.answer[aria-checked="true"]');
    if (!chosen || advanceTimer) return;
    if (chosen.dataset.correct === 'true') {
      chosen.classList.add('just-correct');
      confirmButton.disabled = true;
      showBarMessage('Correct! Excellent job!');
      const answerIndex = [...answers].indexOf(chosen);
      advanceTimer = setTimeout(() => { advanceTimer = null; advanceLesson({ answer: answerIndex }); }, CORRECT_ADVANCE);
    } else {
      chosen.classList.add('wrong');
      confirmButton.disabled = true; // until another option is picked
      showBarMessage('Not quite. Try another option or ask Julia for a hint!');
    }
  });
  const stopAdvance = () => { clearTimeout(advanceTimer); advanceTimer = null; };

  // When the avatar video ends, shrink the avatar and reveal the "Ask for a hint" button
  const avatar = root.querySelector('.avatar');
  const video = avatar.querySelector('video');
  const hintButton = avatar.querySelector('.hint-button');
  let started = false;
  let hintPlaying = false;
  const introSrc = video.getAttribute('src');

  // "Ask for a hint": play the hint video in place of the intro video
  hintButton.addEventListener('click', () => {
    hintPlaying = true;
    avatar.classList.add('hint-playing');
    hintButton.tabIndex = -1;
    video.src = 'assets/hint.mp4';
    video.play();
  });

  video.addEventListener('ended', () => {
    if (hintPlaying) {
      // hint finished: let the user ask again
      hintPlaying = false;
      avatar.classList.remove('hint-playing');
      hintButton.tabIndex = 0;
      return;
    }
    avatar.classList.add('shrunk');
    hintButton.tabIndex = 0;
    setMic('muted');
    playStartSound();
  });

  return {
    enter() { setMic('idle'); },
    start() { if (!started) { started = true; video.play(); } },
    leave() { video.pause(); stopAdvance(); },
    // Review mode (the step was answered): the student's answer in green, the rest dimmed, locked
    review({ answer }) {
      started = true;
      answers.forEach((a, i) => {
        a.setAttribute('aria-checked', String(i === answer));
        a.classList.toggle('mine', i === answer);
      });
      confirmButton.disabled = true;
      showBarMessage('Ask Julia about this question');
    },
    // Partway through (the "Session paused" tab): Julia has asked the question and the student
    // is choosing an answer
    midway() {
      started = true;
      video.pause();
      avatar.classList.add('shrunk');
      hintButton.tabIndex = 0;
      setMic('muted');
    },
    reset() {
      started = false;
      hintPlaying = false;
      stopAdvance();
      answers.forEach((a) => {
        a.setAttribute('aria-checked', 'false');
        a.classList.remove('wrong', 'just-correct', 'mine');
      });
      confirmButton.disabled = true;
      avatar.classList.remove('shrunk', 'hint-playing');
      hintButton.tabIndex = -1;
      video.pause();
      if (video.getAttribute('src') !== introSrc) video.src = introSrc;
      video.currentTime = 0;
    },
  };
}

// ---- Activity 2: read aloud --------------------------------------------------
function readAloudActivity(root) {
  const avatar = root.querySelector('.avatar');
  const video = avatar.querySelector('video');
  const helpButton = avatar.querySelector('.hint-button');
  const readButton = root.querySelector('.read-button');
  const readLabel = readButton.querySelector('span');
  const readArrow = readButton.querySelector('.read-arrow');
  const readCheck = readButton.querySelector('.read-check');
  const readAgainButton = root.querySelector('.read-again');
  let started = false;
  let state = 'intro'; // intro -> reading -> done -> (Read again) reading ... / (Continue) next step
  let helpPlaying = false;

  const helpSrc = 'assets/read out loud.mp4';
  const doneSrc = 'assets/Julia-pause-Awesome-It-2026-10-06.mp4';
  let videoSrc = helpSrc;
  function setVideo(src) {
    if (videoSrc === src) return;
    videoSrc = src;
    video.src = src;
  }

  // The main footer button (always DS primary): "Start reading" -> "✓ Done reading" -> "Continue ->".
  // Once the reading is done, "Read again" (DS secondary) appears next to it, as in the reference.
  function setReadButton(label, { finish = false, outlined = false, arrow = false } = {}) {
    readLabel.textContent = label;
    readButton.classList.toggle('outlined', outlined);
    readCheck.hidden = !finish;
    readArrow.hidden = !arrow;
  }

  // Start reading (or Read again): avatar shrinks, "Need help?" appears, button becomes "Done reading"
  function startReading() {
    state = 'reading';
    video.pause();
    setVideo(helpSrc);
    helpPlaying = false;
    avatar.classList.remove('hint-playing');
    avatar.classList.add('shrunk');
    helpButton.tabIndex = 0;
    setReadButton('Done reading', { finish: true, outlined: true });
    readAgainButton.hidden = true;
    setMic('listening');
    playStartSound();
  }

  // Done reading: stop listening, avatar says "Awesome", the main button becomes "Continue"
  function finishReading() {
    state = 'done';
    setReadButton('Continue', { arrow: true });
    readAgainButton.hidden = false;
    setMic('idle');
    playDoneSound();
    // The avatar expands back to full size and reacts ("Need help?" only exists while shrunk)
    helpPlaying = false;
    avatar.classList.remove('hint-playing', 'shrunk');
    helpButton.tabIndex = -1;
    setVideo(doneSrc);
    video.currentTime = 0;
    video.play();
  }

  readButton.addEventListener('click', () => {
    if (state === 'intro') startReading();
    else if (state === 'reading') finishReading();
    else advanceLesson({}); // "Continue"
  });
  readAgainButton.addEventListener('click', startReading);

  // "Need help?": the avatar repeats the instructions
  helpButton.addEventListener('click', () => {
    helpPlaying = true;
    avatar.classList.add('hint-playing');
    helpButton.tabIndex = -1;
    setVideo(helpSrc);
    video.currentTime = 0;
    video.play();
  });

  video.addEventListener('ended', () => {
    if (!helpPlaying) return;
    helpPlaying = false;
    avatar.classList.remove('hint-playing');
    helpButton.tabIndex = 0;
  });

  return {
    enter() { setMic('idle'); },
    start() { if (!started) { started = true; video.play(); } },
    leave() { video.pause(); },
    // Review mode (the text was read): the text stays, nothing to press but Continue
    review() {
      started = true;
      showBarMessage('Ask Julia about this text');
    },
    reset() {
      started = false;
      state = 'intro';
      helpPlaying = false;
      avatar.classList.remove('shrunk', 'hint-playing');
      helpButton.tabIndex = -1;
      setReadButton('Start reading', { outlined: true });
      readAgainButton.hidden = true;
      video.pause();
      setVideo(helpSrc);
      video.currentTime = 0;
    },
  };
}

// ---- Activity 8: input -------------------------------------------------------
// The avatar asks the question; when she is done she shrinks and the student types an answer.
// "Need help?" makes her repeat the question. Confirm unlocks once there is something written.
function inputActivity(root) {
  const input = root.querySelector('.input-box');
  const confirmButton = root.querySelector('.cta-button');
  const avatar = root.querySelector('.avatar');
  const video = avatar.querySelector('video');
  const helpButton = avatar.querySelector('.hint-button');
  let started = false;
  let helpPlaying = false;
  let advanceTimer = null;

  input.addEventListener('input', () => {
    if (advanceTimer) return;
    confirmButton.disabled = input.value.trim() === '';
  });

  // "Confirm answer" (reference behavior): the field turns green, "Great answer!", and the
  // lesson moves on
  confirmButton.addEventListener('click', () => {
    if (!input.value.trim() || advanceTimer) return;
    input.classList.add('just-correct');
    input.readOnly = true;
    confirmButton.disabled = true;
    showBarMessage('Great answer!');
    const text = input.value.trim();
    advanceTimer = setTimeout(() => { advanceTimer = null; advanceLesson({ text }); }, ANSWER_ADVANCE);
  });
  const stopAdvance = () => { clearTimeout(advanceTimer); advanceTimer = null; };

  helpButton.addEventListener('click', () => {
    helpPlaying = true;
    avatar.classList.add('hint-playing');
    helpButton.tabIndex = -1;
    video.currentTime = 0;
    video.play();
  });

  video.addEventListener('ended', () => {
    helpButton.tabIndex = 0;
    if (helpPlaying) {
      helpPlaying = false;
      avatar.classList.remove('hint-playing');
      return;
    }
    avatar.classList.add('shrunk');
    setMic('muted');
    playStartSound();
    input.focus({ preventScroll: true });
  });

  return {
    enter() { setMic('idle'); },
    start() { if (!started) { started = true; video.play(); } },
    leave() { video.pause(); stopAdvance(); },
    // Review mode (the step was answered): the student's answer in a locked, green field
    review({ text }) {
      started = true;
      input.value = text;
      input.readOnly = true;
      input.classList.add('just-correct');
      confirmButton.disabled = true;
      showBarMessage('Ask Julia about this question');
    },
    reset() {
      started = false;
      helpPlaying = false;
      stopAdvance();
      input.value = '';
      input.readOnly = false;
      input.classList.remove('just-correct');
      confirmButton.disabled = true;
      avatar.classList.remove('shrunk', 'hint-playing');
      helpButton.tabIndex = -1;
      video.pause();
      video.currentTime = 0;
    },
  };
}

// ---- Activity 10: card layout (layout trial) -----------------------------------
// The lesson's steps in one big card, moved through with ‹ ›. Each step: pick an option (like a
// radio group) or write your own answer and send it (the button, or Enter). "Go deeper" has no
// destination yet, so it says so in a toast. This layout hides the mic bar and the top progress.
function cardLayoutActivity(root) {
  const view = document.querySelector('.avatar-view');
  const stepEls = [...root.querySelectorAll('.cl-step')];
  // Card footer (the same base as the other screens): Back, Skip for now, Confirm answer
  const backButton = root.querySelector('.cl-back');
  const skipButton = root.querySelector('.cl-skip');
  const confirmButton = root.querySelector('.cl-confirm');
  let index = 0;

  // Confirm is on once this step has an answer: a chosen card or a sent "write your own"
  function syncConfirm() {
    const step = stepEls[index];
    confirmButton.disabled = !step.querySelector('.answer[aria-checked="true"], .cl-own.sent');
  }

  function showStep(i) {
    index = Math.min(Math.max(i, 0), stepEls.length - 1);
    stepEls.forEach((step, k) => { step.hidden = k !== index; });
    backButton.disabled = index === 0;
    skipButton.disabled = index === stepEls.length - 1;
    syncConfirm();
  }

  root.querySelectorAll('.cl-answers').forEach((group) => {
    const answers = [...group.querySelectorAll('.answer')];
    answers.forEach((answer) => answer.addEventListener('click', () => {
      answers.forEach((a) => a.setAttribute('aria-checked', String(a === answer)));
      syncConfirm();
    }));
  });

  const fields = [...root.querySelectorAll('.cl-own')].map((own) => {
    const input = own.querySelector('.cl-own-input');
    const send = own.querySelector('.cl-send');
    const icon = send.querySelector('ds-icon');
    input.addEventListener('input', () => { send.disabled = input.value.trim() === ''; });
    function submit() {
      if (send.disabled) return;
      own.classList.add('sent');
      input.readOnly = true;
      send.disabled = true;
      send.setAttribute('aria-label', 'Answer sent');
      icon.setAttribute('name', 'check');
      syncConfirm();
    }
    send.addEventListener('click', submit);
    // Enter sends (Shift+Enter is a new line in the open question)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    });
    return function reset() {
      own.classList.remove('sent');
      input.value = '';
      input.readOnly = false;
      send.disabled = true;
      send.setAttribute('aria-label', 'Send answer');
      icon.setAttribute('name', 'arrow-right');
    };
  });

  backButton.addEventListener('click', () => showStep(index - 1));
  skipButton.addEventListener('click', () => showStep(index + 1));
  // the last step has nowhere to go yet: Confirm just locks the answer in
  confirmButton.addEventListener('click', () => {
    if (index < stepEls.length - 1) showStep(index + 1);
    else confirmButton.disabled = true;
  });

  return {
    enter() { view.classList.add('card-layout-on'); },
    start() {},
    leave() { view.classList.remove('card-layout-on'); },
    reset() {
      root.querySelectorAll('.answer').forEach((a) => a.setAttribute('aria-checked', 'false'));
      fields.forEach((resetField) => resetField());
      showStep(0);
    },
  };
}

// ---- Activity 3: watch a video -----------------------------------------------
function watchActivity(root) {
  const bottomBar = document.querySelector('.bottom-bar');
  const resumeButton = bottomBar.querySelector('.resume-pill');
  const readySound = new Audio('assets/Ni Sound - Soft UI - Digital Button Select.wav');
  readySound.preload = 'auto';
  const avatarVideo = root.querySelector('.avatar video');
  let player = null;
  let started = false;
  const introSrc = avatarVideo.getAttribute('src');
  // intro -> watching (video playing) -> ended (button becomes the CTA) -> done (player gone)
  let state = 'intro';

  // intro: avatar (intro video) next to the player. watching / ended: player centered, avatar
  // gone, mic replaced by the "I'm done watching" pill (blue once the video has ended).
  // done: player gone, avatar centered
  function render() {
    const away = state === 'watching' || state === 'ended';
    root.classList.toggle('watching', away);
    root.classList.toggle('done', state === 'done');
    bottomBar.classList.toggle('watching', away);
    resumeButton.classList.toggle('ready', state === 'ended');
    setMic('idle');
  }

  function setupPlayer() {
    if (player) return;
    try {
      player = KalturaPlayer.setup({
        targetId: 'kaltura_player_83516016',
        entryTitle: 'Kaltura Avatar Walkthroughs - Marketing',
        provider: { partnerId: 1912501, uiConfId: 57496443 },
      });
      player.addEventListener('playing', () => {
        avatarVideo.pause();
        state = 'watching';
        render();
      });
      player.addEventListener('playbackended', () => {
        state = 'ended';
        render();
        readySound.currentTime = 0;
        readySound.play();
      });
      player.loadMedia({ entryId: '1_rtb471sc' });
    } catch (e) {
      console.error(e.message);
    }
  }

  // Intro finished: the avatar disappears and the player moves front and center
  avatarVideo.addEventListener('ended', () => {
    if (state !== 'intro') return; // ignore the post-video clip ending
    state = 'watching';
    render();
  });

  // "I'm done watching": the player goes away, the avatar comes back and plays the post-video clip
  resumeButton.addEventListener('click', () => {
    completedActivities.set(current, {}); // this step's segment turns blue
    renderProgress();
    if (player) player.pause();
    state = 'done';
    render();
    avatarVideo.src = 'assets/post -video.mp4';
    avatarVideo.play();
  });

  return {
    enter() { render(); },
    start() {
      setupPlayer(); // set up once the activity is visible so the player gets its size
      if (!started) { started = true; avatarVideo.play(); }
    },
    leave() {
      if (player) player.pause();
      avatarVideo.pause();
      bottomBar.classList.remove('watching');
    },
    reset() {
      started = false;
      state = 'intro';
      if (player) {
        player.pause();
        player.currentTime = 0;
      }
      avatarVideo.pause();
      if (avatarVideo.getAttribute('src') !== introSrc) avatarVideo.src = introSrc;
      avatarVideo.currentTime = 0;
      render();
    },
  };
}

// ---- Activity 4: end of milestone --------------------------------------------
// The avatar appears alone and starts talking right away. ANIMATION_DELAY after her video starts
// playing (she keeps talking meanwhile), a card opens on her left (side-by-side, like the other
// activities) and the timeline glides from the top bar into it. Milestone 2 is completed (the
// line to milestone 3 fills and the title appears), then milestone 3 becomes active: its dot
// pops, a chime plays and sparks fly, and "Continue learning" appears. Clicking it sends the
// timeline back to the top bar, the card collapses, and the avatar, front and center again,
// plays the next video.
const NEXT_VIDEO = 'assets/post -video.mp4'; // placeholder until the real "continue learning" clip arrives
const ANIMATION_DELAY = 1000; // ms between her video starting and the animation starting
const CTA_DELAY = 700;      // beat after the new milestone activates before the button appears
const CARD_CLOSE = 600;     // the card collapses (matches its width transition) and the avatar recenters
const LINES_FADE = 350;     // connectors fade out before the card opens
const CARD_OPEN = 650;      // the card slides in and the avatar makes room
const MOVE_DURATION = 900;  // dots glide from the top bar into the card
const REACH_PAUSE = 400;    // beat between arriving and completing the milestone
const LINE_FILL = 650;      // the line to the next milestone fills (0.7s transition) before it activates

// Lesson completed (".lesson" canvas) runs the same flow with a few differences: the progress is
// already on its last milestone (4), so the slate completes that one with a much bigger
// celebration (longer anticipation beat, bigger sparks, fuller chime), and then, instead of a
// "Continue learning" button under the progress, the progress itself turns into a "Next lesson"
// button: the dots converge on the center and fade while the button grows in.
// The "fade" variants (".crossfade" canvases) swap how the progress gets from the top bar to the
// slate (and back after "Continue learning"): instead of the dots gliding and resizing, the whole
// timeline fades out where it is, and fades in at its destination. Everything else is identical.
const FADE_IN = 500;        // the timeline fades in at its destination (matches the .steps transition)
const FINALE_PAUSE = 900;   // longer beat before the line of fire sets off
const FIRE_TIME = 1800;     // the line of fire runs from the first milestone to the last
const FIRE_FADE = 500;      // the fire's trail and head fade out once it arrives
const FINALE_HOLD = 2200;   // the completed progress is admired before it turns into the button
const CONVERGE = 800;       // dots converge on the center (the button appears as they vanish)

function milestoneActivity(root) {
  const lesson = root.classList.contains('lesson');
  const crossfade = root.classList.contains('crossfade');
  const avatarView = document.querySelector('.avatar-view');
  const stepsEl = document.querySelector('.steps');
  const header = stepsEl.parentElement; // the timeline's home in the top bar
  const timelineSlot = root.querySelector('.milestone-timeline');
  const titleEl = root.querySelector('.milestone-title h1');
  const sparksLayer = document.getElementById('sparks');
  const video = root.querySelector('.avatar video');
  const continueButton = root.querySelector('.milestone-cta .cta-button');
  const eyebrowEl = root.querySelector('.milestone-title .eyebrow');
  const introSrc = video.getAttribute('src');
  const introEyebrow = eyebrowEl.textContent;
  const introTitle = titleEl.textContent;
  const timers = [];
  const animations = [];
  // idle -> starting (video requested) -> talking (video playing) -> celebrating (animation)
  //      -> returning (after "Continue learning") -> continued (next video playing)
  let phase = 'idle';
  let started = false;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function clearAll() {
    timers.splice(0).forEach(clearTimeout);
    animations.splice(0).forEach((a) => a.cancel());
    sparksLayer.replaceChildren();
    root.classList.remove('side', 'settled', 'reached', 'ready', 'consumed', 'skipped-mode');
    eyebrowEl.textContent = introEyebrow;
    titleEl.textContent = introTitle;
    if (stepsEl.parentElement !== header) header.append(stepsEl);
    stepsEl.classList.remove('lines-hidden', 'numbered', 'faded');
    steps.forEach((step) => step.classList.remove('celebrate', 'finale'));
  }

  // Crossfade variant: moves the (already faded out) timeline to `parent` and fades it back in
  // there, with or without the numbers
  function fadeTimelineTo(parent, numbered) {
    parent.append(stepsEl);
    stepsEl.classList.toggle('numbered', numbered);
    stepsEl.getBoundingClientRect(); // commit the faded-out state in the new place so the fade-in animates
    stepsEl.classList.remove('faded');
  }

  // Moves the timeline to `parent`. Each dot starts at its old spot and size and glides to the
  // new one (FLIP: position by its center, size by scale, since the dots are 16px in the top bar
  // and 40px in the slate).
  function glideTimelineTo(parent) {
    const dots = steps.map((step) => step.querySelector('.step-dot'));
    const before = dots.map((dot) => dot.getBoundingClientRect());
    parent.append(stepsEl);
    dots.forEach((dot, i) => {
      const a = before[i];
      const b = dot.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2);
      const dy = a.top + a.height / 2 - (b.top + b.height / 2);
      animations.push(dot.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${a.width / b.width})` },
          { transform: 'none' },
        ],
        { duration: MOVE_DURATION, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' }
      ));
    });
  }

  // Open the card, then move the timeline into it. Glide variant: connectors stay hidden until
  // the dots arrive, and the numbers fade in once they have. Fade variant: the timeline fades
  // out at the top, and fades in (numbers included) inside the open card.
  function moveTimelineIntoCard() {
    stepsEl.classList.add(crossfade ? 'faded' : 'lines-hidden');
    later(() => {
      root.classList.add('side');
      later(() => {
        root.classList.add('settled'); // card stops clipping so the dots can arrive from the top bar
        if (crossfade) { fadeTimelineTo(timelineSlot, true); return; }
        glideTimelineTo(timelineSlot);
        later(() => stepsEl.classList.remove('lines-hidden'), MOVE_DURATION);
        later(() => stepsEl.classList.add('numbered'), MOVE_DURATION);
      }, CARD_OPEN);
    }, LINES_FADE);
  }

  // `big` is the lesson-completed burst: four rings that travel further, a flash of light behind
  // the dot, and two waves of many more (and larger) sparks that fly out much further
  function burstSparks(dot, big = false) {
    if (reduceMotion.matches) return;
    const view = avatarView.getBoundingClientRect();
    const rect = dot.getBoundingClientRect();
    const cx = rect.left - view.left + rect.width / 2;
    const cy = rect.top - view.top + rect.height / 2;
    const half = rect.width / 2;
    const cfg = big
      ? { rings: [0, 120, 240, 360], ringScale: 8, ringTime: 1100, waves: [0, 380], count: 90,
          dist: [120, 340], size: [6, 14], time: [1300, 2300] }
      : { rings: [0, 150], ringScale: 3.5, ringTime: 800, waves: [0], count: 40,
          dist: [70, 160], size: [5, 10], time: [1000, 1600] };
    const rand = ([min, max]) => min + Math.random() * (max - min);

    if (big) {
      const glow = document.createElement('span');
      glow.className = 'spark-glow';
      sparksLayer.append(glow);
      const at = `translate(${cx - 200}px, ${cy - 200}px)`;
      const a = glow.animate(
        [
          { transform: `${at} scale(0.2)`, opacity: 0 },
          { transform: `${at} scale(1)`, opacity: 1, offset: 0.2 },
          { transform: `${at} scale(1.7)`, opacity: 0 },
        ],
        { duration: 1500, easing: 'ease-out', fill: 'both' }
      );
      a.onfinish = () => glow.remove();
      animations.push(a);
    }

    // expanding rings
    cfg.rings.forEach((delay) => {
      const ring = document.createElement('span');
      ring.className = 'spark-ring';
      ring.style.width = ring.style.height = `${rect.width}px`;
      sparksLayer.append(ring);
      const a = ring.animate(
        [
          { transform: `translate(${cx - half}px, ${cy - half}px) scale(1)`, opacity: 0.9 },
          { transform: `translate(${cx - half}px, ${cy - half}px) scale(${cfg.ringScale})`, opacity: 0 },
        ],
        { duration: cfg.ringTime, delay, easing: 'ease-out', fill: 'both' }
      );
      a.onfinish = () => ring.remove();
      animations.push(a);
    });

    // flying sparks
    const colors = SPARK_COLORS;
    cfg.waves.forEach((waveDelay) => {
      for (let i = 0; i < cfg.count; i++) {
        const angle = (i / cfg.count) * Math.PI * 2 + Math.random() * 0.3;
        const dist = rand(cfg.dist);
        const size = rand(cfg.size);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const x0 = cx - size / 2;
        const y0 = cy - size / 2;
        const spark = document.createElement('span');
        spark.className = 'spark';
        spark.style.cssText = `width:${size}px;height:${size}px;background:${color};box-shadow:0 0 10px 2px ${color}`;
        sparksLayer.append(spark);
        const a = spark.animate(
          [
            { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
            // stay bright for most of the flight, then fade as they fall slightly (they have weight)
            { transform: `translate(${x0 + Math.cos(angle) * dist * 0.75}px, ${y0 + Math.sin(angle) * dist * 0.75}px) scale(0.9)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${x0 + Math.cos(angle) * dist}px, ${y0 + Math.sin(angle) * dist + 18}px) scale(0.2)`, opacity: 0 },
          ],
          { duration: rand(cfg.time), delay: waveDelay + Math.random() * 100, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'both' }
        );
        a.onfinish = () => spark.remove();
        animations.push(a);
      }
    });
  }

  // The milestone is completed: its dot is already blue, the line to the next milestone fills
  // and the title appears. Once the line arrives, the next milestone becomes active: the dot
  // pops, the chime plays and sparks fly.
  function reachMilestone() {
    reached += 1;
    if (lesson) { sweepFire(completeLesson); return; }
    renderProgress(true);
    titleEl.textContent = `Milestone ${reached + 1} reached!`;
    root.classList.add('reached');
    later(activateNextMilestone, LINE_FILL);
  }

  function activateNextMilestone() {
    renderProgress();
    const step = steps[reached];
    step.classList.add('celebrate');
    playMilestoneSound();
    burstSparks(step.querySelector('.step-dot'));
    later(() => root.classList.add('ready'), CTA_DELAY);
  }

  // Lesson completed, part 1: a line of fire runs along the whole progress, from the first
  // milestone to the last. Every milestone it crosses gets the milestone spark (pop, glow, burst
  // and a bell note that rises with each one). When it reaches the last milestone, `arrived` runs
  // and the big finale takes over.
  function sweepFire(arrived) {
    if (reduceMotion.matches) { arrived(); return; }
    const view = avatarView.getBoundingClientRect();
    const pts = steps.map((step) => {
      const r = step.querySelector('.step-dot').getBoundingClientRect();
      return { x: r.left - view.left + r.width / 2, y: r.top - view.top + r.height / 2 };
    });
    const first = pts[0];
    const len = pts[pts.length - 1].x - first.x;
    const total = FIRE_TIME + FIRE_FADE;
    const rand = ([min, max]) => min + Math.random() * (max - min);
    const run = { duration: FIRE_TIME, easing: 'linear', fill: 'forwards' };

    // the glowing line that lights up behind the head
    const trail = document.createElement('span');
    trail.className = 'fire-trail';
    trail.style.width = `${len}px`;
    sparksLayer.append(trail);
    const at = `translate(${first.x}px, ${first.y - 4}px)`;
    animations.push(trail.animate(
      [{ transform: `${at} scaleX(0)` }, { transform: `${at} scaleX(1)` }], run));
    const trailFade = trail.animate(
      [{ opacity: 1 }, { opacity: 1, offset: FIRE_TIME / total }, { opacity: 0 }],
      { duration: total, fill: 'forwards' });
    trailFade.onfinish = () => trail.remove();
    animations.push(trailFade);

    // the head: a white-hot flickering core that leads the line
    const head = document.createElement('span');
    head.className = 'fire-head';
    sparksLayer.append(head);
    animations.push(head.animate(
      [
        { transform: `translate(${first.x - 18}px, ${first.y - 18}px)` },
        { transform: `translate(${first.x + len - 18}px, ${first.y - 18}px)` },
      ], run));
    const headFade = head.animate(
      [
        { opacity: 0 },
        { opacity: 1, offset: 150 / total },
        { opacity: 1, offset: FIRE_TIME / total },
        { opacity: 0 },
      ],
      { duration: total, fill: 'forwards' });
    headFade.onfinish = () => head.remove();
    animations.push(headFade);

    // embers rising from the line as the head passes
    const colors = SPARK_COLORS;
    const embers = 36;
    for (let i = 0; i < embers; i++) {
      const frac = i / (embers - 1);
      const size = rand([3, 7]);
      const x = first.x + frac * len + rand([-8, 8]) - size / 2;
      const y = first.y + rand([-5, 5]) - size / 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const ember = document.createElement('span');
      ember.className = 'spark';
      ember.style.cssText = `width:${size}px;height:${size}px;background:${color};box-shadow:0 0 8px 2px ${color};opacity:0`;
      sparksLayer.append(ember);
      const a = ember.animate(
        [
          { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1 },
          { transform: `translate(${x + rand([-14, 14])}px, ${y - rand([18, 48])}px) scale(0.2)`, opacity: 0 },
        ],
        { duration: rand([500, 900]), delay: frac * FIRE_TIME, easing: 'ease-out', fill: 'forwards' }
      );
      a.onfinish = () => ember.remove();
      animations.push(a);
    }

    // each milestone lights up the moment the head crosses it; the last one is the finale
    pts.forEach((pt, i) => {
      const hit = ((pt.x - first.x) / len) * FIRE_TIME;
      if (i === pts.length - 1) { later(arrived, hit); return; }
      later(() => {
        const step = steps[i];
        step.classList.add('celebrate');
        playSparkSound(i);
        burstSparks(step.querySelector('.step-dot'));
      }, hit);
    });
  }

  // Lesson completed, part 2: the last milestone (4, the one that was current) becomes completed
  // with the big celebration and the title appears; after FINALE_HOLD the progress turns into the button.
  function completeLesson() {
    renderProgress();
    root.classList.add('reached');
    const step = steps[reached - 1];
    step.classList.add('finale');
    playLessonSound();
    burstSparks(step.querySelector('.step-dot'), true);
    later(turnProgressIntoButton, FINALE_HOLD);
  }

  // The numbers and connectors fade, the dots converge on the center of the timeline (where the
  // button is), and the "Next lesson" button grows in as they vanish.
  function turnProgressIntoButton() {
    stepsEl.classList.remove('numbered');
    stepsEl.classList.add('lines-hidden');
    const box = stepsEl.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    steps.forEach((step) => {
      const dot = step.querySelector('.step-dot');
      const r = dot.getBoundingClientRect();
      animations.push(dot.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `translate(${cx - (r.left + r.width / 2)}px, 0) scale(0.3)`, opacity: 0 },
        ],
        { duration: CONVERGE, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
      ));
    });
    later(() => root.classList.add('consumed', 'ready'), CONVERGE - 200);
  }

  // "Continue learning": the title and button fade, the connectors hide, then the dots glide back
  // up to the top bar while the card collapses and the avatar slides back to the center. Once
  // she is centered she plays the next video.
  function continueLearning() {
    if (phase !== 'celebrating') return;
    phase = 'returning';
    root.classList.remove('ready', 'reached');
    steps.forEach((step) => step.classList.remove('celebrate'));
    video.pause();
    if (crossfade) {
      stepsEl.classList.add('faded'); // the whole timeline fades out inside the slate
    } else {
      stepsEl.classList.add('lines-hidden');
      stepsEl.classList.remove('numbered'); // numbers fade out before the dots shrink back
    }
    later(() => {
      root.classList.remove('settled', 'side'); // the card clips again while it collapses
      if (crossfade) {
        fadeTimelineTo(header, false); // and fades back in at the top, as the card collapses
      } else {
        glideTimelineTo(header);
        later(() => stepsEl.classList.remove('lines-hidden'), MOVE_DURATION);
      }
      later(() => {
        phase = 'continued';
        video.src = NEXT_VIDEO;
        video.currentTime = 0;
        video.play().catch((e) => console.error(e.message));
      }, CARD_CLOSE);
    }, LINES_FADE);
  }

  // ("Next lesson" has no destination yet, so it has no click behavior)
  if (!lesson) continueButton.addEventListener('click', continueLearning);

  // Steps were skipped (reference behavior): no celebration. The slate opens with "You skipped N
  // questions"; "Return to questions" goes to the first skipped step, "Continue anyway" moves on.
  function showSkipped(count) {
    phase = 'skipped';
    eyebrowEl.textContent = `Milestone ${BASE_REACHED + 1}`;
    titleEl.textContent = `You skipped ${count} ${count === 1 ? 'question' : 'questions'}`;
    root.classList.add('skipped-mode', 'side');
    later(() => root.classList.add('settled', 'reached', 'ready'), CARD_OPEN);
  }

  if (!lesson) {
    root.querySelector('.milestone-return').addEventListener('click', returnToSkipped);
    root.querySelector('.milestone-continue-anyway').addEventListener('click', () => advanceLesson());
  }

  function startAnimation() {
    phase = 'celebrating';
    moveTimelineIntoCard();
    later(reachMilestone, LINES_FADE + CARD_OPEN + (crossfade ? FADE_IN : MOVE_DURATION) + (lesson ? FINALE_PAUSE : REACH_PAUSE));
  }

  // The delay is measured from the moment the video really starts playing (not from the click),
  // so buffering can't shift the animation relative to what she says
  video.addEventListener('playing', () => {
    if (phase !== 'starting') return;
    phase = 'talking';
    later(startAnimation, ANIMATION_DELAY);
  });

  return {
    enter() { setMic('idle'); },
    start() {
      if (started) return;
      started = true;
      const skippedCount = lesson ? 0 : skippedActivities.size;
      if (skippedCount) { showSkipped(skippedCount); return; }
      phase = 'starting';
      video.play().catch((e) => {
        console.error(e.message);
        // Autoplay refused: still run the animation so the milestone isn't lost. (Leaving the tab
        // pauses the video, which rejects play() with an AbortError; that must not trigger it.)
        if (e.name === 'NotAllowedError' && phase === 'starting') {
          phase = 'talking';
          later(startAnimation, ANIMATION_DELAY);
        }
      });
    },
    leave() { clearAll(); phase = 'idle'; video.pause(); },
    reset() {
      clearAll();
      started = false;
      phase = 'idle';
      video.pause();
      if (video.getAttribute('src') !== introSrc) video.src = introSrc;
      video.currentTime = 0;
    },
  };
}

// ---- Product header: student progress through the unit's milestones ----------
// A milestone spans several learning activities: the quiz, the reading activity and the video
// all belong to milestone 2, which stays the current one throughout. The "End of milestone"
// activity completes it and moves on to milestone 3. BASE_REACHED is how many milestones were
// already complete when the demo starts. Navigating always resets the bar to match what the
// demo is showing.
const BASE_REACHED = 1;
const LESSON_BASE_REACHED = 3; // "Lesson completed" starts with the last milestone (4) in progress
const steps = [...document.querySelectorAll('.step')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let reached = BASE_REACHED; // milestones completed so far; the next one is in progress

// The line from the current milestone to the next one is split into one segment per step of the
// milestone (the tabs before "End of milestone", in tab-bar order): blue when the step is done,
// hollow when it was skipped, and the step showing now breathes softly. The other lines stay whole.
const screensStep = steps[BASE_REACHED + 1]; // that line belongs to the next milestone's item
const screensEl = document.createElement('span');
screensEl.className = 'step-screens';
screensEl.setAttribute('aria-hidden', 'true');
screensStep.prepend(screensEl);

function milestoneScreens() {
  const end = navLinks.findIndex((link) => link.dataset.value === '5');
  return navLinks.slice(0, end).filter((link) => !link.hidden).map(targetOf);
}

// ---- Prototype-only: "Current step" options (panel "Progress", S) ---------------------------
// 10 common ways to show the student which step they're on. app.css draws each one
// (data-step-cue on <html>); renderProgress adds the text and marks they use.
const STEP_LABELS = { 0: 'Quiz', 1: 'Reading', 7: 'Writing', 8: 'Short answer', 2: 'Video' };
const HINT_ARROW_UP = '<svg width="14" height="9" viewBox="0 0 14 9" fill="none"><path d="M0 9L5.4 2Q7 0 8.6 2L14 9Z" fill="currentColor"/></svg>';
const stepCountEl = document.createElement('span');
stepCountEl.className = 'step-count';
stepCountEl.setAttribute('aria-hidden', 'true');
const milestoneLabelEl = document.createElement('span');
milestoneLabelEl.className = 'step-milestone-label';
milestoneLabelEl.setAttribute('aria-hidden', 'true');
const stepCrumbEl = document.createElement('div');
stepCrumbEl.className = 'step-crumb';
stepCrumbEl.setAttribute('aria-hidden', 'true');
document.querySelector('.product-header').append(stepCrumbEl);

// holdNext: show the milestone as completed but don't activate the next one yet
function renderProgress(holdNext = false) {
  // segments only while the current milestone is still in progress (once it is reached, the
  // whole line fills as before)
  const showScreens = reached === BASE_REACHED && !holdNext;
  const ids = showScreens ? milestoneScreens() : [];
  const doneCount = ids.filter((id) => completedActivities.has(id)).length;
  screensStep.classList.toggle('has-screens', showScreens);
  screensEl.replaceChildren(...ids.map((id, i) => {
    const seg = document.createElement('span');
    seg.className = 'step-screen';
    if (completedActivities.has(id)) seg.classList.add('done');
    else if (skippedActivities.has(id)) seg.classList.add('skipped');
    if (id === current) {
      seg.classList.add('current');
    }
    // Prototype-only: extras for the "Current step" options (shown per option by app.css)
    const name = STEP_LABELS[id] || '';
    const state = completedActivities.has(id) ? 'done' : skippedActivities.has(id) ? 'skipped' : id === current ? 'you are here' : 'not started';
    seg.innerHTML = `<span class="step-screen-num">${i + 1}</span>`
      + `<div class="ds-hint ds-hint-bottom step-screen-hint"><div class="ds-hint-body">${i + 1}. ${name} · ${state}</div>`
      + `<div class="ds-hint-arrow">${HINT_ARROW_UP}</div></div>`
      + (id === current ? `<span class="step-screen-label">${name}</span><span class="step-screen-caret"></span>` : '');
    return seg;
  }));
  const curIdx = ids.indexOf(current);
  const hereText = curIdx >= 0 ? `Step ${curIdx + 1} of ${ids.length}` : '';
  stepCountEl.textContent = hereText;
  stepCountEl.hidden = !hereText;
  screensEl.append(stepCountEl);
  milestoneLabelEl.textContent = hereText ? `Milestone ${BASE_REACHED + 1} · ${hereText}` : '';
  milestoneLabelEl.hidden = !hereText;
  steps[BASE_REACHED].append(milestoneLabelEl);
  stepCrumbEl.innerHTML = hereText
    ? `<span>Milestone ${BASE_REACHED + 1}</span><ds-icon name="chevron-right" size="16" aria-hidden="true"></ds-icon><span class="step-crumb-here">${STEP_LABELS[current] || ''}</span>`
    : '';
  stepCrumbEl.hidden = !hereText;

  steps.forEach((step, i) => {
    const done = i < reached;
    const isCurrent = i === reached && !holdNext;
    step.classList.toggle('done', done);
    step.classList.toggle('current', isCurrent);
    if (isCurrent) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
    step.querySelector('.sr-only').textContent =
      `Milestone ${i + 1}, ${done ? 'reached' : isCurrent ? 'in progress' : 'not started'}` +
      (isCurrent && showScreens ? `, ${doneCount} of ${ids.length} activities done` : '');
  });
}

// ---- Activity flow: header links (or Space) switch activities --------------------
const canvases = [...document.querySelectorAll('.canvas')];
const activities = [
  quizActivity(canvases[0]),
  readAloudActivity(canvases[1]),
  watchActivity(canvases[2]),
  milestoneActivity(canvases[3]),
  milestoneActivity(canvases[4]),
  milestoneActivity(canvases[5]),
  milestoneActivity(canvases[6]),
  inputActivity(canvases[7]),
  inputActivity(canvases[8]),
  cardLayoutActivity(canvases[9]),
];
const navLinks = [...document.querySelectorAll('.site-nav .ds-tab')];
const pauseTab = navLinks.find((link) => link.dataset.value === 'pause');
const miniTab = navLinks.find((link) => link.dataset.value === 'mini');
const splashTab = navLinks.find((link) => link.dataset.value === 'splash');

// ---- Prototype-only: splash screen ("Splash screen" tab) ---------------------------------------
// Julia loads in the middle of the screen with the picked loading look and "Joining..." under her
// (JOIN_MS), at the intro size (600 wide, as in production). Then she appears there, "Joining..."
// fades, and she shrinks into her place in the lesson while the card fades in; the quiz starts.
// Any other tab cancels it.
const SPLASH_ARRIVED_MS = 1200; // she shows in the middle for a moment before moving
const SPLASH_MOVE_MS = 700;
let splashDemo = false;
let splashTimers = [];
function setSplashDemo(on) {
  splashDemo = on;
  document.querySelector('.avatar-view').classList.toggle('splash-demo', on);
  document.querySelector('.avatar-view').classList.remove('splash-arrived');
}
function clearSplashTimers() { splashTimers.forEach(clearTimeout); splashTimers = []; }
// stage 'joining' / 'intro' (Julia states panel): hold that stage instead of playing on
function showSplash({ stage } = {}) {
  goTo(0, { fresh: true });
  activities[0].leave(); // no talking behind the loading look
  if (!chatPanel.hidden) setChatOpen(false); // the chat isn't there yet
  setSplashDemo(true);
  setJoining(true);
  syncTabs();
  if (stage === 'joining') return;
  if (stage === 'intro') {
    setJoining(false);
    document.querySelector('.avatar-view').classList.add('splash-arrived');
    return;
  }
  splashTimers.push(setTimeout(() => {
    setJoining(false); // she appears in the middle; "Joining..." fades
    document.querySelector('.avatar-view').classList.add('splash-arrived');
    splashTimers.push(setTimeout(enterLessonFromSplash, SPLASH_ARRIVED_MS));
  }, JOIN_MS));
}
// she shrinks from the intro size in the middle into her place (FLIP); the lesson fades in around her
function enterLessonFromSplash() {
  splashTimers = [];
  const canvas = canvases[0];
  const avatar = canvas.querySelector('.avatar');
  const from = avatar.getBoundingClientRect();
  avatar.style.transition = 'none'; // the size change is part of the move below, not a CSS transition
  setSplashDemo(false);
  syncTabs();
  const to = avatar.getBoundingClientRect();
  requestAnimationFrame(() => { avatar.style.transition = ''; });
  if (!reduceMotion.matches) {
    avatar.animate([
      { transformOrigin: 'top left', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` },
      { transformOrigin: 'top left', transform: 'none' },
    ], { duration: SPLASH_MOVE_MS, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    const around = [...canvas.children].filter((el) => el !== avatar && !el.classList.contains('splash-loading'));
    around.push(...document.querySelectorAll('.avatar-view .product-header, .avatar-view .chat-pill, .avatar-view .indicators'));
    around.forEach((el) => el.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: SPLASH_MOVE_MS, delay: SPLASH_MOVE_MS * 0.4, easing: 'ease-out', fill: 'backwards' }));
  }
  activities[0].start();
}

// ---- Prototype-only: minimize Julia ("Minimize Julia" tab), as in the LXP (lxp-teams demo1) -------
// Her tile gets a "–" button: she shrinks into a 64px circle in the center of the bar, in place of
// the mic (the mic leaves), and the card slides to the middle. A click on the circle floats her up
// as a 200px circle at the bottom right to talk: the mic comes back, and the X takes her back
// down to the circle. Every move is a FLIP animation (measure, switch, animate from the old spot).
let miniDemo = false;
const avatarView = document.querySelector('.avatar-view');

function syncMiniView() {
  const avatar = document.querySelector('.avatar.minimized');
  avatarView.classList.toggle('julia-minimized', !!avatar && !avatar.classList.contains('talking'));
  avatarView.classList.toggle('julia-talking', !!avatar && avatar.classList.contains('talking'));
}

function setMiniDemo(on) {
  miniDemo = on;
  avatarView.classList.toggle('mini-demo', on);
  if (!on) document.querySelectorAll('.avatar.minimized').forEach((a) => a.classList.remove('minimized', 'talking'));
  syncMiniView();
}

// As in the LXP: she travels to her new spot by changing her real position, size and corners
// (0.7s), so you see her fly into the mic's place. Coming back into the lesson (where she is part
// of the layout again) she grows from the circle with an even scale, so she never looks stretched.
// The card and the other things around her slide to their new places (FLIP).
const JULIA_MOVE = { duration: 700, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };
function flipAvatar(avatar, change) {
  const moving = [...avatar.parentElement.children].filter((el) => el !== avatar && el.getBoundingClientRect().width);
  const before = moving.map((el) => el.getBoundingClientRect());
  const a = avatar.getBoundingClientRect();
  const aRadius = getComputedStyle(avatar).borderRadius;
  change();
  syncMiniView();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  moving.forEach((el, i) => {
    const was = before[i];
    const now = el.getBoundingClientRect();
    if (!now.width || !now.height) return;
    el.animate([
      { transform: `translate(${was.left - now.left}px, ${was.top - now.top}px)` },
      { transform: 'none' },
    ], JULIA_MOVE);
  });
  const b = avatar.getBoundingClientRect();
  const bRadius = getComputedStyle(avatar).borderRadius;
  if (getComputedStyle(avatar).position === 'fixed') {
    avatar.animate([
      { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, borderRadius: aRadius },
      { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px`, borderRadius: bRadius },
    ], JULIA_MOVE);
  } else {
    const k = a.width / b.width; // even scale: from the circle's width, centered on it
    const tx = a.left + a.width / 2 - (b.left + (b.width * k) / 2);
    const ty = a.top + a.height / 2 - (b.top + (b.height * k) / 2);
    avatar.animate([
      { transformOrigin: 'top left', transform: `translate(${tx}px, ${ty}px) scale(${k})`, borderRadius: `${b.width / 2}px` },
      { transformOrigin: 'top left', transform: 'none', borderRadius: bRadius },
    ], JULIA_MOVE);
  }
}

function setMinimized(avatar, on) {
  flipAvatar(avatar, () => {
    avatar.classList.toggle('minimized', on);
    if (!on) avatar.classList.remove('talking');
  });
  const focusTarget = on ? avatar.querySelector('.mini-restore') : null;
  if (focusTarget) focusTarget.focus({ preventScroll: true });
}

function setTalking(avatar, on) {
  flipAvatar(avatar, () => avatar.classList.toggle('talking', on));
  const focusTarget = on ? juliaTalkClose : avatar.querySelector('.mini-restore');
  if (focusTarget) focusTarget.focus({ preventScroll: true });
}

// The X, as in the LXP: a badge on the talking circle's upper right, outside the circle so the
// circle never clips it. One for the page; it closes whichever Julia is talking.
const juliaTalkClose = document.createElement('button');
juliaTalkClose.className = 'mini-talk-close';
juliaTalkClose.type = 'button';
juliaTalkClose.setAttribute('aria-label', 'Stop talking to Julia');
juliaTalkClose.innerHTML = '<ds-icon name="close" size="16"></ds-icon>';
juliaTalkClose.addEventListener('click', () => {
  const avatar = document.querySelector('.avatar.minimized.talking');
  if (avatar) setTalking(avatar, false);
});
avatarView.appendChild(juliaTalkClose);

document.querySelectorAll('.avatar').forEach((avatar) => {
  // the circle in the bar is a button: a click floats her up to talk
  const talk = document.createElement('button');
  talk.className = 'mini-restore';
  talk.type = 'button';
  talk.innerHTML = '<span class="sr-only">Talk to Julia</span>';
  talk.addEventListener('click', () => setTalking(avatar, true));
  avatar.append(talk);
});

// ---- Prototype-only: "Current step" options panel (S) --------------------------------------
const STEP_CUES = [
  { id: 'outline', name: '1. Outlined segment', use: 'The step showing now is an empty segment with a blue outline, like the milestone’s blue ring. Quiet, no motion.' },
  { id: 'half', name: '2. Half-filled segment', use: 'The current segment is half blue: “in progress”, between done (full) and not started (empty). A common pattern in step bars.' },
  { id: 'caret', name: '3. Pointer under the step (picked)', use: 'The current segment is filled blue, with a small blue pointer under it, like a “you are here” mark on a map.' },
  { id: 'name', name: '4. Step name under it', use: 'The name of the activity (“Quiz”) under the current segment. A label makes the step clear without guessing.' },
  { id: 'count', name: '5. “Step 3 of 5”', use: 'A short count under the milestone’s segments: where I am and how much is left. The most common practice in lessons and forms.' },
  { id: 'milestone', name: '6. Milestone + step', use: '“Milestone 2 · Step 3 of 5” under the current milestone: both levels in one line.' },
  { id: 'crumb', name: '7. Breadcrumb', use: '“Milestone 2 › Quiz” to the left of the bar, so the bar stays clean and the text says where I am.' },
  { id: 'section', name: '8. Highlighted milestone', use: 'The current milestone’s segments sit on a soft blue band, so it reads as “this part”, with the outlined step inside it.' },
  { id: 'numbered', name: '9. Numbered steps', use: 'The segments become small numbered pills: done is blue, the current one is outlined, the rest grey. Clear count at a glance.' },
  { id: 'hover', name: '10. Labels on hover', use: 'The outlined step, and a DS hint with the step’s name and state when the student points at any segment. Detail on demand.' },
];
const STEP_CUE_KEY = 'courseware-step-cue';
const stepCuesPanel = document.getElementById('step-cues-panel');
const stepCuesList = stepCuesPanel.querySelector('.mic-states');
makeFloatingPanel(stepCuesPanel, 'courseware-step-cues-spot');
stepCuesList.innerHTML = STEP_CUES.map((cue, i) => `<li><button class="mic-state" type="button" data-step-cue="${cue.id}">`
  + `<span class="mic-state-pill step-cue-num" aria-hidden="true">${i + 1}</span>`
  + `<span class="mic-state-text"><span class="mic-state-name">${cue.name}</span><span class="mic-state-use">${cue.use}</span></span>`
  + '</button></li>').join('');
function setStepCue(id) {
  document.documentElement.dataset.stepCue = id;
  stepCuesList.querySelectorAll('[data-step-cue]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.stepCue === id)));
  try { localStorage.setItem(STEP_CUE_KEY, id); } catch (err) { /* not remembered */ }
}
stepCuesList.addEventListener('click', (e) => {
  const button = e.target.closest('[data-step-cue]');
  if (button) setStepCue(button.dataset.stepCue);
});
{
  let saved = null;
  try { saved = localStorage.getItem(STEP_CUE_KEY); } catch (err) { /* default */ }
  setStepCue(STEP_CUES.some((c) => c.id === saved) ? saved : 'caret'); // the pick (2026-11-19)
}
function toggleStepCues(open = stepCuesPanel.hidden) { stepCuesPanel.hidden = !open; }
document.getElementById('step-cues-toggle').addEventListener('click', () => toggleStepCues());
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyS' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
  toggleStepCues();
});

// ---- Prototype-only: Julia states panel (J) -------------------------------------------------
// Every state of Julia's tile (which use case each belongs to is not decided yet); a click shows it on the quiz.
const juliaStatesPanel = document.getElementById('julia-states-panel');
makeFloatingPanel(juliaStatesPanel, 'courseware-julia-states-spot');
function toggleJuliaStates(open = juliaStatesPanel.hidden) { juliaStatesPanel.hidden = !open; }
document.getElementById('julia-states-toggle').addEventListener('click', () => toggleJuliaStates());
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyJ' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
  toggleJuliaStates();
});
const quizAvatar = () => canvases[0].querySelector('.avatar');
const nextFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
const MOVE_GAP = JULIA_MOVE.duration + 50; // wait for one move to end before the next one starts

// Where Julia is now, read from the screen (so it also follows the tabs, "–" and her circle)
function juliaStateNow() {
  if (current !== 0 || paused) return null;
  if (splashDemo) return document.querySelector('.avatar-view').classList.contains('splash-arrived') ? 'intro' : 'joining';
  const avatar = quizAvatar();
  if (avatar.classList.contains('minimized')) return avatar.classList.contains('talking') ? 'talking' : 'minimized';
  return 'lesson';
}

// Introduction back from the lesson: she slides from her place to the middle and grows (even scale)
function lessonToIntro() {
  clearSplashTimers();
  const avatar = quizAvatar();
  const from = avatar.getBoundingClientRect();
  activities[0].leave();
  if (!chatPanel.hidden) setChatOpen(false);
  setMiniDemo(false);
  avatar.style.transition = 'none';
  setSplashDemo(true);
  document.querySelector('.avatar-view').classList.add('splash-arrived');
  syncTabs();
  const to = avatar.getBoundingClientRect();
  requestAnimationFrame(() => { avatar.style.transition = ''; });
  if (reduceMotion.matches) return;
  const k = from.width / to.width;
  avatar.animate([
    { transformOrigin: 'top left', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${k})` },
    { transformOrigin: 'top left', transform: 'none' },
  ], JULIA_MOVE);
}

// One step between two neighboring states; returns false when there is no direct move
function juliaStep(from, to) {
  const avatar = quizAvatar();
  if (from === 'joining' && to === 'intro') {
    setJoining(false);
    document.querySelector('.avatar-view').classList.add('splash-arrived');
    return true;
  }
  if (from === 'intro' && to === 'lesson') { enterLessonFromSplash(); setMiniDemo(true); syncTabs(); return true; }
  if (from === 'lesson' && to === 'intro') { lessonToIntro(); return true; }
  if (from === 'lesson' && to === 'minimized') { setMiniDemo(true); setMinimized(avatar, true); syncTabs(); return true; }
  if ((from === 'minimized' || from === 'talking') && to === 'lesson') { setMinimized(avatar, false); return true; }
  if (from === 'minimized' && to === 'talking') { setTalking(avatar, true); return true; }
  if (from === 'talking' && to === 'minimized') { setTalking(avatar, false); return true; }
  if (from === 'lesson' && to === 'talking') {
    setMiniDemo(true);
    flipAvatar(avatar, () => avatar.classList.add('minimized', 'talking'));
    syncTabs();
    juliaTalkClose.focus({ preventScroll: true });
    return true;
  }
  return false;
}

// The path between two states, through "In the lesson" when they aren't neighbors
const JULIA_ORDER = ['joining', 'intro', 'lesson', 'minimized', 'talking'];
function juliaPath(from, to) {
  if (`${from}-${to}` === 'lesson-talking' || `${from}-${to}` === 'talking-lesson') return [from, to]; // a direct move
  const i = JULIA_ORDER.indexOf(from);
  const j = JULIA_ORDER.indexOf(to);
  const path = [];
  for (let k = i; k !== j; k += i < j ? 1 : -1) path.push(JULIA_ORDER[k]);
  path.push(to);
  return path;
}

let juliaMoveTimers = [];
function goToJuliaState(target) {
  juliaMoveTimers.forEach(clearTimeout);
  juliaMoveTimers = [];
  let from = juliaStateNow();
  if (target === 'joining') { showSplash({ stage: 'joining' }); return; } // loading starts over
  if (!from) { // not on the quiz: open it in the lesson, then move from there
    goTo(0, { fresh: true });
    setMiniDemo(true);
    syncTabs();
    from = 'lesson';
    if (target === 'intro') { showSplash({ stage: 'intro' }); return; }
  }
  if (from === 'joining' && target !== 'intro') { // she has to arrive first
    juliaStep('joining', 'intro');
    juliaMoveTimers.push(setTimeout(() => goToJuliaState(target), 900));
    return;
  }
  const path = juliaPath(from, target);
  path.slice(1).forEach((state, n) => {
    juliaMoveTimers.push(setTimeout(() => nextFrame(() => juliaStep(path[n], state)), n * MOVE_GAP));
  });
}

const JULIA_STATES = {
  joining: () => goToJuliaState('joining'),
  intro: () => goToJuliaState('intro'),
  lesson: () => goToJuliaState('lesson'),
  minimized: () => goToJuliaState('minimized'),
  talking: () => goToJuliaState('talking'),
};
juliaStatesPanel.querySelectorAll('[data-julia-state]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!demoStarted) return;
    JULIA_STATES[button.dataset.juliaState]();
    juliaStatesPanel.querySelectorAll('[data-julia-state]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  });
});
const targetOf = (link) => Number(link.dataset.value); // which activity a tab opens
let current = 0;

// ---- Paused session: the session ended midway ---------------------------------
// Like a paused player: the activity and the bottom bar are washed out and locked (inert), the
// progress bar stays live, and "Continue lesson" picks up where the student left off. The End
// button pauses whatever activity is showing; the "Session paused" tab shows it on the quiz.
const pauseView = document.querySelector('.avatar-view');
const pauseLayer = document.getElementById('pause-layer');
const continueLessonButton = document.getElementById('continue-lesson');
const bottomBarEl = document.querySelector('.bottom-bar');
const pauseStatus = document.getElementById('pause-status'); // screen-reader announcement
let paused = false;
let pausedVideos = []; // videos that were playing, resumed by "Continue lesson"

function setPausedUI(on) {
  paused = on;
  pauseView.classList.toggle('paused', on);
  pauseLayer.inert = !on;
  canvases[current].inert = on;
  bottomBarEl.inert = on;
  syncTabs();
  // deferred: a tab click focuses the tab after this runs
  if (on) setTimeout(() => { if (paused) continueLessonButton.focus({ preventScroll: true }); }, 0);
}

function pauseSession() {
  if (paused) return;
  pausedVideos = [...canvases[current].querySelectorAll('video')].filter((v) => !v.paused);
  pausedVideos.forEach((v) => v.pause());
  setPausedUI(true);
  pauseStatus.textContent = 'Lesson paused';
}

// Leaves the paused state without resuming anything (used when navigating away)
function clearPause() {
  if (!paused) return;
  pausedVideos = [];
  setPausedUI(false);
  pauseStatus.textContent = '';
}

function continueLesson() {
  if (!paused) return;
  const resume = pausedVideos;
  clearPause();
  pauseStatus.textContent = 'Lesson resumed';
  resume.forEach((v) => v.play().catch((e) => console.error(e.message)));
}

continueLessonButton.addEventListener('click', continueLesson);

// ---- Prototype-only: speaking while muted --------------------------------------------
// The student muted the mic and starts talking: the reminder (hint + ripple) shows for a few
// seconds, as if the voice were picked up, then goes away. There is no real voice detection in the
// prototype, so the T key plays the moment. Clicking the mic while it shows unmutes it (the action
// the reminder asks for).
const TALK_MUTED_MS = 3500;
const TALK_MUTED_TEXT = 'You’re muted. Click the mic to talk';
const talkMutedLive = document.getElementById('talk-muted-live');
let talkMutedTimer = null;

function endTalkingMuted() {
  clearTimeout(talkMutedTimer);
  if (!bottomBarEl.classList.contains('talking-muted')) return;
  bottomBarEl.classList.remove('talking-muted');
  talkMutedLive.textContent = '';
  if (micPill.classList.contains('muted')) setMic('muted'); // puts the usual message state back
}

function simulateTalkingMuted({ hold = false } = {}) {
  if (!demoStarted || paused || bottomBarEl.classList.contains('watching')) return;
  setMic('muted');
  bottomBarEl.classList.remove('talking-muted');
  void bottomBarEl.offsetWidth; // restarts the ripple when played again
  bottomBarEl.classList.add('talking-muted');
  talkMutedLive.textContent = TALK_MUTED_TEXT;
  clearTimeout(talkMutedTimer);
  if (!hold) talkMutedTimer = setTimeout(endTalkingMuted, TALK_MUTED_MS);
}

micPill.addEventListener('click', () => {
  if (!bottomBarEl.classList.contains('talking-muted')) return;
  clearTimeout(talkMutedTimer);
  talkMutedLive.textContent = '';
  setMic('idle');
});
document.querySelector('.end-pill').addEventListener('click', pauseSession);

// ---- Prototype-only: Julia joining (DS candidate: avatar joining tile) ----------------
// The lesson opens (and the panel's Replay): Julia's tile on the screen showing now shows the
// loading look picked in the panel for JOIN_MS, then fades to her video and the activity starts.
const JOIN_MS = 2600;
const JOIN_STYLE_KEY = 'courseware-join-style';
let joinTimer = null;

// Mic and chat are disabled while Julia is joining (and in the mic states panel's "Joining" state)
function setBarLocked(on) {
  document.querySelectorAll('.mic-pill, .chat-pill').forEach((b) => { b.disabled = on; });
}

function setJoining(on) {
  document.querySelectorAll('.avatar.joining').forEach((a) => a.classList.remove('joining'));
  setBarLocked(on);
  if (!on) { revealFairyDust(); return null; }
  stopFairyDust();
  const avatar = canvases[current].querySelector('.avatar');
  if (!avatar) { setBarLocked(false); return null; }
  if (!avatar.querySelector('.avatar-joining')) {
    const layer = document.createElement('div');
    layer.className = 'avatar-joining';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<span class="avatar-joining-text">Julia is joining</span><span class="avatar-joining-dots"><i></i><i></i><i></i></span>'
      + '<span class="avatar-joining-wave"><i></i><i></i><i></i><i></i><i></i></span>'
      + '<span class="avatar-joining-bubble"><i></i><i></i><i></i></span>';
    avatar.appendChild(layer);
  }
  avatar.classList.add('joining');
  if (document.documentElement.dataset.joinStyle === 'fairy' && !reduceMotion.matches) startFairyDust(avatar);
  return avatar;
}

function cancelJoining() {
  clearTimeout(joinTimer);
  joinTimer = null;
  setJoining(false);
  stopFairyDust();
}

// ---- Prototype-only: loading colors from the image about to load --------------------------
// Each avatar gets --app-image-dark / -mid / -light / -accent, the main colors of her image, and the
// loading looks (4. Mist, 5. Fairy dust) use them, so the loading leads into her. In the product
// the developers compute them from the image; here we try that first and fall back to data.js
// (from file:// the browser won't let the page read the pixels).
function avatarPaletteFrom(img) {
  const size = 12;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data; // throws when the image may not be read
  const px = [];
  for (let i = 0; i < data.length; i += 4) px.push([data[i], data[i + 1], data[i + 2]]);
  const lum = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  const dist = (p, c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
  px.sort((a, b) => lum(a) - lum(b));
  // three groups by color (k-means, started from dark / middle / light)
  let cents = [px[Math.floor(px.length / 6)], px[Math.floor(px.length / 2)], px[Math.floor(px.length * 5 / 6)]];
  for (let round = 0; round < 12; round += 1) {
    const groups = [[], [], []];
    px.forEach((p) => {
      let best = 0;
      cents.forEach((c, j) => { if (dist(p, c) < dist(p, cents[best])) best = j; });
      groups[best].push(p);
    });
    cents = groups.map((g, j) => (g.length ? [0, 1, 2].map((k) => Math.round(g.reduce((sum, p) => sum + p[k], 0) / g.length)) : cents[j]));
  }
  cents.sort((a, b) => lum(a) - lum(b));
  const sat = (p) => Math.max(...p) - Math.min(...p);
  const accent = px.reduce((a, b) => (sat(b) > sat(a) ? b : a));
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  return { dark: hex(cents[0]), mid: hex(cents[1]), light: hex(cents[2]), accent: hex(accent) };
}
function applyAvatarPalette(avatar) {
  const img = avatar.querySelector('.avatar-glow');
  if (!img) return;
  const set = (palette) => {
    if (!palette) return;
    Object.entries(palette).forEach(([name, value]) => avatar.style.setProperty(`--app-image-${name}`, value));
  };
  const measure = () => {
    try { set(avatarPaletteFrom(img)); } catch (err) { set(AVATAR_PALETTES[img.getAttribute('src')]); }
  };
  if (img.complete && img.naturalWidth) measure();
  else { set(AVATAR_PALETTES[img.getAttribute('src')]); img.addEventListener('load', measure, { once: true }); }
}
document.querySelectorAll('.avatar').forEach(applyAvatarPalette);

// The "Background" choice (Julia's backdrop instead of the blue) was tried and removed (2026-11-18).
try { localStorage.removeItem('courseware-background'); } catch (err) { /* nothing saved */ }

// ---- Prototype-only: 5. Fairy dust (canvas; DS candidate with the joining tile) ----------------
// The same material as 4. Mist (the DS brand colors primary, primary-brighter, screen-green, softly
// blurred), shaped as a magic trail: a soft head sweeps in from the lower left and curls around
// where her face will be, leaving a misty ribbon that spreads and fades on its own. The ribbon
// gathers into a haze on her face, and the haze opens up as she appears. A very few faint glints
// in the ribbon, no stars. Colors are read from the tokens when it starts, so they follow the theme.
let fairy = null;

function startFairyDust(avatar) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fairy-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  avatar.appendChild(canvas);
  avatar.classList.add('fairy-live');
  const rect = avatar.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width;
  const h = rect.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const css = getComputedStyle(document.documentElement);
  const token = (name) => css.getPropertyValue(name).trim();
  // the colors of the image about to load (on her tile, applyAvatarPalette): along the trail it goes
  // from deep to light as it reaches her, with her accent color here and there.
  // Without image colors: the DS blues and teal.
  const own = getComputedStyle(avatar);
  const color = (image, fallback) => own.getPropertyValue(`--app-image-${image}`).trim() || token(fallback);
  const colors = [color('dark', '--ds-primary-darker'), color('mid', '--ds-primary'), color('light', '--ds-primary-brighter')];
  const accent = color('accent', '--ds-screen-green');
  const glint = color('mid', '--ds-primary-brighter'); // a middle tone: shows in light and dark
  const cx = w * 0.5;
  const cy = h * 0.45; // her face
  const R = Math.min(w, h) * 0.5;
  const SWEEP_MS = JOIN_MS - 300;
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
  const headAt = (t) => {
    const e = ease(t);
    const angle = Math.PI * 0.85 - e * Math.PI * 2.4; // in from the lower left, one and a bit loops around her
    const r = R * (1.25 - e * 1.15);
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * 0.85 };
  };
  const colorAt = (t) => (Math.random() < 0.12 ? accent
    : colors[Math.floor(Math.min(Math.max(t + rand(-0.12, 0.12), 0), 0.999) * colors.length)]);
  // a puff fades to a clear version of its own color (plain 'transparent' can leave a dark fringe)
  const clearOf = (hex) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
    if (!m) return 'rgba(0,0,0,0)';
    const v = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},0)`;
  };

  const puffs = [];
  const addPuff = (x, y, vx, vy, size, grow, life, color, alpha) => puffs.push({ x, y, vx, vy, size, grow, life, color, alpha, age: 0, glint: false });

  const start = performance.now();
  let last = start;
  let head = headAt(0);
  const state = { canvas, avatar, raf: 0, emitting: true, revealed: false };

  state.reveal = () => { // the gathered haze opens up as she appears
    if (state.revealed) return;
    state.revealed = true;
    state.emitting = false;
    for (let i = 0; i < 18; i += 1) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(20, 60);
      addPuff(cx + rand(-8, 8), cy + rand(-8, 8), Math.cos(a) * speed, Math.sin(a) * speed,
        R * rand(0.18, 0.3), R * 0.5, rand(0.9, 1.3), i % 6 === 5 ? accent : colors[i % colors.length], 0.22);
    }
  };

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = Math.min((now - start) / SWEEP_MS, 1);
    const prev = head;
    head = headAt(t);
    if (t >= 1 && !state.revealed) state.reveal();

    if (state.emitting) { // the ribbon: soft puffs left along the path the head just flew
      for (let i = 0; i < 4; i += 1) {
        const k = i / 4;
        addPuff(prev.x + (head.x - prev.x) * k + rand(-3, 3), prev.y + (head.y - prev.y) * k + rand(-3, 3),
          rand(-10, 10), rand(-12, 4), R * rand(0.06, 0.1), R * rand(0.12, 0.22), rand(1, 1.6), colorAt(t), 0.16);
      }
      if (Math.random() < 0.25) { // a very few faint glints in the ribbon
        puffs.push({ x: head.x + rand(-6, 6), y: head.y + rand(-6, 6), vx: rand(-8, 8), vy: rand(-10, 6),
          size: rand(0.8, 1.4), grow: 0, life: rand(0.6, 1.1), color: glint, alpha: 0.7, age: 0, glint: true });
      }
      if (t > 0.6) { // the haze gathers on her face as the trail curls in
        addPuff(cx + rand(-R * 0.15, R * 0.15), cy + rand(-R * 0.15, R * 0.15), 0, 0,
          R * rand(0.12, 0.2), R * 0.1, rand(0.8, 1.2), colorAt(rand(0, 1)), 0.08 * (t - 0.6) / 0.4);
      }
    }

    ctx.clearRect(0, 0, w, h);
    for (let i = puffs.length - 1; i >= 0; i -= 1) {
      const p = puffs[i];
      p.age += dt;
      if (p.age >= p.life) { puffs.splice(i, 1); continue; }
      const drag = 0.5 ** dt;
      p.vx = (p.vx + rand(-20, 20) * dt) * drag; // each puff wanders a little on its own
      p.vy = (p.vy + rand(-20, 20) * dt) * drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.age / p.life;
      const fade = Math.min(k / 0.15, 1) * (1 - k) ** 1.5;
      const r = p.size + p.grow * k;
      ctx.globalAlpha = p.alpha * fade;
      if (p.glint) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, p.color);
      g.addColorStop(1, clearOf(p.color));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (state.revealed && !puffs.length) { stopFairyDust(); return; }
    state.raf = requestAnimationFrame(frame);
  }
  state.raf = requestAnimationFrame(frame);
  fairy = state;
}

function revealFairyDust() { if (fairy) fairy.reveal(); }

function stopFairyDust() {
  if (!fairy) return;
  cancelAnimationFrame(fairy.raf);
  fairy.canvas.remove();
  fairy.avatar.classList.remove('fairy-live');
  fairy = null;
}

// shows the loading look, then calls done(); no avatar on this screen: done() right away
function playJoining(done) {
  cancelJoining();
  if (!setJoining(true)) { done(); return; }
  joinTimer = setTimeout(() => { setJoining(false); joinTimer = null; done(); }, JOIN_MS);
}

// The looks to compare, in the order the panel's ‹ › step through them
const JOIN_STYLES = [
  // the tile forms itself: no frame while she loads; she fades in edgeless and takes form
  { id: 'becoming', name: '1. Becoming', desc: 'The tile forms itself: she breathes into being, each breath a little sharper, until she is a tile with edges.' },
  { id: 'emerge', name: '2. Emerge', desc: 'The tile forms itself: a soft, edgeless presence breathes in place, then opens up and gains its edges.' },
  { id: 'coalesce', name: '3. Coalesce', desc: 'The tile forms itself: she gathers from a wider, very blurred area and slowly condenses into her shape.' },
  { id: 'mist', name: '4. Mist', desc: 'A haze of light gathers where she will be, with the DS brand colors (blue, bright blue, teal) slowly turning inside it. Nothing of her shows until she is fully there.' },
  { id: 'fairy', name: '5. Fairy dust', desc: 'The Mist material shaped as a magic trail: a soft ribbon of the brand colors sweeps in and curls around where she will be, gathers on her face, and opens up as she appears.' },
  { id: 'glow', name: 'A. Breathing glow', desc: 'Figma Loading 1: a soft blue shape that slowly breathes.' },
  { id: 'rings', name: 'B. Rings', desc: 'Figma Loading 2: rings move out from the middle, so a longer wait doesn’t look frozen.' },
  { id: 'blur', name: 'C. Blurred to sharp', desc: 'Her still shows blurred and sharpens as she arrives. Recommended: you see Julia from the first second.' },
  { id: 'shimmer', name: 'D. Shimmer', desc: 'A soft band of light sweeps across the tile, like content loading.' },
  { id: 'dots', name: 'E. “Julia is joining…”', desc: 'Plain words with three dots that light up in turn.' },
  { id: 'wave', name: 'F. Voice wave', desc: 'Blue bars move like a voice warming up, then she starts to speak.' },
  { id: 'iris', name: 'G. Iris', desc: 'A small window on her face pulses, then opens up to the whole tile, like a camera opening.' },
  { id: 'aurora', name: 'H. Aurora', desc: 'Soft blue light drifts over the tile, like something gathering, then fades to her.' },
  { id: 'rise', name: 'I. Sunrise', desc: 'A soft blue light rises from the bottom of the tile, then she rises into view.' },
  { id: 'bubble', name: 'J. Speech bubble', desc: 'A bubble with three bouncing dots, like she’s about to say something.' },
  { id: 'orbit', name: 'K. Orbit', desc: 'A small blue dot circles a faint ring, like something on its way.' },
  { id: 'color', name: 'L. Color in', desc: 'Her still shows faded grey, gently breathing, and warms up to full color.' },
  { id: 'curtain', name: 'M. Curtain', desc: 'A thin blue line fills along the bottom while she loads, then the cover lifts up.' },
  // the futuristic direction: breathing gradients
  { id: 'liquid', name: 'N. Liquid gradient', desc: 'New direction: a soft gradient of blues and teal turns slowly and breathes across the tile, like liquid light.' },
  { id: 'orb', name: 'O. Glass orb', desc: 'New direction: a breathing orb with a turning gradient inside and a soft halo around it.' },
  { id: 'edge', name: 'P. Edge glow', desc: 'New direction: a thin gradient light runs around the tile’s edge and breathes, like an assistant listening.' },
  { id: 'holo', name: 'Q. Hologram', desc: 'New direction: her still in a blue-teal duotone that breathes, then she turns to full color.' },
  { id: 'scan', name: 'R. Scan', desc: 'New direction: a soft band of light scans down her blurred still, like she’s being brought in.' },
  { id: 'stardust', name: 'S. Stardust', desc: 'New direction: small points of light drift up around a soft breathing glow.' },
  { id: 'prism', name: 'T. Prism', desc: 'New direction: an iridescent light moves slowly across a frosted tile and breathes.' },
  // avatar-style: they work with Julia herself
  { id: 'halftone', name: 'U. Halftone', desc: 'Avatar-style: she is built from a grid of dots that grow until she is whole, like a digital print.' },
  { id: 'aura', name: 'V. Aura', desc: 'Avatar-style: a breathing gradient aura behind her tile glows and shifts, while she comes into focus.' },
  { id: 'signal', name: 'W. Signal', desc: 'Avatar-style: she is half there, with fine scan lines and a faint flicker, like a hologram tuning in.' },
  { id: 'focus', name: 'X. Focus', desc: 'Avatar-style: only her face is sharp, and the sharp area breathes, like a camera finding focus.' },
  { id: 'halo', name: 'Y. Halo', desc: 'Avatar-style: a ring of light turns in perspective above her head while she is still blurred.' },
];
let joinIndex = 0;

function showJoinStyle(i) {
  joinIndex = (i + JOIN_STYLES.length) % JOIN_STYLES.length;
  const look = JOIN_STYLES[joinIndex];
  document.documentElement.dataset.joinStyle = look.id;
  document.getElementById('join-count').textContent = `${joinIndex + 1} of ${JOIN_STYLES.length}`;
  document.getElementById('join-name').textContent = look.name;
  document.getElementById('join-desc').textContent = look.desc;
  try { localStorage.setItem(JOIN_STYLE_KEY, look.id); } catch (e) { /* not remembered */ }
}
// The "Avatar loading" panel was removed (2026-11-18, my request): the look is fixed to 4. Mist,
// the favorite. The other looks stay in the code (JOIN_STYLES) and can come back with the panel.
showJoinStyle(Math.max(0, JOIN_STYLES.findIndex((l) => l.id === 'mist')));


// The selected tab: "Session paused" while paused, otherwise the activity showing
const isShowing = (link) => {
  if (link === pauseTab) return paused;
  if (link === miniTab) return !paused && miniDemo;
  if (link === splashTab) return !paused && splashDemo;
  return !paused && !miniDemo && !splashDemo && targetOf(link) === current;
};
function syncTabs() {
  navLinks.forEach((link) => {
    const on = isShowing(link);
    link.setAttribute('aria-selected', String(on));
    link.tabIndex = on ? 0 : -1;
  });
}

function openTab(link) {
  if (link === miniTab) { goTo(0, { fresh: true }); setMiniDemo(true); syncTabs(); return; }
  if (link === splashTab) { showSplash(); return; }
  if (link !== pauseTab) { goTo(targetOf(link)); return; }
  goTo(0, { fresh: true }); // the quiz, partway through, then paused
  activities[0].midway();
  pauseSession();
}

// Every navigation (including clicking the tab you're already on) restarts the activity
function goTo(index, { fresh = false, join = false } = {}) {
  if (index < 0 || index >= activities.length) return;
  cancelJoining();
  clearSplashTimers();
  setMiniDemo(false);
  setSplashDemo(false);
  clearPause();
  activities[current].leave();
  canvases[current].classList.remove('active', 'reviewing');
  current = index;
  updateImageToggle();
  reached = canvases[current].classList.contains('lesson') ? LESSON_BASE_REACHED : BASE_REACHED;
  renderProgress();
  activities[current].reset();
  // an answered step opens in review mode (locked, "Back" + "Continue"), unless asked fresh
  const record = !fresh && activities[current].review ? completedActivities.get(current) : undefined;
  canvases[current].classList.toggle('reviewing', !!record);
  canvases[current].classList.add('active');
  syncTabs();
  syncFooter();
  activities[current].enter();
  if (record) activities[current].review(record);
  else if (join) playJoining(() => activities[current].start());
  else activities[current].start(); // links and Space are user gestures, so sound is allowed
}

// Panel: picking a loading look, or Replay, plays it on the screen showing now from the start
function replayJoining() {
  if (!demoStarted || paused) return;
  if (splashDemo) showSplash(); // the look plays only on the splash screen (no loading in the lesson spot)
}
document.getElementById('join-prev').addEventListener('click', () => { showJoinStyle(joinIndex - 1); replayJoining(); });
document.getElementById('join-next').addEventListener('click', () => { showJoinStyle(joinIndex + 1); replayJoining(); });
document.getElementById('join-replay').addEventListener('click', replayJoining);

// A click always restarts the activity, even on the selected tab (ds-change only fires on a change)
navLinks.forEach((link) => {
  link.addEventListener('click', () => openTab(link));
});
// Arrow keys / Home / End move the selection: the DS fires ds-change on the tablist
document.querySelector('.site-nav').addEventListener('ds-change', (e) => {
  const link = navLinks.find((l) => l.dataset.value === String(e.detail.value));
  if (link && !isShowing(link)) openTab(link);
});

// Space steps through the tabs that are showing, in tab-bar order (null: this is the last one)
function nextTab() {
  const from = navLinks.findIndex(isShowing);
  return navLinks.slice(from + 1).find((link) => !link.hidden) || null;
}

// ---- Card footer navigation (English Learning Module reference) ------------------
// The lesson's steps are the tabs, in tab-bar order. "Back" opens the previous step (disabled on
// the first), "Skip for now" marks the step as skipped and opens the next one, and a confirmed
// answer / "Continue" un-marks it and opens the next one. The end of the milestone checks the
// skipped steps ("You skipped N questions").
const skippedActivities = new Set(); // activity indexes skipped in this session
// Review mode: steps answered in this session, with what the student answered (cleared by a
// page refresh). Opening one shows it locked, with only "Back" and "Continue".
const completedActivities = new Map(); // activity index -> { answer } | { text } | {}

function prevTab() {
  const from = navLinks.findIndex(isShowing);
  return navLinks.slice(0, Math.max(0, from)).reverse().find((link) => !link.hidden) || null;
}

function advanceLesson(record) {
  skippedActivities.delete(current);
  if (record) completedActivities.set(current, record);
  const next = nextTab();
  if (next) openTab(next);
}

function skipStep() {
  skippedActivities.add(current);
  const next = nextTab();
  if (next) openTab(next);
}

function goBack() {
  const prev = prevTab();
  if (prev) openTab(prev);
}

// "Return to questions": the first skipped step, in tab-bar order
function returnToSkipped() {
  const link = navLinks.find((l) => !l.hidden && l !== pauseTab && skippedActivities.has(targetOf(l)));
  if (link) openTab(link);
}

document.querySelectorAll('.foot-back').forEach((b) => b.addEventListener('click', goBack));
document.querySelectorAll('.foot-skip').forEach((b) => b.addEventListener('click', skipStep));
// review mode's "Continue": on to the next step (the answer is already saved)
document.querySelectorAll('.foot-continue').forEach((b) => b.addEventListener('click', () => {
  const next = nextTab();
  if (next) openTab(next);
}));

// review mode's corner check, on every card that can be reviewed
document.querySelectorAll('.card-foot .foot-continue').forEach((b) => {
  b.closest('.flashcard, .reading-card').insertAdjacentHTML('afterbegin',
    '<span class="review-stamp" role="img" aria-label="Completed"><ds-icon name="check" size="16"></ds-icon></span>');
});

// "Back" is disabled on the first step
function syncFooter() {
  const back = canvases[current].querySelector('.foot-back');
  if (back) back.disabled = prevTab() === null;
}

// The image toggle (right end of the header) shows or hides the image on the input activities.
// It is one setting for all of them, and it only appears on an activity that has an image.
const frameEl = document.querySelector('.frame');
const imageToggle = document.getElementById('image-toggle');
function updateImageToggle() {
  imageToggle.hidden = canvases[current].querySelector('.input-image-wrap') === null;
}
// DS switch: ds.js flips it on click and fires ds-change with { value: true|false }
imageToggle.addEventListener('ds-change', (e) => {
  frameEl.classList.toggle('images-off', !e.detail.value);
});

// Light / dark theme switch in the header: the DS swaps every token (DS.setTheme)
document.getElementById('theme-toggle').addEventListener('ds-change', (e) => {
  DS.setTheme(e.detail.value ? 'dark' : 'light');
});

// Compare the same-token theme fixes: off brings back the earlier per-theme token swaps (app.css)
document.getElementById('token-fixes-toggle').addEventListener('ds-change', (e) => {
  document.documentElement.classList.toggle('before-token-fixes', !e.detail.value);
});
// Compare the card shadow: on = the LXP shadow (after), off = the earlier DS floating shadow (before)
document.getElementById('card-shadow-toggle').addEventListener('ds-change', (e) => {
  document.documentElement.classList.toggle('card-shadow-before', !e.detail.value);
});
// Shine trials: a soft white reflection layer on the cards / on the screen (app.css "shine")
document.getElementById('card-shine-toggle').addEventListener('ds-change', (e) => {
  document.documentElement.classList.toggle('card-shine', e.detail.value);
});
document.getElementById('screen-shine-toggle').addEventListener('ds-change', (e) => {
  document.documentElement.classList.toggle('screen-shine', e.detail.value);
});
// Prototype-only: share screen (icon only). A click toggles sharing: the primary ring, the
// "stop sharing" icon and label. No real sharing in the prototype.
const sharePill = document.querySelector('.share-pill');
sharePill.addEventListener('click', () => {
  const on = sharePill.getAttribute('aria-pressed') !== 'true';
  sharePill.setAttribute('aria-pressed', String(on));
  sharePill.setAttribute('aria-label', on ? 'Stop sharing screen' : 'Share screen');
  sharePill.querySelector('ds-icon').setAttribute('name', on ? 'share-screen-close' : 'share-screen');
});
updateImageToggle();
syncFooter();

renderProgress();

// ---- Splash: "Start demo" is the first click, so the first video can play with sound --
const splash = document.getElementById('splash');
const startDemoButton = document.getElementById('start-demo');
let demoStarted = false;

function startDemo() {
  if (demoStarted) return;
  demoStarted = true;
  splash.classList.add('hidden');
  activities[current].enter();
  activities[current].start(); // no loading in her lesson spot: she only loads on the splash screen
}

startDemoButton.addEventListener('click', startDemo);
startDemoButton.focus();

// On the video activity Space belongs to the Kaltura player (play / pause), so leave it alone
const spaceIsNative = () => demoStarted && canvases[current].dataset.activity === 'watch';

// While the student types in a text field, keys belong to the field (Space, B, ...)
const isTyping = (e) => e.target instanceof HTMLElement && e.target.matches('textarea, input');

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || spaceIsNative() || isTyping(e)) return;
  e.preventDefault(); // no page scroll / no "click" on a focused button
  if (e.repeat) return;
  if (!demoStarted) { startDemo(); return; }
  if (paused) { continueLesson(); return; } // Space resumes, like a paused player
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  const next = nextTab();
  if (next) openTab(next);
});
// Some browsers fire a button's click on Space keyup
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && !spaceIsNative() && !isTyping(e)) e.preventDefault();
});

// ---- Prototype-only: floating demo panel, dragged from anywhere on it ----------------
// The panel (activity tabs + switches) floats over the screen and can be dragged by any part of
// it; it is kept fully on screen and its spot is remembered between visits.
const demoPanel = document.getElementById('demo-panel');

// Makes one floating panel draggable; spotKey remembers where it was left
function makeFloatingPanel(panel, spotKey) {
  function placePanel(x, y) {
    const maxX = Math.max(0, window.innerWidth - panel.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - panel.offsetHeight);
    panel.style.left = `${Math.min(Math.max(0, x), maxX)}px`;
    panel.style.top = `${Math.min(Math.max(0, y), maxY)}px`;
    panel.style.right = 'auto';  // leaves the default corner
    panel.style.bottom = 'auto';
  }

  function savePanelSpot() {
    try {
      localStorage.setItem(spotKey, JSON.stringify({ x: panel.offsetLeft, y: panel.offsetTop }));
    } catch (e) { /* storage unavailable: the panel just starts at its default spot */ }
  }

  try {
    const spot = JSON.parse(localStorage.getItem(spotKey));
    if (spot) placePanel(spot.x, spot.y);
  } catch (e) { /* no saved spot */ }

  // Press anywhere on the panel (grip, background, a tab or a switch) and move: once the pointer has
  // moved DRAG_THRESHOLD px it is a drag, and the click that would follow is swallowed so the tab or
  // switch under it isn't triggered. A press that doesn't move is a normal click.
  const DRAG_THRESHOLD = 4;
  let panelDrag = null;      // { id, startX, startY, offsetX, offsetY, moved } while a press is down
  let swallowClick = false;

  panel.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    panelDrag = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - panel.offsetLeft,
      offsetY: e.clientY - panel.offsetTop,
      moved: false,
    };
  });

  panel.addEventListener('pointermove', (e) => {
    if (!panelDrag || e.pointerId !== panelDrag.id) return;
    if (!panelDrag.moved) {
      if (Math.hypot(e.clientX - panelDrag.startX, e.clientY - panelDrag.startY) < DRAG_THRESHOLD) return;
      panelDrag.moved = true;
      panel.classList.add('dragging');
      try { panel.setPointerCapture(e.pointerId); } catch (err) { /* keeps working without capture */ }
    }
    placePanel(e.clientX - panelDrag.offsetX, e.clientY - panelDrag.offsetY);
  });

  function endPanelDrag(e) {
    if (!panelDrag || e.pointerId !== panelDrag.id) return;
    if (panelDrag.moved) {
      panel.classList.remove('dragging');
      savePanelSpot();
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0); // only the click of this very press
    }
    panelDrag = null;
  }
  panel.addEventListener('pointerup', endPanelDrag);
  panel.addEventListener('pointercancel', endPanelDrag);

  // capture phase: runs before the tab's / switch's own click handlers (and the DS's)
  panel.addEventListener('click', (e) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // a smaller window must not leave the panel off screen (only once it has been moved)
  window.addEventListener('resize', () => {
    if (panel.style.left) placePanel(panel.offsetLeft, panel.offsetTop);
  });
  // the saved spot is restored while the panel is still hidden (no size yet), so it could sit off
  // screen: each time the panel opens, pull it fully back into the window
  new MutationObserver(() => {
    if (!panel.hidden && panel.style.left) placePanel(panel.offsetLeft, panel.offsetTop);
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
}

makeFloatingPanel(demoPanel, 'courseware-demo-panel-spot');

// The second panel (Julia's loading looks) is removed from view: kept hidden in index.html so the
// code that fills it keeps working
const joinPanel = document.getElementById('join-panel');
joinPanel.hidden = true;

// The demo panels P hides and shows
const demoPanels = [demoPanel];

// End button: bottom right (default) or top right; then minimized Julia goes to the bottom right
// End button: decided (2026-11-18) it always stays at the bottom right. The "top right" option and
// its panel control were removed; data-end-spot="top" styles in app.css are no longer used.
document.documentElement.dataset.endSpot = 'bottom';
try { localStorage.removeItem('courseware-end-spot'); } catch (err) { /* nothing saved */ }

// ---- Prototype-only: chat with Julia -------------------------------------------------------
// The chat icon sits in the bar, next to the mic (my decision); it opens the chat side panel. Messages are fake: Julia answers each one after a short pause.
const chatPanel = document.getElementById('chat-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const CHAT_REPLIES = [
  'Good question! Let’s look at it together. Which part is not clear?',
  'Nice! Try saying it out loud too, it helps you remember.',
  'Sure. Keep going with the lesson, and write to me whenever you need.',
];
let chatReply = 0;

let chatOpener = null;
function setChatOpen(open, opener, { focus = true } = {}) {
  chatPanel.hidden = !open;
  document.querySelector('.frame').classList.toggle('chat-docked', open); // the layout moves left
  document.querySelectorAll('.chat-open').forEach((b) => b.setAttribute('aria-expanded', String(open)));
  if (open) { chatOpener = opener || null; if (focus) chatInput.focus(); }
  else if (chatOpener && document.contains(chatOpener)) chatOpener.focus(); // focus back to the icon
}
document.addEventListener('click', (e) => {
  const opener = e.target.closest('.chat-open');
  if (opener) setChatOpen(chatPanel.hidden, opener);
  else if (e.target.closest('.chat-close')) setChatOpen(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !chatPanel.hidden) setChatOpen(false);
});

// "View new messages": when the student has scrolled up, a new message from Julia doesn't pull the
// chat down; this button shows instead, and a click (or scrolling down) brings them to it.
const chatNewMessages = document.getElementById('chat-new-messages');
const chatAtBottom = () => chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 24;
function scrollChatDown(smooth) {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
}
chatNewMessages.addEventListener('click', () => {
  scrollChatDown(true);
  chatNewMessages.hidden = true;
  chatInput.focus();
});
chatMessages.addEventListener('scroll', () => { if (chatAtBottom()) chatNewMessages.hidden = true; });

function addChatBubble(text, who) {
  const stayDown = who === 'me' || chatAtBottom();
  const bubble = document.createElement('p');
  bubble.className = `chat-bubble from-${who}`;
  bubble.dir = 'auto'; // a Hebrew message reads right to left
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  if (stayDown) scrollChatDown(false);
  else chatNewMessages.hidden = false;
}

// "Julia is typing": her bubble with three dots, from the moment the student sends until she answers
let chatTypingTimer = null;
function showChatTyping() {
  hideChatTyping();
  const stayDown = chatAtBottom();
  const bubble = document.createElement('p');
  bubble.className = 'chat-bubble from-julia chat-typing';
  bubble.setAttribute('aria-label', 'Julia is typing');
  bubble.innerHTML = '<i></i><i></i><i></i>';
  chatMessages.appendChild(bubble);
  if (stayDown) scrollChatDown(false);
}
function hideChatTyping() { chatMessages.querySelectorAll('.chat-typing').forEach((b) => b.remove()); }

const chatSend = document.getElementById('chat-send');
chatInput.addEventListener('input', () => { chatSend.disabled = !chatInput.value.trim(); });
document.getElementById('chat-compose').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  addChatBubble(text, 'me');
  chatInput.value = '';
  chatSend.disabled = true;
  showChatTyping();
  clearTimeout(chatTypingTimer);
  chatTypingTimer = setTimeout(() => {
    hideChatTyping();
    addChatBubble(CHAT_REPLIES[chatReply % CHAT_REPLIES.length], 'julia');
    chatReply += 1;
  }, 1200);
});

// ---- Prototype-only: chat states panel (C) ---------------------------------------------------
// Every chat state with its use case; a click opens the chat in that state (fake messages).
const CHAT_GREETING = 'Hi! You can write to me here any time during the lesson. What would you like to ask?';
const CHAT_HISTORY = [
  ['julia', CHAT_GREETING],
  ['me', 'What does “rehearse” mean?'],
  ['julia', 'To rehearse is to practice something before you do it for real, like a play or a talk.'],
  ['me', 'Can you give me an example?'],
  ['julia', 'Sure: “The band rehearsed the new song all afternoon before the concert.”'],
  ['me', 'Is it the same as “practice”?'],
  ['julia', 'Very close! “Rehearse” is mostly for a performance. You practice tennis, but you rehearse a speech.'],
  ['me', 'Got it, thanks!'],
];
const chatStatesPanel = document.getElementById('chat-states-panel');
makeFloatingPanel(chatStatesPanel, 'courseware-chat-states-spot');
function toggleChatStates(open = chatStatesPanel.hidden) { chatStatesPanel.hidden = !open; }
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyC' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
  toggleChatStates();
});

function resetChat(messages) {
  clearTimeout(chatTypingTimer);
  chatMessages.replaceChildren();
  chatNewMessages.hidden = true;
  chatInput.value = '';
  chatSend.disabled = true;
  messages.forEach(([who, text]) => addChatBubble(text, who));
  scrollChatDown(false);
}
const CHAT_STATES = {
  open: () => resetChat([['julia', CHAT_GREETING]]),
  writing: () => {
    resetChat([['julia', CHAT_GREETING]]);
    chatInput.value = 'What does “rehearse” mean?';
    chatSend.disabled = false;
  },
  typing: () => { resetChat(CHAT_HISTORY.slice(0, 2)); showChatTyping(); },
  conversation: () => resetChat(CHAT_HISTORY),
  'new-messages': () => {
    resetChat([...CHAT_HISTORY, // a long chat, so there is somewhere to scroll up to
      ['me', 'And what about “perform”?'],
      ['julia', '“Perform” is doing it for real, in front of people. First you rehearse, then you perform.'],
      ['me', 'So actors rehearse a play and then perform it?'],
      ['julia', 'Exactly! That’s a perfect sentence.'],
      ['me', 'Can I use both words in my answer?'],
      ['julia', 'Of course. Using both shows you know the difference.']]);
    chatMessages.scrollTop = 0; // the student scrolled up to read from the start
    addChatBubble('By the way, you can use “rehearse” in the next writing task. Want to try?', 'julia');
    chatNewMessages.hidden = false; // shown even on a screen tall enough to fit it all
  },
};
chatStatesPanel.querySelectorAll('[data-chat-state]').forEach((button) => {
  button.addEventListener('click', () => {
    if (chatPanel.hidden) setChatOpen(true, null, { focus: false });
    CHAT_STATES[button.dataset.chatState]();
    chatStatesPanel.querySelectorAll('[data-chat-state]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  });
});

// P hides and shows the floating demo panels, on any tab (ignored with Cmd/Ctrl/Alt held or while typing). The choice is
// remembered between visits. The key is matched by position (e.code), so it also works with a
// Hebrew keyboard layout (where that key types פ).
const PANEL_HIDDEN_KEY = 'courseware-demo-panel-hidden';
function setPanelHidden(hidden) {
  if (hidden && demoPanels.some((p) => p.contains(document.activeElement))) document.activeElement.blur();
  demoPanels.forEach((p) => { p.hidden = hidden; });
  try { localStorage.setItem(PANEL_HIDDEN_KEY, hidden ? '1' : ''); } catch (err) { /* not remembered */ }
}
try { if (localStorage.getItem(PANEL_HIDDEN_KEY)) demoPanels.forEach((p) => { p.hidden = true; }); } catch (err) { /* shown */ }
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyP' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
  setPanelHidden(!demoPanel.hidden);
});

// T plays "speaking while muted" (same guards as B; matched by position, so it also works with a
// Hebrew keyboard layout, where that key types א)
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyT' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
  toggleMicStates();
});
document.getElementById('mic-states-toggle').addEventListener('click', () => toggleMicStates());

// ---- Prototype-only: mic states panel (T) ---------------------------------------------------
// Every mic state with its use case; a click puts that state on the real bar of the screen showing now.
const micStatesPanel = document.getElementById('mic-states-panel');
makeFloatingPanel(micStatesPanel, 'courseware-mic-states-spot');
function toggleMicStates(open = micStatesPanel.hidden) { micStatesPanel.hidden = !open; }
const MIC_STATES = {
  joining: () => { setMic('idle'); setBarLocked(true); },
  idle: () => setMic('idle'),
  listening: () => setMic('listening'),
  thinking: () => startThinking(),
  feedback: () => { setMic('idle'); showBarMessage('Correct! Excellent job!'); },
  muted: () => setMic('muted'),
  'system-off': () => setMic('muted'),
  'talk-muted': () => simulateTalkingMuted({ hold: true }),
  permission: () => { setMic('idle'); showBarChip('Allow access to your mic', { icon: true }); },
  blocked: () => { setMic('muted'); showBarChip('Enable your mic to talk'); },
  video: () => goTo(2),
};
micStatesPanel.querySelectorAll('.mic-state').forEach((button) => {
  button.addEventListener('click', () => {
    if (!demoStarted || paused) return;
    const state = button.dataset.state;
    if (state !== 'video' && bottomBarEl.classList.contains('watching')) goTo(0, { fresh: true }); // the mic is hidden on the video screen
    endTalkingMuted();
    setBarLocked(false);
    MIC_STATES[state]();
    micStatesPanel.querySelectorAll('.mic-state').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  });
});
