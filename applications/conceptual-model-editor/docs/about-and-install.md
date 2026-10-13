[back to main](./main.md)

# conceptual-model-editor

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

Apart from the explicit use of several npm `@dataspecer/*` libraries currently linked via npm workspaces, this project is not dependent on the rest of the codebase.

This project uses:

-   Next.js 14.1.4 with [static HTML export enabled](https://nextjs.org/docs/advanced-features/static-html-export) and experimental app directory
-   React.js 18
-   Tailwind.css for styling
-   ReactFlow for visualization

# Build instructions

1. Clone the whole dataspecer repository
2. From the root of the mono repository, eg /home/user/dev/dataspecer, install all packages

```
npm install
```

3. Build dependent @dataspecer packages and this project by executing following command from the root of this repository

```
npm run build
```

or to explicitly build only dependent packages, use

```
npx turbo run build --scope=conceptual-model-editor
```

Then, you can start dev server from this directory by

```
npm run dev
```

or from the root directory by

```
npm --prefix applications/conceptual-model-editor run dev
```

4. _optional_ Run your backend service locally. Execute the following commands or refer yourself to [backend service docs](../../../services/backend/README.md):

```
npx turbo run build --scope=backend
npm --prefix services/backend run start
```

And make sure you have configured your environment variables to use the local backend instance. Put simply, have your `.env` contain this line:

```
# file location: dataspecer/applications/conceptual-model-editor/.env
NEXT_PUBLIC_APP_BACKEND=http://localhost:3100
```

## 3rd party libraries

-   [tailwind.css](https://tailwindcss.com/) for styling
-   [ReactFlow](https://reactflow.dev/) for visualization
-   [IRI](https://github.com/awwright/node-iri) for checking that an IRI is absolute or relative
-   [html-to-image](https://github.com/bubkoo/html-to-image#readme) for generating svg images

```

```
