<template>
  <div class="landing">
    <section class="hero" aria-labelledby="landing-title">
      <img class="hero-photo" src="./landing/hero-scene.jpg" alt="" aria-hidden="true" fetchpriority="high" decoding="async" />
      <div class="hero-copy">
        <h1 id="landing-title">Solve the case<br />with your chat.</h1>
        <span class="hero-rule" aria-hidden="true"></span>
        <p class="hero-lede">
          Cluenite turns a live stream into a detective case. The streamer runs the board. Viewers
          read clues, link evidence, and push the round toward a verdict.
        </p>
        <div class="hero-actions">
          <a class="lbtn lbtn--primary" href="/play">
            Open the case menu
            <img src="./landing/icon-arrow.png" alt="" />
          </a>
          <a class="lbtn lbtn--quiet" href="/guide">
            <img src="./landing/icon-book.png" alt="" />
            Read the guide
          </a>
        </div>
        <p class="hero-fine">
          <img src="./landing/icon-twitch.png" alt="" />
          <span>
            A live round starts after Twitch sign-in. To see the board first, open the
            <a class="site-inline-link" href="/?view=quick">Quick Case preview</a>, labeled sample data and not connected to Twitch.
          </span>
        </p>
      </div>
    </section>

    <figure class="board">
      <div class="board-head">
        <img src="./landing/icon-search.png" alt="" />
        <span class="board-brand">Cluenite</span>
        <span class="board-title">&mdash; Case Board</span>
        <span class="board-badge">Sample board</span>
      </div>
      <div class="board-desk" aria-hidden="true">
        <img class="board-map" src="./landing/step-map.jpg" alt="" loading="lazy" decoding="async" />
        <span class="board-thread board-thread--a"></span>
        <span class="board-thread board-thread--b"></span>
        <div class="board-slip board-slip--a">
          <img src="./landing/icon-camera.png" alt="" />
          <span class="board-slip-text">
            <span class="board-slip-label">CAM</span>
            <span class="board-slip-note">Clue on file</span>
          </span>
        </div>
        <div class="board-slip board-slip--b">
          <img src="./landing/icon-key.png" alt="" />
          <span class="board-slip-text">
            <span class="board-slip-label">ACCESS</span>
            <span class="board-slip-note">Clue on file</span>
          </span>
        </div>
        <div class="board-slip board-slip--c">
          <img src="./landing/icon-calendar.png" alt="" />
          <span class="board-slip-text">
            <span class="board-slip-label">SCHEDULE</span>
            <span class="board-slip-note">Clue on file</span>
          </span>
        </div>
        <img class="board-photo" src="./landing/polaroid.jpg" alt="" />
        <span class="board-clip"></span>
        <div class="board-slip board-slip--verdict">
          <img src="./landing/icon-scales.png" alt="" />
          <span class="board-slip-text">
            <span class="board-slip-label">Verdict</span>
            <span class="board-slip-note">Stays open until the proof is complete.</span>
          </span>
        </div>
        <span class="board-pin board-pin--a"></span>
        <span class="board-pin board-pin--b"></span>
        <span class="board-pin board-pin--c"></span>
        <img class="board-seal" src="./landing/seal.jpg" alt="" />
      </div>
      <div class="board-chat">
        <p class="board-chat-head">
          <img src="./landing/icon-chat.png" alt="" />
          Viewer Chat Look Commands
        </p>
        <ol class="board-feed" aria-label="Illustrative chat commands">
          <li>
            <img src="./landing/icon-people.png" alt="" />
            <span class="feed-who">viewer</span>
            <code>!look CAM</code>
          </li>
          <li>
            <img src="./landing/icon-people.png" alt="" />
            <span class="feed-who">viewer</span>
            <code>!look ACCESS</code>
          </li>
          <li>
            <img src="./landing/icon-people.png" alt="" />
            <span class="feed-who">viewer</span>
            <code>!look SCHEDULE</code>
          </li>
        </ol>
      </div>
      <figcaption class="board-caption">Illustrative board and chat, not a live case.</figcaption>
    </figure>

    <div class="ornament-rule ornament-rule--top" aria-hidden="true">
      <img src="./landing/orn-hat.png" alt="" />
    </div>

    <section class="section" aria-labelledby="how-title">
      <header class="section-head">
        <h2 id="how-title">How a round runs</h2>
        <p>A simple, chat-driven detective flow from case to verdict.</p>
      </header>
      <ol class="steps">
        <li class="step">
          <span class="step-no" aria-hidden="true">1</span>
          <div class="step-art">
            <img src="./landing/step-folder.jpg" alt="" loading="lazy" decoding="async" />
          </div>
          <h3>The case opens</h3>
          <p>
            The streamer picks a case from the menu. The board shows the premise, the question, and
            the clues on file.
          </p>
        </li>
        <li class="step">
          <span class="step-no" aria-hidden="true">2</span>
          <div class="step-art">
            <img src="./landing/step-lens.jpg" alt="" loading="lazy" decoding="async" />
          </div>
          <h3>Viewers read<br />the evidence</h3>
          <p>
            Clues are examined from chat or the host panel. Each look adds to what the team knows
            so far.
          </p>
        </li>
        <li class="step">
          <span class="step-no" aria-hidden="true">3</span>
          <div class="step-art">
            <img src="./landing/step-map.jpg" alt="" loading="lazy" decoding="async" />
          </div>
          <h3>The team<br />links clues</h3>
          <p>
            Two clues that explain each other can be linked. Hints stay available while the round
            still has them.
          </p>
        </li>
        <li class="step">
          <span class="step-no" aria-hidden="true">4</span>
          <div class="step-art">
            <img src="./landing/step-gavel.jpg" alt="" loading="lazy" decoding="async" />
          </div>
          <h3>A verdict<br />closes the round</h3>
          <p>
            A verdict needs a complete proof. The server accepts or rejects it, and the reveal shows
            the accepted verdict.
          </p>
        </li>
      </ol>
    </section>

    <div class="ornament-rule" aria-hidden="true">
      <img src="./landing/orn-figure.png" alt="" />
    </div>

    <section class="section" aria-labelledby="modes-title">
      <header class="section-head">
        <h2 id="modes-title">Modes</h2>
        <p>Different ways to play <span class="section-head-soft">Cluenite</span>, from a quick case to a live show.</p>
      </header>
      <div class="modes-wrap">
        <table class="modes-table" aria-labelledby="modes-title">
          <thead>
            <tr>
              <th scope="col">Mode</th>
              <th scope="col">What happens</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Quick Case</th>
              <td data-label="What happens">One short case on the board, with a fixed set of clues.</td>
              <td data-label="Status">
                Preview, labeled sample data. Open it at
                <a class="site-inline-link" href="/?view=quick">/?view=quick</a>.
              </td>
            </tr>
            <tr>
              <th scope="row">Mystery Live</th>
              <td data-label="What happens">The streamer runs a live round. Chat and the host panel send commands.</td>
              <td data-label="Status">Starts from the case menu after Twitch sign-in. Live Twitch chat is not verified yet.</td>
            </tr>
            <tr>
              <th scope="row">Co-op</th>
              <td data-label="What happens">Two broadcasters share one case through an invitation.</td>
              <td data-label="Status">Tested locally with a mock Twitch provider. Not yet played live.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="band" aria-labelledby="status-title">
      <img class="band-art" src="./landing/typewriter.jpg" alt="" loading="lazy" decoding="async" />
      <div class="band-copy">
        <h2 id="status-title">Where this build stands</h2>
        <p>
          Twitch sign-in uses the server's OAuth flow. It has not yet been checked against a live
          Twitch app.
        </p>
        <p>
          The OBS browser source was tested in Chromium with mock services. OBS Studio itself has
          not been tested yet.
        </p>
        <p>Sample rounds are labeled sample data and are not connected to Twitch. Live rounds come only from the server.</p>
      </div>
    </section>

    <section class="close" aria-labelledby="close-title">
      <img class="close-art close-art--left" src="./landing/cta-magnifier.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <img class="close-art close-art--right" src="./landing/cta-papers.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <h2 id="close-title">Your next round starts in the case menu.</h2>
      <span class="close-rule" aria-hidden="true"></span>
      <a class="lbtn lbtn--primary" href="/play">
        Open the case menu
        <img src="./landing/icon-arrow.png" alt="" />
      </a>
    </section>
  </div>
