# DataSpecer: Conceptual-Model-Editor
Conceptual-Model-Editor (CME) is designed to allow user to create conceptual models.
You can try the [editor online](https://tool.dataspecer.com/conceptual-model-editor/diagram).

# Installation
CME is installed and deployed as a part of the DataSpecer.
However you need to provide CME with configuration.
You can do this using the `.env` file.
Just copy `./env.example` as `.env` and update the configuration to your liking.

# Development
We use eslint to keep the code in shape.
Please run `npm run lint` and `npm run test` before every commit if possible.

You can start a local development using `npm run dev`.
As Vite is using caching of sources, changes in the imported packages from this repository may propagate.
To address this you need to force Vite to rebuild cache using `npx vite --force`.
Keep in mind that this command takes a little bit more time.


# Known issues
We put all dependencies in package.json into "dependencies".
When using "devDependencies" as we should, there is issue with rollup and npm.
