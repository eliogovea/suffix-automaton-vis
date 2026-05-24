import './base.css';

import {Animation, createGraphHost, type GraphNode, LinkType} from './animation';
import {AnimationRunner} from './animation_runner';
import {type BuildEvent, EventType} from './events';
import {Simulation} from './simulation';
import {buildSuffixAutomaton} from './suffix-automaton';

const defaultWords = ['abba', 'baba'];
const graphWidth = 1120;
const graphHeight = 660;
const defaultXStrength = 0.82;
const defaultYStrength = 0.04;
const defaultChargeStrength = 1250;
const defaultCollideRadius = 58;
const defaultSpeed = 120;

interface AppState {
  words: string[];
  events: BuildEvent[];
  selectedNodeId?: number;
  speed: number;
  xStrength: number;
  yStrength: number;
  chargeStrength: number;
  collideRadius: number;
}

const state: AppState = {
  words: [...defaultWords],
  events: [],
  speed: defaultSpeed,
  xStrength: defaultXStrength,
  yStrength: defaultYStrength,
  chargeStrength: defaultChargeStrength,
  collideRadius: defaultCollideRadius,
};

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root');
}

app.innerHTML = `
  <main class="app-shell">
    <header class="app-toolbar" aria-label="Build and playback controls">
      <div class="brand">
        <span class="brand-mark">SA</span>
        <div>
          <h1>Suffix Automaton</h1>
          <p>Interactive construction visualizer</p>
        </div>
      </div>

      <form class="control-group word-form">
        <div class="word-form-header">
          <label for="word-input">Strings</label>
          <div class="chip-list" id="word-chips" aria-live="polite"></div>
        </div>
        <div class="input-row">
          <input id="word-input" name="word" placeholder="Add a string..." autocomplete="off" spellcheck="false" />
          <button class="button" id="add-button" type="button">Add</button>
          <button class="button button-primary" type="submit">Build</button>
        </div>
      </form>

      <div class="control-group playback-controls" aria-label="Playback controls">
        <span class="control-label">Playback</span>
        <div class="playback-row">
          <button class="button" id="reset-button" type="button">Reset</button>
          <button class="button" id="step-button" type="button">Step</button>
          <button class="button button-primary" id="play-button" type="button">Play</button>
        </div>
      </div>

      <div class="control-group slider-control">
        <label for="speed-input">Speed <output id="speed-output">${defaultSpeed}ms</output></label>
        <input id="speed-input" type="range" min="40" max="1200" step="20" value="${defaultSpeed}" />
      </div>
    </header>

    <section class="workspace">
      <section class="graph-panel" aria-label="Automaton graph">
        <div class="graph-topline">
          <div>
            <h2>Build Graph</h2>
            <p id="status-text">Ready</p>
          </div>
          <div class="progress-pill" id="progress-text">0 / 0</div>
        </div>
        <div id="graph-container" class="graph-container">
          <div id="state-tooltip" class="state-tooltip" role="status" aria-live="polite"></div>
        </div>
      </section>

      <aside class="inspector" aria-label="State inspector">
        <section class="inspector-section">
          <h2>Selected State</h2>
          <div id="state-details" class="details-empty">Select a state to inspect its transitions.</div>
        </section>

        <section class="inspector-section inspector-section--pinned">
          <h2>Current Event</h2>
          <div id="event-details" class="event-details">No event applied.</div>
        </section>

        <section class="inspector-section inspector-section--scroll">
          <h2>Build Stream</h2>
          <div id="event-stream" class="event-stream"></div>
        </section>

        <section class="inspector-section layout-controls" aria-label="Layout controls">
          <h2>Layout</h2>
          <div class="force-controls">
            <label for="x-force-input">X force <output id="x-force-output">${defaultXStrength.toFixed(2)}</output></label>
            <input id="x-force-input" type="range" min="0" max="1.2" step="0.02" value="${defaultXStrength}" />
            <label for="y-force-input">Y force <output id="y-force-output">${defaultYStrength.toFixed(2)}</output></label>
            <input id="y-force-input" type="range" min="0" max="0.5" step="0.01" value="${defaultYStrength}" />
            <label for="charge-input">Repel <output id="charge-output">${defaultChargeStrength}</output></label>
            <input id="charge-input" type="range" min="200" max="2400" step="50" value="${defaultChargeStrength}" />
          </div>
        </section>

        <section class="inspector-section inspector-section--compact">
          <h2>Legend</h2>
          <div class="legend">
            <span><i class="legend-node"></i> State</span>
            <span><i class="legend-node legend-node-active"></i> Active</span>
            <span><i class="legend-node legend-node-clone"></i> Clone</span>
            <span><i class="legend-line legend-line-transition"></i> Transition</span>
            <span><i class="legend-line legend-line-suffix"></i> Suffix link</span>
          </div>
        </section>
      </aside>
    </section>
  </main>
`;