</template>

<style scoped>
/* Landing is an 880px column that follows the 1122px target layout. Below 760px it stacks. */
.landing {
  --thread-red: #9a4536;
  width: min(880px, 100%);
  margin: 0 auto;
  color: var(--case-paper);
  font-family: var(--font-body);
}

.landing h1,
.landing h2,
.landing h3 {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--case-paper);
}

.landing img {
  display: block;
  max-width: 100%;
}

/* Shared small controls */
.lbtn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  height: 36px;
  padding: 0 16px;
  border-radius: 3px;
  font: 600 0.8125rem/1 var(--font-body);
  text-decoration: none;
  white-space: nowrap;
}

.lbtn img {
  height: 14px;
  width: auto;
  flex: none;
}

.lbtn--primary {
  min-width: 176px;
  color: var(--case-slip-ink);
  background: linear-gradient(180deg, #e8cc97, #c69c66);
  border: 1px solid var(--case-gold);
}

.lbtn--quiet {
  min-width: 138px;
  color: var(--case-paper);
  background: transparent;
  border: 1px solid var(--case-rule-strong);
}

.lbtn:hover {
  border-color: var(--case-paper);
}

/* Hero */
.hero {
  position: relative;
  min-height: 320px;
  padding-bottom: 14px;
}

/* The photo bleeds to the viewport's right edge, as in the mockup. .site-main clips any overflow. */
.hero-photo {
  position: absolute;
  top: 0;
  bottom: 0;
  right: calc((100% - 100vw) / 2);
  width: calc(520px + (100vw - 100%) / 2);
  height: auto;
  object-fit: cover;
  /* Soften the left and bottom edges so the bleed does not end in hard seams. */
  -webkit-mask-image:
    linear-gradient(90deg, transparent 0, #000 160px),
    linear-gradient(180deg, #000 65%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(90deg, transparent 0, #000 160px),
    linear-gradient(180deg, #000 65%, transparent 100%);
  mask-composite: intersect;
}

.hero::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    var(--case-bg) 0,
    var(--case-bg) 300px,
    rgba(16, 13, 10, 0) 440px
  );
}

.hero-copy {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 500px;
  padding: 36px 0 0 6px;
}

.hero h1 {
  margin: 0;
  font-size: 3.375rem;
  line-height: 1.04;
}

.hero-rule {
  display: block;
  box-sizing: border-box;
  width: 200px;
  height: 7px;
  margin: 2px 0 0 184px;
  border-bottom: 2px solid var(--case-gold);
  border-radius: 0 0 60% 60% / 0 0 100% 100%;
}

.hero-lede {
  margin: 14px 0 0;
  max-width: 392px;
  font-size: 0.875rem;
  line-height: 1.35;
  color: var(--case-paper);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 22px;
}

.hero-fine {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  max-width: 400px;
  margin: 8px 0 0 6px;
  font-size: 0.6875rem;
  line-height: 1.5;
  color: var(--case-paper-dim);
}

.hero-fine img {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  flex: none;
}

/* Board: a 740 x 390 composition. Desktop positions are absolute; small screens stack it. */
.board {
  position: relative;
  box-sizing: border-box;
  width: 740px;
  height: 390px;
  margin: 0 auto;
  background: var(--case-panel);
  outline: 2px solid var(--case-rule-strong);
  outline-offset: -2px;
  box-shadow:
    inset 0 0 0 5px var(--case-bg),
    inset 0 0 0 6px var(--case-rule);
  overflow: hidden;
}

.board-head {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 28px;
  border-bottom: 1px solid var(--case-rule);
  font-size: 0.8125rem;
  color: var(--case-paper);
}

.board-head img {
  width: 14px;
  height: 14px;
  flex: none;
}

.board-brand {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9375rem;
}

.board-title {
  font-family: var(--font-display);
  color: var(--case-paper-dim);
}

.board-badge {
  position: absolute;
  left: 637px;
  top: 12px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 18px;
  padding: 0 8px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 9px;
  font: 600 0.5625rem/1 var(--font-mono);
  letter-spacing: 0.08em;
  color: var(--case-gold);
}

.board-badge::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--case-gold);
}

