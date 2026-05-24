# Suffix Automaton Visualization

Interactive TypeScript/D3 workbench for visualizing how a suffix automaton is built for a word.

Live demo: <https://eliogovea.github.io/suffix-automaton-vis>

## Development

Requirements:

- Node.js 22 or newer
- npm 11 or newer

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Build, test, and verify:

```bash
npm run type-check
npm run lint
npm test
npm run build
```

Preview the production build:

```bash
npm run preview
```

Deploy to GitHub Pages:

```bash
npm run deploy
```

## Controls

- Enter a word and press **Build** to generate the automaton construction history.
- Use **Play**, **Pause**, **Step**, and **Reset** to inspect the construction sequence.
- Adjust **Speed** to control playback timing.
- Adjust **X force**, **Y force**, and **Repel** to tune graph spacing.
- Drag states directly in the graph to pin and inspect dense areas.
- Hover a state to highlight connected transitions and show a compact tooltip.
- Select a state in the graph to inspect its depth, suffix link, transitions, and clone metadata.
- Follow the **Build Stream** panel for a live event log of the construction history.

