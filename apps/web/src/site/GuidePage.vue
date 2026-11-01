<template>
  <article class="guide" aria-labelledby="guide-title">
    <header class="site-section-head">
      <h1 id="guide-title">Guide</h1>
      <p class="site-prose">
        How a Cluenite round runs, which commands the chat uses, and what to
        check when a round does not respond.
      </p>
    </header>

    <section class="site-section" aria-labelledby="round-title">
      <div class="site-section-head">
        <h2 id="round-title">What a round is</h2>
      </div>
      <div class="site-prose">
        <p>
          A round is one case. The board shows a premise, a question, and the
          clues on file. The team examines clues, links the ones that explain
          each other, and submits a verdict.
        </p>
        <p>
          In a live round, a verdict stays closed until the proof is complete.
          The server accepts or rejects it, and the reveal shows the accepted
          result. The manuscript sample only demonstrates the interface.
        </p>
      </div>
    </section>

    <section class="site-section" aria-labelledby="commands-title">
      <div class="site-section-head">
        <h2 id="commands-title">Commands</h2>
        <p class="site-prose">
          Viewers type commands in chat, and the host panel can send the same
          commands. Replace placeholders with the IDs shown on the board.
          Inspect clue IDs, link released evidence IDs, and use a verdict ID
          when the proof is complete.
        </p>
        <p class="site-prose">
          Some cases add more commands. <code>!help</code> lists the ones that
          apply to the round.
        </p>
      </div>
      <table class="ledger">
        <thead>
          <tr>
            <th scope="col">Command</th>
            <th scope="col">What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>!look &lt;clue-id&gt;</code></td>
            <td>
              Examines one clue on the board. <code>!inspect</code> does the
              same.
            </td>
          </tr>
          <tr>
            <td><code>!link &lt;evidence-id&gt; &lt;evidence-id&gt;</code></td>
            <td>
              Proposes a link between two released evidence records. The round
              checks the link against the proof.
            </td>
          </tr>
          <tr>
            <td><code>!solve &lt;verdict-id&gt;</code></td>
            <td>
              Submits a verdict. The command is offered once the proof is
              complete.
            </td>
          </tr>
          <tr>
            <td><code>!hint</code></td>
            <td>
              Gives the next hint. Offered while the round still has hints left.
            </td>
          </tr>
          <tr>
            <td><code>!help</code></td>
            <td>Replies in chat with the commands available right now.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="site-section" aria-labelledby="flow-title">
      <div class="site-section-head">
        <h2 id="flow-title">Starting a round</h2>
      </div>
      <ol class="steps">
        <li>
          <h3>Sign in with Twitch</h3>
          <p>
            The case menu checks your sign-in each time it opens. Start stays
            disabled until you are signed in.
          </p>
        </li>
        <li>
          <h3>Pick a case and start it</h3>
          <p>
            Choose a case in the case menu and select Start this round. The host
            panel opens with the new session.
          </p>
        </li>
        <li>
          <h3>Add the OBS source</h3>
          <p>
            OBS needs a read-only source link with a session ID and a private
            overlay token. The website does not issue this link yet. Read the
            <a class="site-inline-link" href="/setup">OBS setup guide</a> for
            the current requirements.
          </p>
        </li>
        <li>
          <h3>Play the round</h3>
          <p>
            Viewers send commands in chat. Examine clues, link them, and submit
            a verdict once the proof is complete.
          </p>
        </li>
      </ol>
    </section>

    <section class="site-section" aria-labelledby="modes-title">
      <div class="site-section-head">
        <h2 id="modes-title">Modes</h2>
      </div>
      <div class="site-prose">
        <h3>Quick Case</h3>
        <p>
          One short case with a fixed set of clues. The public A Missing
          Manuscript sample is a local interface demonstration, separate from
          the live Gallery Shadow case. It does not validate a solution or
          connect to Twitch. Open it at
          <a class="site-inline-link" href="/?view=quick">/?view=quick</a>.
        </p>
        <h3>Mystery Live</h3>
        <p>
          A live round. The streamer runs the board, and chat sends the
          commands. Start it from the case menu after Twitch sign-in. Live
          Twitch chat has not been verified yet.
        </p>
        <h3>Co-op</h3>
        <p>
          Two broadcasters share one case through an invitation. The backend has
          local mock-provider tests; browser invitation controls are unfinished.
          It has not been verified live.
        </p>
      </div>
    </section>

    <section class="site-section" aria-labelledby="verdict-title">
      <div class="site-section-head">
        <h2 id="verdict-title">Hints and verdicts</h2>
      </div>
      <div class="site-prose">
        <p>
          Some cases have no hints. In Mystery Live, the host can send
          <code>!hint</code> to request another available hint if the button is
          not shown. When every hint is used, no more are offered.
        </p>
        <p>
          In a live round, the server accepts or rejects each verdict. The
          reveal shows the accepted verdict. The local manuscript sample only
          demonstrates the interface; its selections are not validated or
          recorded.
        </p>
      </div>
    </section>

    <section class="site-section" aria-labelledby="trouble-title">
      <div class="site-section-head">
        <h2 id="trouble-title">When something does not work</h2>
      </div>
      <dl class="guide-faq">
        <div>
          <dt>Start this round is disabled</dt>
          <dd>
            Sign in with Twitch from the case menu. The menu checks your sign-in
            again each time it loads.
          </dd>
        </div>
        <div>
          <dt>The case list does not load</dt>
          <dd>
            The server is not running, or this address cannot reach it. Start
            the server, then select Retry loading cases.
          </dd>
        </div>
        <div>
          <dt>Chat commands do nothing</dt>
          <dd>
            Chat commands need a configured Twitch channel. Without one, send
            the command from the host panel.
          </dd>
        </div>
        <div>
          <dt>The OBS source is blank</dt>
          <dd>
            Check that the address uses the session ID shown in the host panel,
            and that the session is still running.
          </dd>
        </div>
        <div>
          <dt>There is no sound</dt>
          <dd>
            Check the sound switch in Settings. The case view reads it when it
            opens, so reopen the case view after you change it.
          </dd>
        </div>
      </dl>
    </section>

    <div class="site-actions">
      <a class="site-button" href="/play">Open the case menu</a>
      <a class="site-button site-button--quiet" href="/settings"
        >Open settings</a
      >
    </div>
  </article>
</template>