.board-desk {
  position: absolute;
  left: 15px;
  top: 40px;
  width: 442px;
  height: 315px;
  background:
    radial-gradient(ellipse at 30% 22%, #3a2a1d 0, rgba(58, 42, 29, 0) 60%),
    radial-gradient(ellipse at 80% 90%, #2e2116 0, rgba(46, 33, 22, 0) 55%),
    #22180f;
  box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.5);
}

/* Map texture under the slips, kept dim so the notes stay the focus. */
.board-map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.32;
  pointer-events: none;
}

.board-thread {
  position: absolute;
  height: 3px;
  background: var(--thread-red);
  transform-origin: 0 50%;
  opacity: 1;
}

.board-thread--a {
  left: 75px;
  top: 197px;
  width: 95px;
  transform: rotate(-59.6deg);
}

.board-thread--b {
  left: 300px;
  top: 100px;
  width: 223px;
  transform: rotate(54.9deg);
}

.board-slip {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-radius: var(--radius-slip);
  background: var(--case-slip);
  color: var(--case-slip-ink);
  box-shadow: 0 10px 14px -8px rgba(0, 0, 0, 0.6);
  transform: rotate(var(--r, 0deg));
}

.board-slip::before {
  content: "";
  position: absolute;
  top: -6px;
  left: 50%;
  width: 11px;
  height: 11px;
  margin-left: -5px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f3dfae, var(--case-gold) 45%, #8a6232 100%);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5);
}