const wordForm = app.querySelector<HTMLFormElement>('.word-form')!;
const wordInput = app.querySelector<HTMLInputElement>('#word-input')!;
const wordChips = app.querySelector<HTMLDivElement>('#word-chips')!;
const addButton = app.querySelector<HTMLButtonElement>('#add-button')!;
const playButton = app.querySelector<HTMLButtonElement>('#play-button')!;
const stepButton = app.querySelector<HTMLButtonElement>('#step-button')!;
const resetButton = app.querySelector<HTMLButtonElement>('#reset-button')!;
const speedInput = app.querySelector<HTMLInputElement>('#speed-input')!;
const speedOutput = app.querySelector<HTMLOutputElement>('#speed-output')!;
const xForceInput = app.querySelector<HTMLInputElement>('#x-force-input')!;
const xForceOutput = app.querySelector<HTMLOutputElement>('#x-force-output')!;
const yForceInput = app.querySelector<HTMLInputElement>('#y-force-input')!;
const yForceOutput = app.querySelector<HTMLOutputElement>('#y-force-output')!;
const chargeInput = app.querySelector<HTMLInputElement>('#charge-input')!;
const chargeOutput = app.querySelector<HTMLOutputElement>('#charge-output')!;
const progressText = app.querySelector<HTMLDivElement>('#progress-text')!;
const statusText = app.querySelector<HTMLParagraphElement>('#status-text')!;
const stateDetails = app.querySelector<HTMLDivElement>('#state-details')!;
const eventDetails = app.querySelector<HTMLDivElement>('#event-details')!;
const eventStream = app.querySelector<HTMLDivElement>('#event-stream')!;
const graphContainer = app.querySelector<HTMLDivElement>('#graph-container')!;
const stateTooltip = app.querySelector<HTMLDivElement>('#state-tooltip')!;

const graphHost = createGraphHost(graphContainer);
const animation = new Animation(graphHost, graphWidth, graphHeight, {
  onSelectNode: (nodeId) => {
    state.selectedNodeId = nodeId;
    simulation.selectNode(nodeId);
    renderInspector();
  },
  onHoverNode: (node, position) => {
    simulation.highlightNode(node.id);
    showTooltip(node, position);
  },
  onLeaveNode: () => {
    simulation.highlightNode(undefined);
    hideTooltip();
  },
  onDragStart: (node) => simulation.dragStarted(node),
  onDrag: (node, x, y) => simulation.dragged(node, x, y),
  onDragEnd: (node) => simulation.dragEnded(node),
});
const simulation = new Simulation(animation);
const runner = new AnimationRunner(simulation, renderInspector);

function renderChips(): void {
  wordChips.innerHTML = state.words
    .map(
      (word, index) =>
        `<span class="word-chip"><span class="word-chip-text">${escapeHtml(word)}</span><button class="chip-remove" type="button" data-index="${index}" aria-label="Remove ${escapeHtml(word)}">×</button></span>`,
    )
    .join('');
}

function addPendingWord(): boolean {
  const value = wordInput.value.trim();
  if (!value) return false;
  state.words.push(value);
  wordInput.value = '';
  renderChips();
  return true;
}

function rebuild(): void {
  addPendingWord();
  runner.stop();
  simulation.clean();
  const result = buildSuffixAutomaton(state.words);
  state.events = result.history;
  state.selectedNodeId = undefined;
  simulation.setStateMetadata(result.states);
  applyLayout();
  runner.load(state.events);
  statusText.textContent = describeInput(state.words);
  runner.start(state.events, state.speed);
  renderInspector();
}

function describeInput(words: string[]): string {
  if (words.length === 0) return 'Empty input: root state only';
  if (words.length === 1) return `Built history for "${words[0]}"`;
  return `Built history for ${words.length} strings: ${words.map((w) => `"${w}"`).join(', ')}`;
}

function resetPlayback(): void {
  runner.reset();
  simulation.clean();
  applyLayout();
  runner.load(state.events);
  renderInspector();
}

