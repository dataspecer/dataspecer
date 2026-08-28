# Generated application

This is a generated React CRUD application over RDF. Its pages, routes, data structures, and
association behavior come from a Dataspecer application graph. The default data source uses LDKit
and a SPARQL endpoint. You can modify the generated source.

## Run locally

Install Node.js 22.12 or newer and npm, then run:

```sh
npm install
npm run dev
```

Vite prints the local URL. The configured RDF endpoint must support SPARQL query/update requests and
allow browser requests from that URL through CORS.

The application reads from and writes directly to that endpoint. Use a disposable or sample
dataset when trying create, update, and delete operations. For a quick check, open a list page,
inspect an existing entity, and perform one mutation supported by the generated routes.

Other commands are:

```sh
npm run build    # typecheck and bundle into dist/
npm run lint     # run linting rules
npm run preview  # serve the production bundle locally
```

## Configure the application

The main settings are:

| File                         | Setting                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `src/config/data-sources.ts` | SPARQL endpoint and RDF schema registry                 |
| `src/config/app-config.ts`   | Base IRI for new entities and initial language choices  |
| `src/theme.ts`               | MUI colors, spacing, typography, and component defaults |

Changing the endpoint in `src/config/data-sources.ts` is enough when the replacement has the same
SPARQL behavior and RDF model. For another storage system, implement the `DataSource` interface in
`src/shared/data-source/data-source.ts` and provide the instance in `src/main.tsx`.

The base IRI is prefilled on create forms. If it is empty, new forms generate `urn:uuid` identifiers.
Entity identifiers are IRIs rather than opaque database IDs.

### Endpoint troubleshooting

If pages show no data or a write fails, check the endpoint URL, query and update support, CORS
headers, and the failed request in the browser network panel. The default adapter does not add
authentication headers. A protected endpoint needs a customized adapter or request layer.

## Project layout

```text
src/
  config/                    data source, aggregate registry, application settings
  modules/<name>/            one directory per reachable data structure
    model.ts                 generated TypeScript entity shape
    descriptor.ts            field metadata used by forms and views
    ldkit-schema.ts          RDF read and write schemas
    <route>-page.tsx         page and navigation wiring for one graph node
    <route>-operation.ts     page-specific operation hooks
    <route>-actions.tsx      custom actions for a list or detail page
  shared/                    forms, views, navigation, operations, and data sources
  routes.tsx                 lazy route definitions
  App.tsx                    router setup
  main.tsx                   providers and browser entry point
  theme.ts                   MUI theme
```

`src/shared` is ordinary source copied into every generated application.

## Runtime behavior

Each application graph node becomes a route and page. Transitions become page, row, or association
actions. Redirect edges choose the destination after a successful create, update, or delete.
`ReadList` pages are also shown in the main navigation.

List pages use server-side paging and one sort at a time. Sorting is available for supported
top-level, single-valued primitive fields. Repeating, nested, reverse, and multilingual fields are
not sortable by the default adapter.

Forms use field metadata from each module's `descriptor.ts`:

- An aggregation selects an entity that exists independently. The default RDF adapter lists
  candidates by RDF class and display properties.
- A composition edits an owned child as part of its parent. A deeper composition may open in a
  separate pane whose path is stored in the URL, so browser back and forward move between panes.
- A specialization selects a concrete shape and RDF class for an association. The selection of a
  loaded entity cannot be changed because that would change its stored shape.
- Multilingual fields retain every loaded language tag. The empty tag represents untagged text, and
  configured languages are offered for new values.

Reference selectors and read views use available primitive fields (as configured for the data
structure in Dataspecer) to label referenced entities. If no label can be read, they show the entity
IRI. In list and detail views, `<IRI> (details unavailable)` means that the target is missing or has
no values for the expected display fields.

Delete pages show the composed entities selected for cascade and up to ten incoming RDF references.
Incoming references are a warning and do not block the delete.

## Extension points

Choose the file that owns the behavior:

1. Edit `src/modules/<name>/<route>-operation.ts` to validate a request or change its result before
   or after the default CRUD operation.
2. Edit a generated `*-actions.tsx` file to add buttons beside list or detail page actions. List
   action files also expose an array for per-row action components.
3. Edit `src/config/data-sources.ts` or implement `DataSource` to change persistence.
4. Edit `src/theme.ts` for application-wide presentation.
5. Edit a page file when the generated title or wiring needs a local change.
6. Edit `src/shared` when behavior must change across several pages.

Detail and row action components receive the loaded entity through typed props. Generated action
files include comments showing how to customize their components.

## Regeneration

Regeneration writes a complete application and overwrites every file, including this README,
operation subclasses, and action components. It does not merge custom code.

Put the application in version control before changing it. Generate a new version into a clean
directory, compare the trees, and carry compatible changes into the new output. A changed data
structure can change model and descriptor types, so operation overrides may need to be adapted
rather than copied unchanged.

## Production hosting

`npm run build` writes the static application to `dist/`. The web server must fall back to
`index.html` for application routes. Hosting under a URL subpath also requires matching Vite and
router base settings.

## Limitations

- The default application uses one RDF data source.
- Composite writes and deletes are not transactional: if a later request fails, earlier successful requests are not rolled back.
- The application does not enforce referential integrity for the RDF store, but it warns about affected entities during deletes.
