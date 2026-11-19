# Flowdeck — Workflow Automation Dashboard

A dashboard built with **Vite + React + TypeScript** around the interactive workflow
blueprint component (`@xyflow/react`). It includes a workflow canvas, live-editable
nodes, KPI cards and light/dark themes.

## Getting started

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run Oxlint |

## Project structure

```
src/
├── App.tsx                                   Dashboard shell and sections
├── index.css                                 Theme tokens and base styles
├── styles/dashboard.css                      Dashboard layout and components
├── components/
│   ├── icons.tsx                             Inline SVG icon set
│   └── ui/interactive-workflow-blueprint.tsx Workflow canvas component
├── pages/usage.tsx                           Workflow demo + graph/app data
└── main.tsx                                  React entry point
```

## Workflow canvas

The canvas is fully interactive:

- Drag nodes, or use the connection form / ports to link steps.
- Add actions from the connection stack. New steps are inserted after the selected node.
- Edit a step's name, description and tool.
- Undo the last edit, remove a step (neighbours reconnect when possible), or export the
  graph as JSON.
- The **Use Automate Flows colors** control is kept as a disabled placeholder; the color
  preset feature has been removed.

All edits stay in the browser; no services are connected.

## Theme

The dashboard follows the system theme on first load. Use the sun/moon button in the
top bar to switch; the choice is stored in `localStorage` under `flowdeck-theme`.

## Notes

- Tool logos load from `cdn.simpleicons.org` / `cdn.21st.dev`; the canvas falls back to
  built-in glyphs if an image cannot load.
- The `@` alias points to `src/` in both Vite and TypeScript.
