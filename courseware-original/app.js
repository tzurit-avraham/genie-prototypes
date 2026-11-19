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

function setMic(state) {
  const muted = state === 'muted';
  micPill.classList.toggle('muted', muted);
  micPill.classList.toggle('listening', state === 'listening');
  micPill.setAttribute('aria-pressed', String(muted));
  micIcon.setAttribute('name', muted ? 'microphone-muted' : 'microphone');
  // 'muted' is the system turning the mic off while the student answers by typing or clicking, not
  // something the student did, so there is nothing to ask of them: the message is hidden (it keeps
  // its space, so the bar does not change height). The same 'away' class is used by the video activity.
  micMessage.parentElement.classList.toggle('away', muted);
  if (!muted) micMessage.textContent = state === 'listening' ? 'Listening...' : 'Talk to interrupt';
}

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
  answers.forEach((answer) => {
    answer.addEventListener('click', () => {
      answers.forEach((a) => a.setAttribute('aria-checked', String(a === answer)));
      confirmButton.disabled = false;
    });
  });

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
    leave() { video.pause(); },
    reset() {
      started = false;
      hintPlaying = false;
      answers.forEach((a) => a.setAttribute('aria-checked', 'false'));
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
  let started = false;
  let state = 'intro'; // intro -> reading -> done -> (Read again) reading ...
  let helpPlaying = false;

  const helpSrc = 'assets/read out loud.mp4';
  const doneSrc = 'assets/Julia-pause-Awesome-It-2026-10-06.mp4';
  let videoSrc = helpSrc;
  function setVideo(src) {
    if (videoSrc === src) return;
    videoSrc = src;
    video.src = src;
  }

  // Start reading: avatar shrinks, "Need help?" appears, button becomes "Done reading"
  // Done reading: stop listening, avatar says "Awesome", button becomes "Read again"
  // Read again: back to reading
  readButton.addEventListener('click', () => {
    if (state === 'intro' || state === 'done') {
      state = 'reading';
      video.pause();
      setVideo(helpSrc);
      helpPlaying = false;
      avatar.classList.remove('hint-playing');
      avatar.classList.add('shrunk');
      helpButton.tabIndex = 0;
      readLabel.textContent = 'Done reading';
      readButton.classList.remove('again');
      readButton.classList.add('outlined', 'finish');
      setMic('listening');
      playStartSound();
    } else if (state === 'reading') {
      state = 'done';
      readButton.classList.remove('outlined', 'finish');
      readButton.classList.add('again');
      readLabel.textContent = 'Read again';
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
  });

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
    reset() {
      started = false;
      state = 'intro';
      helpPlaying = false;
      avatar.classList.remove('shrunk', 'hint-playing');
      helpButton.tabIndex = -1;
      readLabel.textContent = 'Start reading';
      readButton.classList.remove('again', 'finish');
      readButton.classList.add('outlined');
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

  input.addEventListener('input', () => {
    confirmButton.disabled = input.value.trim() === '';
  });

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
    leave() { video.pause(); },
    reset() {
      started = false;
      helpPlaying = false;
      input.value = '';
      confirmButton.disabled = true;
      avatar.classList.remove('shrunk', 'hint-playing');
      helpButton.tabIndex = -1;
      video.pause();
      video.currentTime = 0;
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
    micMessage.parentElement.classList.toggle('away', away);
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
      micMessage.parentElement.classList.remove('away');
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
  const introSrc = video.getAttribute('src');
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
    root.classList.remove('side', 'settled', 'reached', 'ready', 'consumed');
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

// holdNext: show the milestone as completed but don't activate the next one yet
function renderProgress(holdNext = false) {
  steps.forEach((step, i) => {
    const done = i < reached;
    const isCurrent = i === reached && !holdNext;
    step.classList.toggle('done', done);
    step.classList.toggle('current', isCurrent);
    if (isCurrent) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
    step.querySelector('.sr-only').textContent =
      `Milestone ${i + 1}, ${done ? 'reached' : isCurrent ? 'in progress' : 'not started'}`;
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
];
const navLinks = [...document.querySelectorAll('.site-nav .ds-tab')];
const targetOf = (link) => Number(link.dataset.value); // which activity a tab opens
let current = 0;

// Every navigation (including clicking the tab you're already on) restarts the activity
function goTo(index) {
  if (index < 0 || index >= activities.length) return;
  activities[current].leave();
  canvases[current].classList.remove('active');
  current = index;
  updateImageToggle();
  reached = canvases[current].classList.contains('lesson') ? LESSON_BASE_REACHED : BASE_REACHED;
  renderProgress();
  activities[current].reset();
  canvases[current].classList.add('active');
  navLinks.forEach((link) => {
    link.setAttribute('aria-selected', String(targetOf(link) === current));
    link.tabIndex = targetOf(link) === current ? 0 : -1;
  });
  activities[current].enter();
  activities[current].start(); // links and Space are user gestures, so sound is allowed
}

// A click always restarts the activity, even on the selected tab (ds-change only fires on a change)
navLinks.forEach((link) => {
  link.addEventListener('click', () => goTo(targetOf(link)));
});
// Arrow keys / Home / End move the selection: the DS fires ds-change on the tablist
document.querySelector('.site-nav').addEventListener('ds-change', (e) => {
  const index = Number(e.detail.value);
  if (index !== current) goTo(index);
});

// Space steps through the tabs that are showing, in tab-bar order (-1: this is the last one)
function nextTarget() {
  const from = navLinks.findIndex((link) => targetOf(link) === current);
  const next = navLinks.slice(from + 1).find((link) => !link.hidden);
  return next ? targetOf(next) : -1;
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
updateImageToggle();

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
  activities[current].start();
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
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  goTo(nextTarget());
});
// Some browsers fire a button's click on Space keyup
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && !spaceIsNative() && !isTyping(e)) e.preventDefault();
});

// The ambient mesh gradient background is on by default; B turns it off and on again, on any tab
// (ignored with Cmd/Ctrl/Alt held, so browser shortcuts like Cmd+B keep working)
const avatarViewEl = document.querySelector('.avatar-view');
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyB' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
  avatarViewEl.classList.toggle('mesh-on');
});
