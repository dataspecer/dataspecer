import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import i18nextLoader from 'vite-plugin-i18next-loader'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_BASE_PATH ?? "/",
    server: {
      port: 5175,
    },
    plugins: [
      react(),
      i18nextLoader({
        paths: ['./locales'],
        namespaceResolution: 'basename'
      })
    ],
    optimizeDeps: {
      // grep -roh @dataspecer/[^\"\']* | sort | uniq
      include: [
        "@dataspecer/backend-utils/interfaces",
        "@dataspecer/backend-utils/store-descriptor",
        "@dataspecer/backend-utils/stores",
        "@dataspecer/bikeshed",
        "@dataspecer/core-v2",
        "@dataspecer/core-v2/entity-model",
        "@dataspecer/core-v2/model/known-models",
        "@dataspecer/core-v2/project",
        "@dataspecer/core-v2/semantic-model/concepts",
        "@dataspecer/core-v2/semantic-model/in-memory",
        "@dataspecer/core-v2/semantic-model/operations",
        "@dataspecer/core-v2/semantic-model/simplified",
        "@dataspecer/core/cim",
        "@dataspecer/core/cim/iri-provider",
        "@dataspecer/core/configuration/configurator",
        "@dataspecer/core/configuration/utils",
        "@dataspecer/core/core",
        "@dataspecer/core/core/core-reader",
        "@dataspecer/core/core/core-resource",
        "@dataspecer/core/core/index",
        "@dataspecer/core/core/store/federated-store/read-only-federated-store",
        "@dataspecer/core/core/utilities/deep-partial",
        "@dataspecer/core/data-psm/data-psm-executors",
        "@dataspecer/core/data-psm/data-psm-vocabulary",
        "@dataspecer/core/data-psm/model",
        "@dataspecer/core/data-psm/model/data-psm-resource",
        "@dataspecer/core/data-psm/operation",
        "@dataspecer/core/data-psm/operation/data-psm-set-dematerialized",
        "@dataspecer/core/data-psm/xml-extension/model",
        "@dataspecer/core/data-psm/xml-extension/operation",
        "@dataspecer/core/data-specification/configuration",
        "@dataspecer/core/data-specification/model",
        "@dataspecer/core/data-specification/model/data-specification",
        "@dataspecer/core/data-specification/model/data-specification-artefact",
        "@dataspecer/core/data-specification/model/data-specification-schema",
        "@dataspecer/core/generator",
        "@dataspecer/core/io/fetch/fetch-api",
        "@dataspecer/core/io/fetch/fetch-browser",
        "@dataspecer/core/io/stream/input-stream",
        "@dataspecer/core/io/stream/memory-stream-dictionary",
        "@dataspecer/core/io/stream/output-stream",
        "@dataspecer/core/io/stream/stream-dictionary",
        "@dataspecer/core/pim/model",
        "@dataspecer/core/pim/model/pim-association",
        "@dataspecer/core/pim/model/pim-attribute",
        "@dataspecer/core/pim/model/pim-class",
        "@dataspecer/core/pim/model/pim-resource",
        "@dataspecer/core/pim/operation",
        "@dataspecer/core/pim/operation/pim-set-human-description",
        "@dataspecer/core/pim/operation/pim-set-human-label",
        "@dataspecer/core/well-known",
        "@dataspecer/csv/configuration",
        "@dataspecer/csv/csv-schema",
        "@dataspecer/csv/rdf-to-csv",
        "@dataspecer/federated-observable-store-react/store",
        "@dataspecer/federated-observable-store-react/use-resource",
        "@dataspecer/federated-observable-store-react/use-resources-in-memo",
        "@dataspecer/federated-observable-store/complex-operation",
        "@dataspecer/federated-observable-store/federated-observable-store",
        "@dataspecer/json-example",
        "@dataspecer/json/configuration",
        "@dataspecer/json/json-ld",
        "@dataspecer/json/json-schema",
        "@dataspecer/openapi",
        "@dataspecer/plant-uml",
        "@dataspecer/rdfs-adapter",
        "@dataspecer/sgov-adapter",
        "@dataspecer/shacl",
        "@dataspecer/shex",
        "@dataspecer/sparql-query",
        "@dataspecer/template-artifact",
        "@dataspecer/template-artifact/configuration",
        "@dataspecer/wikidata-experimental-adapter",
        "@dataspecer/wikidata-experimental-adapter/lib/wikidata-ontology-connector/api-types/post-experimental-search",
        "@dataspecer/wikidata-experimental-adapter/lib/wikidata-sparql-endpoint-connector/api-types/get-example-instances",
        "@dataspecer/xml/configuration",
        "@dataspecer/xml/xml-common-schema",
        "@dataspecer/xml/xml-schema",
        "@dataspecer/xml/xml-transformations",
      ]
    },
    build: {
      commonjsOptions: {
        include: [/packages\//, /node_modules/],
      },
      sourcemap: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "fs": "path", // Hack to make polyfill to null
      },
    },
  };
})