.board-slip img {
  width: auto;
  height: 28px;
  flex: none;
}

.board-slip-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.board-slip-label {
  font: 700 0.9375rem/1.1 var(--font-mono);
  letter-spacing: 0.06em;
}

.board-slip-note {
  font: italic 0.75rem/1.35 var(--font-display);
  color: #5b4636;
}

.board-slip--a {
  left: 30px;
  top: 15px;
  width: 170px;
  height: 95px;
  --r: -4deg;
}

.board-slip--b {
  left: 217px;
  top: 15px;
  width: 172px;
  height: 83px;
  --r: 3deg;
}

.board-slip--c {
  left: 115px;
  top: 110px;
  width: 182px;
  height: 92px;
  --r: -4deg;
}

.board-slip--verdict {
  left: 203px;
  top: 197px;
  width: 215px;
  height: 103px;
  align-items: center;
  padding: 0 18px;
  background: #1b130d;
  color: var(--case-paper);
  border: 1.5px solid var(--case-gold);
  box-shadow: none;
}

.board-slip--verdict::before {
  display: none;
}

.board-slip--verdict img {
  height: 30px;
}

.board-slip--verdict .board-slip-label {
  font: 600 1.0625rem/1.2 var(--font-display);
  letter-spacing: 0;
  color: var(--case-paper);
}

.board-slip--verdict .board-slip-note {
  font: 0.75rem/1.4 var(--font-display);
  color: var(--case-paper-dim);
}

.board-photo {
  position: absolute;
  left: 5px;
  top: 190px;
  width: 145px;
  height: 130px;
  object-fit: cover;
  border: 4px solid #ece3d1;
  box-sizing: border-box;
  box-shadow: 0 10px 14px -8px rgba(0, 0, 0, 0.6);
}

