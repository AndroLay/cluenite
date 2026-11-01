import { gsap } from "gsap";

// GSAP owns transform/opacity/stroke of the elements passed in here. Vue/CSS must
// not animate those same properties while a timeline is alive.
// Callers pass reducedMotion explicitly; when true, timings collapse to short fades
// and decorative motion (pulse, stagger, scale) is dropped. Skipping is done with
// timeline.progress(1), which always leaves the final visual state correct.

const sec = (ms: number): number => ms / 1000;

export interface EvidenceLinkTargets {
  /** SVG path that draws between the two linked evidence cards. */
  connector: SVGGeometryElement;
  /** The two evidence cards that were linked. */
  cards: readonly HTMLElement[];
  /** Small "Linked" badge that appears after the connector finishes. */
  status: HTMLElement;
}

/** Link verified: connector draws, both cards pulse once, status badge appears (~620 ms). */
export function buildEvidenceLinkTimeline(
  targets: EvidenceLinkTargets,
  reducedMotion: boolean,
): gsap.core.Timeline {
  const length = targets.connector.getTotalLength();
  const tl = gsap.timeline({ paused: true });

  tl.fromTo(
    targets.connector,
    { strokeDasharray: length, strokeDashoffset: length },
    {
      strokeDashoffset: 0,
      duration: reducedMotion ? sec(120) : sec(620),
      ease: "power2.inOut",
    },
    0,
  );

  if (!reducedMotion) {
    tl.to(
      targets.cards,
      { scale: 1.03, duration: sec(180), yoyo: true, repeat: 1, ease: "sine.inOut" },
      sec(620),
    );
  }

  tl.fromTo(
    targets.status,
    { opacity: 0, y: reducedMotion ? 0 : 6 },
    { opacity: 1, y: 0, duration: reducedMotion ? sec(120) : sec(260), ease: "power2.out" },
    ">",
  );

  return tl;
}

export interface RevealTargets {
  /** Panel that enters with the reveal. */
  panel: HTMLElement;
  /** Reconstruction lines that appear in sequence. */
  lines: readonly HTMLElement[];
  /** Solved stamp shown last. */
  stamp: HTMLElement;
}

/** Quick reveal: panel enters, lines stagger in, solved stamp lands (~1.6 s, budget 3.4 s). */
export function buildRevealTimeline(targets: RevealTargets, reducedMotion: boolean): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });

  tl.fromTo(
    targets.panel,
    { opacity: 0, y: reducedMotion ? 0 : 16, scale: reducedMotion ? 1 : 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: reducedMotion ? sec(120) : sec(420),
      ease: "power3.out",
    },
    0,
  );

  tl.fromTo(
    targets.lines,
    { opacity: 0, y: reducedMotion ? 0 : 8 },
    {
      opacity: 1,
      y: 0,
      duration: reducedMotion ? sec(120) : sec(260),
      stagger: reducedMotion ? 0 : 0.18,
      ease: "power2.out",
    },
    sec(300),
  );

  tl.fromTo(
    targets.stamp,
    { opacity: 0, scale: reducedMotion ? 1 : 1.3 },
    {
      opacity: 1,
      scale: 1,
      duration: reducedMotion ? sec(120) : sec(350),
      ease: "power3.out",
    },
    ">",
  );

  return tl;
}
