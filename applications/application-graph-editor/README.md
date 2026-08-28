# Application graph editor

This React application edits the graphs consumed by `@dataspecer/app-generator`. It provides a
React Flow canvas, element forms, a synchronized JSON view, validation, autosave, and source archive
generation through the Dataspecer backend.

## Run locally

Use Node.js 22.12 or newer. Install workspace dependencies from the repository root, then build the
editor and its workspace dependencies:

```sh
npm install
npx turbo run build --filter=application-graph-editor...
```

Copy the editor environment file and check its URLs:

```sh
cd applications/application-graph-editor
cp .env.example .env
npm run dev
```

| Variable                         | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `VITE_BACKEND`                   | Dataspecer backend used for resources, metadata, and generation |
| `VITE_MANAGER`                   | Manager URL used by the back link                               |
| `VITE_DATA_SPECIFICATION_EDITOR` | Data specification editor used by structure links               |

The development server listens on `http://localhost:5178`. Open an existing resource with:

```text
http://localhost:5178/?iri=<application-graph-resource-iri>
```

The [backend](../../services/backend/README.md) must be running and able to load that resource. The
Dataspecer manager normally creates the resource and opens it in the editor.

## Test the complete workflow

The [app-generator samples](../../packages/app-generator/samples/README.md) contain importable data
specifications, application graphs, RDF data, and a local SPARQL endpoint. Start the Dataspecer
backend, manager, and editor, then follow the sample instructions. The generated archive contains
its own README with the remaining setup steps.

## Commands

Run these from this directory:

```sh
npm run dev       # start Vite
npm run build     # typecheck and create a production bundle
npm test          # run Vitest once
npm run lint      # run ESLint and check Prettier formatting
npm run lint:fix  # apply supported lint and formatting fixes
npm run preview   # serve the production bundle locally
```

## Further reading

- [Application graph JSON Schema](../../packages/app-generator/src/graph/application-graph.schema.json)