function applyLayout(): void {
  const longestWord = state.words.reduce((max, word) => Math.max(max, word.length), 0);
  simulation.configureLayout({
    layerCount: Math.max(longestWord, 1),
    xStrength: state.xStrength,
    yStrength: state.yStrength,
    chargeStrength: state.chargeStrength,
    collideRadius: state.collideRadius,
  });
}

function togglePlayback(): void {
  if (runner.isRunning()) {
    runner.stop();
  } else {
    const progress = runner.getProgress();
    if (progress.total > 0 && progress.index >= progress.total) {
      resetPlayback();
    }
    runner.start(state.events, state.speed);
  }
  renderInspector();
}

function renderInspector(): void {
  const progress = runner.getProgress();
  const snapshot = simulation.getSnapshot();
  const selected = snapshot.nodes.find((node) => node.id === state.selectedNodeId);
  const currentEvent = snapshot.currentEvent;

  progressText.textContent = `${progress.index} / ${progress.total}`;
  playButton.textContent = runner.isRunning() ? 'Pause' : 'Play';
  stepButton.disabled = runner.isRunning() || progress.index >= progress.total;
  resetButton.disabled = runner.isRunning() || progress.index === 0;
  eventDetails.textContent = currentEvent ? describeEvent(currentEvent) : 'No event applied.';
  renderEventStream(progress.index);

  if (!selected) {
    stateDetails.className = 'details-empty';
    stateDetails.textContent = 'Select a state to inspect its transitions.';
    return;
  }

  stateDetails.className = 'state-details';
  stateDetails.innerHTML = renderStateDetails(selected, snapshot);
}

function renderStateDetails(node: GraphNode, snapshot: ReturnType<Simulation['getSnapshot']>): string {
  const outgoingTransitions = snapshot.links.filter(
    (link) => link.type === LinkType.Transition && linkSourceId(link.source) === node.id,
  );
  const suffixLink = snapshot.links.find(
    (link) => link.type === LinkType.SuffixLink && linkSourceId(link.source) === node.id,
  );
  const suffixTargetId = suffixLink ? linkTargetId(suffixLink.target) : undefined;
  const suffixTarget =
    suffixTargetId !== undefined ? snapshot.nodes.find((n) => n.id === suffixTargetId) : undefined;

  const transitions = outgoingTransitions.length
    ? outgoingTransitions
        .map((link) => `<span class="code-chip">${escapeHtml(link.label ?? '')} -> ${linkTargetId(link.target)}</span>`)
        .join('')
    : '<span class="muted">None</span>';

  const maxLen = node.depth;
  const longest = node.acceptedExample;
  // Root has no proper substrings; otherwise shortest length = len(suffixLink target) + 1.
  // Until the suffix link is set, shortestLen defaults to 1.
  const shortestLen = maxLen === 0 ? 0 : suffixTarget ? suffixTarget.depth + 1 : 1;
  const shortest = shortestLen > 0 ? longest.slice(-shortestLen) : '';
  const lengthText = maxLen === 0 ? '0' : shortestLen === maxLen ? `${maxLen}` : `${shortestLen} – ${maxLen}`;
  const longestRow =
    maxLen === 0
      ? `<div><dt>Accepts</dt><dd>empty prefix</dd></div>`
      : `<div><dt>Longest</dt><dd><code>${escapeHtml(longest)}</code></dd></div>`;
  const shortestRow =
    maxLen > 0 && shortest && shortest !== longest
      ? `<div><dt>Shortest</dt><dd><code>${escapeHtml(shortest)}</code></dd></div>`
      : '';

  return `
    <dl>
      <div><dt>ID</dt><dd>${node.id}</dd></div>
      <div><dt>Length</dt><dd>${lengthText}</dd></div>
      ${longestRow}
      ${shortestRow}
      <div><dt>Kind</dt><dd>${node.isClone ? `Clone of ${node.cloneSource}` : 'Original'}</dd></div>
      <div><dt>Terminal</dt><dd>${node.isTerminal ? 'Yes' : 'No'}</dd></div>
      <div><dt>Suffix</dt><dd>${suffixTargetId ?? 'None'}</dd></div>
      <div class="wide"><dt>Transitions</dt><dd class="chip-list">${transitions}</dd></div>
    </dl>
  `;
}

