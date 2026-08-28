# Application generator

Turns a Dataspecer data specification and an application graph into a runnable React/Vite CRUD
application. The default generated runtime reads and writes one RDF data source through LDKit and a
SPARQL endpoint.

The package generates `Create`, `ReadList`, `ReadDetail`, `Update`, and `Delete` pages. It supports
transitions, post-mutation redirects, repeating and nested forms, aggregation, composition,
configured cascade deletes, multilingual values, and specialization choices. The [application
graph editor](../../applications/application-graph-editor) is the normal authoring UI.

## Development

Use Node.js 22.12 or newer. Install dependencies and build the package with its workspace
dependencies from the repository root:

```sh
npm install
npx turbo run build --filter=@dataspecer/app-generator...
```

Run the package commands from `packages/app-generator`:

```sh
npm run build     # compile assets and TypeScript
npm run dev       # compile assets, then watch TypeScript
npm test          # typecheck and run Vitest
npm run lint      # run ESLint and Prettier checks
npm run lint:fix  # apply supported lint and formatting fixes
```

## Run an example

The package does not provide a command-line interface. In the normal interactive workflow, the
Dataspecer manager opens an application graph in the editor, the editor sends the graph to the
backend, and the backend uses this package to return a generated source archive.

The [samples](samples/README.md) provide importable specifications, application graphs, RDF data,
and a local SPARQL endpoint. Use them to generate and run an application without first modeling a
data specification.

## Public entry points

The package root exposes generation and full validation. Given a graph and a metadata provider,
generation looks like this:

```ts
import { generateApp } from '@dataspecer/app-generator';

const result = await generateApp({
    graph,
    metadataProvider,
});

if (!result.success) {
    console.error(result.violations);
}
```

`graph` is parsed application-graph JSON. `metadataProvider` implements the exported
`DataspecerMetadataProvider` interface and supplies metadata for the graph's data specification.

On success, `result.files` contains the rendered source. Pass `outputDirectory` to write the same
files to disk. `allowOverwrite` must be true when that directory is not empty. Validation,
formatting, and output errors produce an unsuccessful result and are returned as violations. A
successful result may still contain warning violations.

Use the separate browser-safe entry point for graph authoring tools:

```ts
import {
    applicationGraphSchema,
    validateGraphSyntax,
    validateGraphStructure,
} from '@dataspecer/app-generator/graph';
```

It contains graph contracts and validation that does not require the filesystem or a concrete
metadata loader.

## Application graph schema

[`src/graph/application-graph.schema.json`](src/graph/application-graph.schema.json) is the canonical
JSON Schema. A hand-written graph can use its `$id` as the `$schema` value for editor validation and
completion. The TypeScript graph contract is in [`src/graph/types.ts`](src/graph/types.ts).
