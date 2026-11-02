import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {FootageId} from '../footage';
import {COLOR, FONT, reveal} from '../theme';

// Schematic stand-ins for footage that has not been recorded yet. They show the
// shape of a step, not a Twitch capture, so each one carries the same label as the
// S1 illustration. Content stays inside the stage (y 150–780), above the caption band.
const LABEL = 'ILLUSTRATION · NOT A TWITCH RECORDING · REAL CAPTURE PENDING';

const useEnter = (delay = 0): number => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return reveal(frame, fps, delay);
};

const Stage: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill>
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '150px 150px 300px'}}>
      {children}
    </AbsoluteFill>
    <div
      style={{
        position: 'absolute',
        left: 150,
        top: 806,
        fontFamily: FONT.text,
        fontSize: 18,
        letterSpacing: 2,
        color: COLOR.amber,
      }}
    >
      {LABEL}
    </div>
  </AbsoluteFill>
);

type NodeProps = {
  title: string;
  detail?: string;
  command?: boolean;
  highlight?: boolean;
  width?: number;
  delay?: number;
};

const Node: React.FC<NodeProps> = ({title, detail, command = false, highlight = false, width = 380, delay = 0}) => {
  const enter = useEnter(delay);
  return (
    <div
      style={{
        width,
        boxSizing: 'border-box',
        padding: '26px 30px',
        borderRadius: 8,
        border: `2px solid ${highlight ? COLOR.amber : COLOR.walnut}`,
        backgroundColor: 'rgba(18,12,8,0.82)',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 16}px)`,
      }}
    >
      <div
        style={{
          fontFamily: command ? FONT.mono : FONT.display,
          fontWeight: command ? 400 : 600,
          fontSize: command ? 34 : 40,
          color: highlight ? COLOR.amber : COLOR.parchment,
        }}
      >
        {title}
      </div>
      {detail ? (
        <div style={{marginTop: 12, fontFamily: FONT.text, fontSize: 22, lineHeight: 1.4, color: COLOR.mute}}>
          {detail}
        </div>
      ) : null}
    </div>
  );
};

const Arrow: React.FC<{delay?: number}> = ({delay = 0}) => {
  const enter = useEnter(delay);
  return (
    <div style={{display: 'flex', alignItems: 'center', margin: '0 18px', opacity: enter}}>
      <div style={{width: 64 * enter, height: 2, backgroundColor: COLOR.amber}} />
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: '9px solid transparent',
          borderBottom: '9px solid transparent',
          borderLeft: `14px solid ${COLOR.amber}`,
        }}
      />
    </div>
  );
};

const Row: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{children}</div>
);

const Panel: React.FC<{label: string; width: number; delay?: number; children?: React.ReactNode}> = ({
  label,
  width,
  delay = 0,
  children,
}) => {
  const enter = useEnter(delay);
  return (
    <div
      style={{
        width,
        boxSizing: 'border-box',
        padding: '22px 26px',
        borderRadius: 10,
        border: `2px solid ${COLOR.walnut}`,
        backgroundColor: 'rgba(42,28,19,0.55)',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 16}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT.text,
          fontWeight: 600,
          fontSize: 20,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: COLOR.mute,
        }}
      >
        {label}
      </div>
      <div style={{marginTop: 18}}>{children}</div>
    </div>
  );
};

const Bar: React.FC<{w: string; highlight?: boolean}> = ({w, highlight = false}) => (
  <div
    style={{
      width: w,
      height: 22,
      marginBottom: 16,
      borderRadius: 4,
      backgroundColor: highlight ? COLOR.amber : COLOR.walnut,
      opacity: highlight ? 0.9 : 0.75,
    }}
  />
);

// S2 · chat command flow. Schematic only; no chat UI is drawn.
const FirstEvidenceIllustration: React.FC = () => (
  <Stage>
    <Row>
      <Node title="!look CAM" detail="Chat command" command width={420} delay={0} />
      <Arrow delay={10} />
      <Node title="Case engine" detail="Applies the command to the case" width={420} delay={16} />
      <Arrow delay={26} />
      <Node title="Game state" detail="Board updates from the result" highlight width={420} delay={32} />
    </Row>
  </Stage>
);

// S3 · two pieces of evidence lead to a verdict. The check is drawn in.
const VerdictBadge: React.FC<{delay: number}> = ({delay}) => {
  const enter = useEnter(delay);
  const tick = useEnter(delay + 14);
  return (
    <div
      style={{
        width: 460,
        boxSizing: 'border-box',
        padding: '34px 36px',
        borderRadius: 10,
        border: `2px solid ${COLOR.verdigris}`,
        backgroundColor: 'rgba(18,12,8,0.82)',
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        opacity: enter,
      }}
    >
      <svg width={112} height={112} viewBox="0 0 100 100" style={{flex: '0 0 auto'}}>
        <circle
          cx={50}
          cy={50}
          r={46}
          fill="none"
          stroke={COLOR.verdigris}
          strokeWidth={4}
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 * (1 - enter)}
        />
        <path
          d="M28 52 L44 68 L74 36"
          fill="none"
          stroke={COLOR.verdigris}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 * (1 - tick)}
        />
      </svg>
      <div>
        <div style={{fontFamily: FONT.text, fontWeight: 700, fontSize: 40, letterSpacing: 4, color: COLOR.verdigris}}>
          VERIFIED
        </div>
        <div style={{marginTop: 10, fontFamily: FONT.text, fontSize: 22, color: COLOR.mute}}>
          Case engine verdict
        </div>
      </div>
    </div>
  );
};

const VerdictIllustration: React.FC = () => (
  <Stage>
    <Row>
      <div style={{display: 'flex', flexDirection: 'column', gap: 28}}>
        <Node title="Evidence 1" detail="Found in the case" width={400} delay={0} />
        <Node title="Evidence 2" detail="Found in the case" width={400} delay={10} />
      </div>
      <Arrow delay={22} />
      <VerdictBadge delay={30} />
    </Row>
  </Stage>
);

// S4 · the dashboard: one shared engine, two panels. No Start control is drawn.
const DashboardIllustration: React.FC = () => (
  <Stage>
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40}}>
      <Node title="Shared case engine" detail="One engine behind every mode" width={560} delay={0} />
      <div style={{display: 'flex', gap: 40}}>
        <Panel label="Round" width={520} delay={14}>
          <Bar w="78%" />
          <Bar w="56%" />
          <Bar w="66%" />
        </Panel>
        <Panel label="Case library" width={520} delay={22}>
          <Bar w="70%" />
          <Bar w="88%" highlight />
          <Bar w="60%" />
        </Panel>
      </div>
    </div>
  </Stage>
);

const Tile: React.FC<{index: string; delay: number}> = ({index, delay}) => {
  const enter = useEnter(delay);
  return (
    <div
      style={{
        height: 150,
        boxSizing: 'border-box',
        padding: 20,
        borderRadius: 8,
        border: `2px solid ${COLOR.walnut}`,
        backgroundColor: 'rgba(18,12,8,0.82)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: enter,
      }}
    >
      <div style={{fontFamily: FONT.mono, fontSize: 22, color: COLOR.mute}}>{index}</div>
      <div style={{height: 10, width: '60%', borderRadius: 4, backgroundColor: COLOR.walnut}} />
    </div>
  );
};

// S4 · the board for Mystery Live · M01. Tiles are unlabeled placeholders.
const BoardIllustration: React.FC = () => (
  <Stage>
    <Panel label="Mystery Live · M01" width={1100}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20}}>
        {Array.from({length: 8}, (_, i) => (
          <Tile key={i} index={String(i + 1).padStart(2, '0')} delay={i * 5} />
        ))}
      </div>
    </Panel>
  </Stage>
);

const ORDER_WORDS = ['HEAT', 'ORDER', 'OPEN', 'TROLLEY', 'BLACKOUT'];

// S5 · the !order command sets the sequence, one word per step.
const OrderIllustration: React.FC = () => (
  <Stage>
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40}}>
      <Node title="!order" detail="Chat command sets the order" command width={520} delay={0} />
      <div style={{display: 'flex', gap: 24}}>
        {ORDER_WORDS.map((word, i) => (
          <Node key={word} title={word} detail={`Step ${i + 1}`} command width={260} delay={12 + i * 8} />
        ))}
      </div>
    </div>
  </Stage>
);

// S5 · a theory is tested against evidence, and the result is recorded.
const TheoryIllustration: React.FC = () => (
  <Stage>
    <Row>
      <Node title="BLACKOUT_THEFT" detail="Theory" command width={460} delay={0} />
      <Arrow delay={12} />
      <Node title="ACCESS_RECORD" detail="Evidence tested against the theory" command width={460} delay={18} />
      <Arrow delay={30} />
      <Node title="Result" detail="Recorded in the case" highlight width={320} delay={36} />
    </Row>
  </Stage>
);

const Device: React.FC<{
  label: string;
  width: number;
  height: number;
  radius: number;
  delay: number;
  children: React.ReactNode;
}> = ({label, width, height, radius, delay, children}) => {
  const enter = useEnter(delay);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: enter}}>
      <div style={{fontFamily: FONT.mono, fontSize: 24, color: COLOR.amber}}>{label}</div>
      <div
        style={{
          width,
          height,
          boxSizing: 'border-box',
          padding: 18,
          borderRadius: radius,
          border: `3px solid ${COLOR.mute}`,
          backgroundColor: COLOR.umber,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Block: React.FC<{height?: number; flex?: number}> = ({height, flex}) => (
  <div style={{height, flex, borderRadius: 6, backgroundColor: COLOR.walnut, opacity: 0.8}} />
);

const PhoneLayout: React.FC = () => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 16, height: '100%'}}>
    <Block height={44} />
    <Block flex={1} />
    <Block flex={1} />
    <Block flex={1} />
  </div>
);

const DesktopLayout: React.FC = () => (
  <div style={{display: 'flex', gap: 16, height: '100%'}}>
    <div style={{width: 230, display: 'flex', flexDirection: 'column', gap: 16}}>
      <Block height={44} />
      <Block flex={1} />
      <Block flex={1} />
    </div>
    <div style={{flex: 1, display: 'grid', gridTemplateRows: '1fr 1fr', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
      {Array.from({length: 6}, (_, i) => (
        <Block key={i} />
      ))}
    </div>
  </div>
);

// S6 · the same layout at a phone width and a desktop width. Co-op is not shown.
const ResponsiveIllustration: React.FC = () => (
  <Stage>
    <div style={{display: 'flex', alignItems: 'flex-end', gap: 96}}>
      <Device label="390 px" width={250} height={520} radius={34} delay={0}>
        <PhoneLayout />
      </Device>
      <Device label="1280 px" width={1000} height={520} radius={12} delay={10}>
        <DesktopLayout />
      </Device>
    </div>
  </Stage>
);

// S7 · the build chain: Codex work, the proof test run, and EventSub. No session ID is shown.
const CodexIllustration: React.FC = () => (
  <Stage>
    <Row>
      <Node title="Codex session" detail="Work done in Codex" width={420} delay={0} />
      <Arrow delay={12} />
      <Node title="Test run" detail="Deterministic proof tests" width={420} delay={18} />
      <Arrow delay={30} />
      <Node title="EventSub" detail="Twitch events drive the case" width={420} delay={36} />
    </Row>
  </Stage>
);

const TestRow: React.FC<{delay: number}> = ({delay}) => {
  const enter = useEnter(delay);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 24, marginBottom: 18, opacity: enter}}>
      <div style={{width: 120, fontFamily: FONT.mono, fontSize: 22, color: COLOR.mute}}>case</div>
      <div style={{flex: 1, height: 18, borderRadius: 4, backgroundColor: COLOR.walnut}} />
      <div style={{fontFamily: FONT.text, fontSize: 20, color: COLOR.mute}}>pending</div>
    </div>
  );
};

// S7 · the test run panel. It shows no counts and no pass marks, because none are captured yet.
const TestsIllustration: React.FC = () => (
  <Stage>
    <Panel label="Test run · capture pending" width={1100}>
      {Array.from({length: 5}, (_, i) => (
        <TestRow key={i} delay={i * 6} />
      ))}
    </Panel>
  </Stage>
);

// Footage ids that have a schematic stand-in. S1-stream has its own illustration in
// scenes/Hook.tsx. S8-reveal is left out on purpose: the Close scene's wordmark sits there.
export const ILLUSTRATIONS: Partial<Record<FootageId, React.FC>> = {
  'S2-chat': FirstEvidenceIllustration,
  'S3-link': VerdictIllustration,
  'S4-dashboard': DashboardIllustration,
  'S4-board': BoardIllustration,
  'S5-correction': OrderIllustration,
  'S5-theory': TheoryIllustration,
  'S6-responsive': ResponsiveIllustration,
  'S7-codex': CodexIllustration,
  'S7-tests': TestsIllustration,
};
