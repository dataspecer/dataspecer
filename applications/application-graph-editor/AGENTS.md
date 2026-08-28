# Application graph editor development guide

This file describes the editor's development constraints. Inspect the source and tests nearest to
the change before modifying behavior.

## Boundaries

- Import graph types, enums, the JSON Schema, and browser-safe validation from
  `@dataspecer/app-generator/graph`. Do not restate the graph contract in editor types.
- Keep pure graph parsing, mutations, JSON application, filename logic, and skeleton generation in
  `src/graph`.
- Keep React Flow projection, geometry, layout, and canvas interactions in `src/diagram`. React Flow
  nodes and edges are views of the graph, not another source of truth.
- Keep the backend as the facade for Dataspecer metadata and application generation. Browser code
  should not depend on generator rendering, the filesystem, or concrete Dataspecer repository
  internals.
- Reuse generator validation. Components may map violations to UI targets, but they must not create
  a second set of domain rules.

The `@dataspecer/app-generator/graph` entry point must remain browser-safe. If an editor import from
that entry pulls in Node.js or rendering code, fix the package boundary instead of adding a browser
polyfill.

## State and persistence

The graph object and node positions are separate persisted values. `src/backend/client.ts` stores
the graph in the resource's main JSON data and positions in the named `visual` blob. Do not put
canvas coordinates into the application graph contract.

The Zustand store separates two kinds of state:

- graph and position changes belong to the Zundo history.
- resource loading, metadata, validation, save state, selection requests, dialogs, and generation
  messages do not.

Add state to undo history only if undoing a graph edit should restore it. Keep mutations immutable
so store selectors and temporal history can rely on reference changes.

Preserve the autosave queue properties in `src/hooks/use-autosave.ts`:

- writes are debounced.
- the newest snapshot replaces an older pending snapshot.
- a pending write never overtakes a write in flight.
- one failed write does not block later saves.
- schema-invalid graph data is not persisted.
- structural and semantic errors may persist as incomplete work.
- hiding or leaving the page flushes when possible.

Generation flushes autosave before posting the current graph to the backend. This keeps the saved
project aligned with the graph used for the downloaded application.

## Graph editing

Graph mutation helpers must preserve IDs, edges, and positions as one logical edit. Keep user-chosen
node IDs unless a rule explicitly requires changing them. Generated node IDs may follow aggregate
and operation changes because they are known to be derived values.

Transitions and redirects are distinct graph concepts. Use the shared operation-pair rules when
deciding whether a connection is possible. Semantic class and association checks still run through
validation after the structural connection check.

The visual graph and JSON editor are two views of the same graph. Applying JSON must pass the shared
syntax validator before it replaces store state. Do not discard an invalid draft. The user needs it
to repair the JSON. Import uses the same boundary.

Skeleton generation is a pure starting-point calculation. It must not fetch metadata, update the
store, lay out nodes, or autosave by itself. The caller owns those effects.

## UI work

Keep element-specific validation close to the element forms, with the Problems panel as the full
list. A violation's code and JSON pointer come from the generator. Editor code only decides which
node, edge, setting, or JSON range should be focused.

Use store selectors instead of subscribing a component to the entire store. Avoid mirroring React
Flow state in Zustand unless another part of the application needs a durable value that cannot be
derived cheaply.

Keyboard and canvas interactions share selection and cancellation behavior. Check the shortcut
dialog when changing a binding. Check edge geometry and connection-target tests when changing node
dimensions or handles.

The editor's Vite server uses port 5178 and an empty base. Keep `.env.example`, the manager link, and
developer documentation aligned if either changes.

## Dependency note

Keep the editor, React Flow, and Zundo on one compatible Zustand installation. They currently use
Zustand 4. Treat a Zustand major upgrade as a coordinated dependency change and confirm that
`npm ls zustand zundo @xyflow/react` shows one shared copy. If dependency changes cause missing
React Flow edges, clear `node_modules/.vite` before investigating further.

## Tests and completion

Prefer focused tests at the owning layer:

- `src/graph/*.spec.ts` for pure graph behavior.
- `src/diagram/*.spec.ts` for projections, layout, and geometry.
- `src/validation/*.spec.ts` for violation targeting and JSON ranges.
- `src/store.spec.ts` for state and history boundaries.
- `src/hooks/use-autosave.spec.ts` for queue ordering and failure behavior.

When the shared graph contract changes, update the app-generator schema, types, validators, tests,
and docs together, then run checks for both packages.

Before finishing an editor change, run:

```sh
npm run build
npm test
npm run lint
```

Add focused coverage for behavior changes. If the change affects users, update the public
documentation. If it changes a shared contract, check the browser-safe imports and run the
app-generator checks too.