.board-clip {
  position: absolute;
  left: 40px;
  top: 186px;
  width: 11px;
  height: 26px;
  box-sizing: border-box;
  border: 2px solid #b9b2a6;
  border-radius: 6px;
}

.board-seal {
  position: absolute;
  left: 397px;
  top: 251px;
  width: 64px;
  height: auto;
}

.board-pin {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #e8a090, #8e3b2f 70%);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5);
}

.board-pin--a {
  left: 408px;
  top: 45px;
}

.board-pin--b {
  left: 114px;
  top: 106px;
}

.board-pin--c {
  left: 70px;
  top: 188px;
}

.board-chat {
  position: absolute;
  box-sizing: border-box;
  left: 472px;
  top: 50px;
  width: 248px;
  height: 287px;
  padding: 14px 16px;
  background: var(--case-bg);
  border: 1px solid var(--case-rule);
  border-radius: 3px;
}

.board-chat-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--case-rule);
  font: 600 0.75rem/1.2 var(--font-body);
  color: var(--case-paper);
}

.board-chat-head img {
  width: 14px;
  height: 14px;
  flex: none;
}

.board-feed {
  margin: 0;
  padding: 0;
  list-style: none;
}

.board-feed li {
  display: grid;
  grid-template-columns: 14px 56px 1fr;
  align-items: center;
  gap: 10px;
  height: 31px;
  border-bottom: 1px solid rgba(101, 67, 45, 0.45);
  font-size: 0.75rem;
  color: var(--case-paper-dim);
}

.board-feed li img {
  width: 14px;
  height: 14px;
}

.board-feed code {
  padding: 0;
  border: 0;
  background: none;
  font: 700 0.75rem/1 var(--font-mono);
  color: var(--case-gold);
}

.board-caption {
  position: absolute;
  left: 34px;
  top: 362px;
  margin: 0;
  font-size: 0.625rem;
  line-height: 1.2;
  color: var(--case-paper-dim);
}

/* Ornament dividers */
.ornament-rule {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 760px;
  margin: 30px auto 0;
}

.ornament-rule--top {
  margin-top: 25px;
}

.ornament-rule::before,
.ornament-rule::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--case-rule-strong));
}

.ornament-rule::after {
  background: linear-gradient(90deg, var(--case-rule-strong), transparent);
}

.ornament-rule img {
  width: 28px;
  height: auto;
  flex: none;
}

/* Section heads and steps */
.section {
  margin: 0 auto;
}

.section-head {
  margin-top: 6px;
  text-align: center;
}

.section-head h2 {
  margin: 0;
  font-size: 1.75rem;
  line-height: 1.1;
}

.section-head p {
  margin: 6px 0 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--case-paper-dim);
}

.section-head-soft {
  color: var(--case-paper);
}

