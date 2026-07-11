# Application Graph Editor

Visual editor for application graphs consumed by `@dataspecer/app-generator`. It renders the
graph nodes (aggregate + operation) and edges (transitions and redirects) on a React Flow
canvas with a synchronized JSON view.

## Development

Copy `.env.example` to `.env` and point `VITE_BACKEND` at a running backend service. Then:

```sh
npm install
npm run dev
```

The dev server runs on port 5177.