function renderEventStream(progressIndex: number): void {
  const start = Math.max(0, progressIndex - 8);
  const visibleEvents = state.events.slice(start, Math.min(state.events.length, progressIndex + 3));
  eventStream.innerHTML = visibleEvents
    .map((event, index) => {
      const absoluteIndex = start + index + 1;
      const classes = ['stream-item'];
      if (absoluteIndex === progressIndex) {
        classes.push('stream-item--current');
      } else if (absoluteIndex < progressIndex) {
        classes.push('stream-item--past');
      }
      return `<div class="${classes.join(' ')}"><span>${absoluteIndex}</span><p>${escapeHtml(describeEvent(event))}</p></div>`;
    })
    .join('');
}

function showTooltip(node: GraphNode, position: {x: number; y: number}): void {
  stateTooltip.innerHTML = `
    <strong>State ${node.id}</strong>
    <span>${node.isTerminal ? 'Terminal' : node.isClone ? 'Clone' : 'State'}</span>
    <p>Accepts example: <code>${escapeHtml(node.acceptedExample || 'empty prefix')}</code></p>
    <p>Max length: ${node.depth}</p>
  `;
  const bounds = graphContainer.getBoundingClientRect();
  stateTooltip.style.left = `${Math.min(position.x - bounds.left + 14, bounds.width - 230)}px`;
  stateTooltip.style.top = `${Math.max(position.y - bounds.top + 14, 12)}px`;
  stateTooltip.classList.add('state-tooltip--visible');
}

function hideTooltip(): void {
  stateTooltip.classList.remove('state-tooltip--visible');
}

function describeEvent(event: BuildEvent): string {
  switch (event.type) {
    case EventType.CreateNewState:
      return `Create state ${event.stateId} at depth ${event.depth}.`;
    case EventType.CreateClonedState:
      return `Clone state ${event.source} into ${event.stateId} at depth ${event.depth}.`;
    case EventType.CreateLink:
      return `Create transition ${event.source} --${event.label}-> ${event.target}.`;
    case EventType.RemoveLink:
      return `Remove transition ${event.source} --${event.label}-> ${event.target}.`;
    case EventType.CreateSuffixLink:
      return `Create suffix link ${event.source} -> ${event.target}.`;
    case EventType.RemoveSuffixLink:
      return `Remove suffix link ${event.source} -> ${event.target}.`;
    case EventType.Focus:
      return `Focus state ${event.stateId}.`;
    case EventType.RemoveFocus:
      return `Clear focus from state ${event.stateId}.`;
  }
}

function linkSourceId(source: number | GraphNode): number {
  return typeof source === 'number' ? source : source.id;
}

function linkTargetId(target: number | GraphNode): number {
  return typeof target === 'number' ? target : target.id;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

wordForm.addEventListener('submit', (event) => {
  event.preventDefault();
  rebuild();
});

addButton.addEventListener('click', () => {
  addPendingWord();
  wordInput.focus();
});

wordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addPendingWord();
  } else if (event.key === 'Backspace' && wordInput.value === '' && state.words.length > 0) {
    event.preventDefault();
    state.words.pop();
    renderChips();
  }
});

wordChips.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const removeBtn = target.closest<HTMLButtonElement>('.chip-remove');
  if (!removeBtn) return;
  const index = Number(removeBtn.dataset.index);
  if (!Number.isInteger(index) || index < 0 || index >= state.words.length) return;
  state.words.splice(index, 1);
  renderChips();
});

playButton.addEventListener('click', togglePlayback);
stepButton.addEventListener('click', () => {
  runner.step();
  renderInspector();
});
resetButton.addEventListener('click', resetPlayback);
speedInput.addEventListener('input', () => {
  state.speed = Number(speedInput.value);
  speedOutput.textContent = `${state.speed}ms`;
  if (runner.isRunning() && runner.getProgress().index < runner.getProgress().total) {
    runner.start(state.events, state.speed);
  }
});

xForceInput.addEventListener('input', () => {
  state.xStrength = Number(xForceInput.value);
  xForceOutput.textContent = state.xStrength.toFixed(2);
  applyLayout();
});

yForceInput.addEventListener('input', () => {
  state.yStrength = Number(yForceInput.value);
  yForceOutput.textContent = state.yStrength.toFixed(2);
  applyLayout();
});

chargeInput.addEventListener('input', () => {
  state.chargeStrength = Number(chargeInput.value);
  chargeOutput.textContent = String(state.chargeStrength);
  applyLayout();
});

renderChips();
rebuild();