.steps {
  position: relative;
  box-sizing: border-box;
  width: 800px;
  margin: 15px auto 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.step {
  position: relative;
  box-sizing: border-box;
  min-height: 0;
  padding: 12px 6px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: var(--case-panel);
  border: 1px solid var(--case-rule);
  border-radius: 4px;
}

.step-no {
  position: absolute;
  top: -15px;
  left: 50%;
  width: 28px;
  height: 28px;
  margin-left: -14px;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  border: 1px solid var(--case-gold);
  border-radius: 50%;
  background: var(--case-bg);
  font: 600 0.8125rem/1 var(--font-display);
  color: var(--case-gold);
}

.step-art {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 56px;
}

/* Feathered edges hide the rectangular edge of the illustration on the panel. */
.step-art img {
  max-width: 100px;
  max-height: 56px;
  width: auto;
  height: auto;
  -webkit-mask-image: radial-gradient(ellipse at center, #000 58%, transparent 80%);
  mask-image: radial-gradient(ellipse at center, #000 58%, transparent 80%);
}

.step h3 {
  display: grid;
  align-content: center;
  min-height: 2.4em;
  margin: 4px 0 0;
  font-size: 1rem;
  line-height: 1.2;
}

.step p {
  margin: 4px 0 0;
  font-size: 0.6875rem;
  line-height: 1.25;
  color: var(--case-paper-dim);
}

.step:not(:last-child)::before {
  content: "";
  position: absolute;
  top: 68px;
  right: -23px;
  width: 9px;
  height: 2px;
  background: var(--case-paper);
}

.step:not(:last-child)::after {
  content: "";
  position: absolute;
  top: 64px;
  right: -15px;
  border-left: 6px solid var(--case-paper);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

/* Modes: one panel with a three-column table (mode, what happens, status) */
.modes-wrap {
  box-sizing: border-box;
  width: 874px;
  margin: 0 auto;
  background: var(--case-panel);
  border: 1px solid var(--case-rule);
  border-radius: 4px;
  overflow: hidden;
}

.modes-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--case-paper);
}

.modes-table th,
.modes-table td {
  padding: 7px 18px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--case-rule);
}

.modes-table tbody tr:last-child th,
.modes-table tbody tr:last-child td {
  border-bottom: 0;
}

.modes-table thead th {
  padding-top: 11px;
  padding-bottom: 11px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--case-gold);
}

.modes-table thead th:nth-child(1) {
  width: 26%;
}

.modes-table thead th:nth-child(2) {
  width: 36%;
}

.modes-table tbody th {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--case-paper);
}

.modes-table tbody td {
  color: var(--case-paper-dim);
}

.modes-table td a {
  color: var(--case-gold);
}

/* Status band */
.band {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 330px 1fr;
  width: 880px;
  min-height: 168px;
  margin: 20px auto 0;
  background: var(--case-panel);
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  overflow: hidden;
}

.band-art {
  width: 330px;
  height: auto;
  align-self: stretch;
  min-height: 166px;
  object-fit: cover;
}

.band-copy {
  padding: 16px 36px 0 6px;
}

.band h2 {
  margin: 0;
  font-size: 1.75rem;
  line-height: 1.15;
}

.band p {
  max-width: 440px;
  margin: 12px 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--case-paper-dim);
}

/* Closing call to action */
.close {
  position: relative;
  box-sizing: border-box;
  height: 150px;
  margin-top: 8px;
  overflow: hidden;
  text-align: center;
}

/* Art runs full bleed at both edges, dimmed with filter so the reveal animation can keep its opacity. */
.close-art {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.5) saturate(0.85);
  pointer-events: none;
}

