<script setup lang="ts">
// Built from the origin the viewer is on, so the address points at this deployment. The two placeholders stay literal.
const obsAddress = `${window.location.origin}/?mode=obs&session=<session-id>#overlay=<overlay-token>`;
</script>

<template>
  <article class="setup-page" aria-labelledby="setup-title">
    <header class="site-section-head">
      <h1 id="setup-title">OBS setup</h1>
      <p class="site-prose">
        Add a round to OBS Studio as a browser source. The OBS view hides the host controls and the
        browser chrome, so the stream shows only the round.
      </p>
    </header>

    <section class="site-section" aria-labelledby="setup-address-title">
      <div class="site-section-head">
        <h2 id="setup-address-title">Address for the browser source</h2>
      </div>
      <p class="setup-address" tabindex="0"><code>{{ obsAddress }}</code></p>
      <p class="site-prose">
        Replace <code>&lt;session-id&gt;</code> and <code>&lt;overlay-token&gt;</code> before you paste the
        address into OBS.
      </p>
    </section>

    <section class="site-section" aria-labelledby="setup-steps-title">
      <div class="site-section-head">
        <h2 id="setup-steps-title">Steps</h2>
      </div>
      <ol class="steps">
        <li>
          <h3>Start a round</h3>
          <p>
            Start a case from the case menu. The host panel opens with the session ID in the address bar.
          </p>
        </li>
        <li>
          <h3>Copy the session ID</h3>
          <p>
            The ID is the value after <code>session=</code> in the host panel address. Keep it private
            until the stream starts.
          </p>
        </li>
        <li>
          <h3>Get an overlay token</h3>
          <p>
            OBS mode reads the overlay token from the part of the address after <code>#</code>. The server
            has a route that issues one, but the case menu and the host panel do not call it yet, so this
            step cannot be completed from the UI.
          </p>
        </li>
        <li>
          <h3>Add a browser source in OBS</h3>
          <p>
            In OBS Studio, add a Browser source to the scene and paste the address above with both
            placeholders replaced.
          </p>
        </li>
        <li>
          <h3>Size the source</h3>
          <p>
            Suggested size: 1920 × 1080, matching a 16:9 scene canvas. Scale the source to fit the layout
            you use on stream.
          </p>
        </li>
        <li>
          <h3>Check the audio</h3>
          <p>
            The OBS view does not start the ambient track. Check any sound in OBS Studio before you go live.
          </p>
        </li>
      </ol>
    </section>

    <section class="site-section" aria-labelledby="setup-verify-title">
      <div class="site-section-head">
        <h2 id="setup-verify-title">Verification status</h2>
      </div>
      <div class="site-notice" data-tone="warn">
        <p>
          The overlay token cannot be issued from the UI yet, so the address above is incomplete until it can.
          The OBS source has also not been tested in OBS Studio on a desktop setup. The steps describe the
          intended setup, not a verified one.
        </p>
      </div>
    </section>

    <div class="site-actions">
      <a class="site-button" href="/play">Open the case menu</a>
      <a class="site-button site-button--quiet" href="/guide">Read the guide</a>
    </div>
  </article>
</template>

<style scoped>
.setup-address {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
  color: var(--case-paper);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9375rem;
  white-space: nowrap;
}
/* Keep the note clear of the address box's border. */
.setup-address + .site-prose {
  margin-top: 12px;
}
</style>
