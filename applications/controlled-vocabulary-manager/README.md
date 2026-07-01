# Controlled Vocabulary Manager

The Controlled Vocabulary Manager (CVM) is a graphical interface component responsible for identifying, storing, and managing controlled vocabulary metadata within a specification project.

*TBD:* It allows searching for commonly used controlled vocabularies by accessing the Czech National Open Data Catalog and EU Vocabularies through their SPARQL endpoints.

Like the other front-end components, the CVM communicates with the Storage Backend via its REST API to persist controlled vocabulary metadata. The stored metadata is referenced by the [Conceptual Model Editor](../conceptual-model-editor) when linking class and relationship profiles to controlled vocabularies, and it is consumed by the Validation Schema Generator and the Documentation Generator when producing output artifacts.

## Installation

CVM is installed and deployed as a part of Dataspecer. However, you need to provide it with configuration.
You can do this using the `.env` file:

```
VITE_MANAGER=http://localhost:5174
VITE_BACKEND=http://localhost:3100/api
```

- `VITE_MANAGER` - URL of the [Package Manager](../manager) application, used to link back to it.
- `VITE_BACKEND` - URL of the Storage Backend REST API.

## Development

This application is part of the Dataspecer monorepo, managed by [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces). From the repository root:

- Run `npm install` to install dependencies and link local packages.
- Run `npm run build` to build the packages this application depends on (only needed once, or after changing a dependency).

Then, from this directory (`applications/controlled-vocabulary-manager`), or from the root using `npm run dev --workspace=controlled-vocabulary-manager`:

- `npm run dev` - start the local development server with hot reload.
- `npm run build` - type-check and build the application for production.
- `npm run lint` - run ESLint.