.close-art--left {
  left: 0;
  -webkit-mask-image: linear-gradient(to right, #000 30%, transparent);
  mask-image: linear-gradient(to right, #000 30%, transparent);
}

.close-art--right {
  right: 0;
  -webkit-mask-image: linear-gradient(to left, #000 30%, transparent);
  mask-image: linear-gradient(to left, #000 30%, transparent);
}

.close h2,
.close-rule,
.close .lbtn {
  position: relative;
  z-index: 1;
}

.close h2 {
  margin: 22px 0 0;
  font-size: 1.75rem;
  font-style: normal;
  line-height: 1.2;
}

.close-rule {
  display: block;
  width: 296px;
  height: 1px;
  margin: 5px auto 0;
  background: var(--case-gold);
}

.close .lbtn {
  margin-top: 18px;
}

/* Small screens: stack the board, steps, modes, and band. */
@media (max-width: 760px) {
  .hero {
    height: auto;
    padding-bottom: 28px;
  }

  /* .hero .hero-photo outranks the scoped `.landing img` display rule (line 250). */
  .hero .hero-photo,
  .hero::after {
    display: none;
  }

  .hero-copy {
    width: auto;
    padding: 28px 20px 0;
  }

  .hero h1 {
    font-size: 2.5rem;
  }

  .hero-rule {
    width: 60%;
    max-width: 252px;
    margin-left: 40px;
  }

  .board {
    width: 100%;
    height: auto;
    padding-bottom: 42px;
  }

  .board-head {
    position: relative;
    height: 40px;
  }

  .board-badge {
    left: auto;
    right: 16px;
    top: 11px;
  }

  .board-desk {
    position: relative;
    left: auto;
    top: auto;
    width: auto;
    height: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    padding: 20px 14px 24px;
    box-shadow: none;
  }

  .board-thread,
  .board-pin,
  .board-clip {
    display: none;
  }

  .board-desk .board-slip {
    position: relative;
    left: auto;
    top: auto;
    width: auto;
    height: 76px;
    min-width: 0;
  }

  .board-desk .board-slip--verdict {
    grid-column: 1 / -1;
    height: auto;
    padding: 14px 18px;
  }

  .board-desk .board-photo {
    position: relative;
    left: auto;
    top: auto;
    width: 100%;
    height: 150px;
  }

  .board-desk .board-seal {
    position: relative;
    left: auto;
    top: auto;
    justify-self: end;
    width: 58px;
  }

  .board-chat {
    position: relative;
    left: auto;
    top: auto;
    width: auto;
    height: auto;
    margin: 0 14px;
  }

  .board-caption {
    position: relative;
    left: auto;
    top: auto;
    padding: 12px 16px 0;
  }

  .ornament-rule {
    width: calc(100% - 32px);
  }

  .section-head h2 {
    font-size: 2rem;
  }

  .steps {
    width: auto;
    margin: 24px 16px 0;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .step {
    height: auto;
    padding-bottom: 16px;
  }

  .step:not(:last-child)::before,
  .step:not(:last-child)::after {
    display: none;
  }

  .modes-wrap {
    width: auto;
    margin: 24px 16px 0;
  }

  .modes-table thead {
    display: none;
  }

  .modes-table tbody,
  .modes-table tr,
  .modes-table th,
  .modes-table td {
    display: block;
  }

  .modes-table tbody tr {
    padding: 14px 16px;
    border-bottom: 1px solid var(--case-rule);
  }

  .modes-table tbody tr:last-child {
    border-bottom: 0;
  }

  .modes-table th,
  .modes-table td {
    padding: 0;
    border: 0;
    width: auto;
  }

  .modes-table td + td {
    margin-top: 8px;
  }

  .modes-table td::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 2px;
    font-family: var(--font-mono);
    font-size: 0.625rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--case-gold);
  }

  .band {
    width: auto;
    min-height: 0;
    margin: 28px 16px 0;
    grid-template-columns: 1fr;
  }

  .band-art {
    width: 100%;
    height: 180px;
  }

  .band-copy {
    padding: 18px 18px 22px;
  }

  .band h2 {
    font-size: 1.625rem;
  }

  .band p {
    margin-left: 0;
  }

  .close {
    height: auto;
    padding: 0 16px 40px;
  }

  .close-art {
    display: none;
  }

  .close h2 {
    font-size: 1.625rem;
  }

  .close-rule {
    width: 60%;
  }
}
/* Motion. Everything in this block runs only when settings resolve to full motion
   (html[data-motion="full"]). With reduced motion, or before settings load, every element
   stays in its final state. Only opacity, translate, scale, and clip-path are animated. */
@keyframes landing-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes landing-rise {
  from { opacity: 0; translate: 0 12px; }
  to { opacity: 1; translate: 0 0; }
}

@keyframes landing-drop {
  from { opacity: 0; translate: 0 -16px; }
  to { opacity: 1; translate: 0 0; }
}

@keyframes landing-pop {
  from { opacity: 0; scale: 0.4; }
  to { opacity: 1; scale: 1; }
}

@keyframes landing-photo {
  from { opacity: 0; scale: 1.04; }
  to { opacity: 1; scale: 1; }
}

@keyframes landing-thread {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

@keyframes landing-line {
  from { scale: 0 1; }
  to { scale: 1 1; }
}

/* Hero: the photo settles, then the copy rises in sequence. */
html[data-motion="full"] .hero-photo {
  animation: landing-photo 1200ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

html[data-motion="full"] .hero-copy > * {
  animation: landing-rise 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

html[data-motion="full"] .hero-copy > :nth-child(2) { animation-delay: 120ms; }
html[data-motion="full"] .hero-copy > :nth-child(3) { animation-delay: 220ms; }
html[data-motion="full"] .hero-copy > :nth-child(4) { animation-delay: 320ms; }
html[data-motion="full"] .hero-copy > :nth-child(5) { animation-delay: 420ms; }

/* Board: the desk fades in, slips drop onto it, threads are pulled taut,
   then the photo, clip, pins, seal, and feed lines follow in order. */
html[data-motion="full"] .board-desk {
  animation: landing-fade 800ms ease-out both;
}

html[data-motion="full"] .board-slip {
  animation: landing-drop 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

html[data-motion="full"] .board-slip--a { animation-delay: 300ms; }
html[data-motion="full"] .board-slip--b { animation-delay: 420ms; }
html[data-motion="full"] .board-slip--c { animation-delay: 540ms; }
html[data-motion="full"] .board-slip--verdict { animation-delay: 660ms; }

html[data-motion="full"] .board-photo {
  animation: landing-rise 600ms cubic-bezier(0.22, 1, 0.36, 1) 700ms both;
}

html[data-motion="full"] .board-clip {
  animation: landing-fade 500ms ease-out 760ms both;
}

html[data-motion="full"] .board-thread {
  animation: landing-thread 600ms cubic-bezier(0.65, 0, 0.35, 1) both;
}

html[data-motion="full"] .board-thread--a { animation-delay: 900ms; }
html[data-motion="full"] .board-thread--b { animation-delay: 1050ms; }

html[data-motion="full"] .board-pin {
  animation: landing-pop 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

html[data-motion="full"] .board-pin--a { animation-delay: 1000ms; }
html[data-motion="full"] .board-pin--b { animation-delay: 1080ms; }
html[data-motion="full"] .board-pin--c { animation-delay: 1160ms; }

html[data-motion="full"] .board-seal {
  animation: landing-pop 450ms cubic-bezier(0.22, 1, 0.36, 1) 1250ms both;
}

html[data-motion="full"] .board-feed li {
  animation: landing-rise 450ms ease-out 1300ms both;
}

html[data-motion="full"] .board-feed li:nth-child(2) { animation-delay: 1450ms; }
html[data-motion="full"] .board-feed li:nth-child(3) { animation-delay: 1600ms; }

/* Ornament dividers: each line draws outward from the central emblem. */
html[data-motion="full"] .ornament-rule::before {
  transform-origin: 100% 50%;
  animation: landing-line 900ms cubic-bezier(0.22, 1, 0.36, 1) 300ms both;
}

html[data-motion="full"] .ornament-rule::after {
  transform-origin: 0 50%;
  animation: landing-line 900ms cubic-bezier(0.22, 1, 0.36, 1) 300ms both;
}

/* Scroll reveals, driven by the scroll position with no script.
   Browsers without animation-timeline keep the content fully visible. */
@supports (animation-timeline: view()) {
  html[data-motion="full"] .section-head,
  html[data-motion="full"] .step,
  html[data-motion="full"] .modes-wrap,
  html[data-motion="full"] .band-copy,
  html[data-motion="full"] .close-art,
  html[data-motion="full"] .close > h2,
  html[data-motion="full"] .close-rule {
    animation: landing-rise linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 40%;
  }
}

/* Pointer feedback. Limited to devices with hover so touch taps do not stick. */
@media (hover: hover) {
  html[data-motion="full"] .lbtn {
    transition: translate 180ms ease-out, border-color 180ms ease-out;
  }

  html[data-motion="full"] .lbtn:hover {
    translate: 0 -1px;
  }

}
</style>
