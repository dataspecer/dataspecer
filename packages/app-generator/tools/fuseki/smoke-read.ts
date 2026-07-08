// Reads seeded application graphs through LDKit to confirm the seed matches the JSON-LD
// contexts Dataspecer generated for the demo specification. Run with: npx tsx smoke-read.ts
// (the Fuseki container must be up and seeded). Exits non-zero on any mismatch.
//
// This is an LDKit schema, not a JSON-LD context. Two version-specific facts matter and are
// verified by this script against the installed ldkit (2.x):
//   - nested entities expand under the @schema key. The @context key used by JSON-LD is
//     ignored by ldkit 2.x and leaves the property as a plain reference.
//   - a reference property carries only @id and resolves to the target IRI string. A JSON-LD
//     "@type": "@id" is not an ldkit datatype, so schema generation must drop it for references.
import * as ldkit from 'ldkit';
import * as ldkitNamespaces from 'ldkit/namespaces';

const { createLens } = ldkit;
const { xsd } = ldkitNamespaces;

const ENDPOINT = process.env.FUSEKI_QUERY ?? 'http://localhost:3030/app/query';
const AG = 'https://dataspecer.com/vocabulary/application-graph#';
const MANAGER_IRI = 'https://example.org/data/application-graph/graph-manager';

const NodeSchema = {
  '@type': `${AG}Node`,
  nodeId: { '@id': `${AG}nodeId`, '@type': xsd.string },
  aggregateIri: { '@id': `${AG}aggregateIri`, '@type': xsd.anyURI },
  operation: { '@id': `${AG}operation` },
} as const;

const ApplicationGraphSchema = {
  '@type': `${AG}ApplicationGraph`,
  name: { '@id': `${AG}name`, '@type': xsd.string },
  archived: { '@id': `${AG}ApplicationGraph.archived`, '@type': xsd.boolean, '@optional': true },
  created: { '@id': `${AG}ApplicationGraph.created`, '@type': xsd.dateTime },
  dataSources: { '@id': `${AG}dataSources`, '@array': true },
  nodes: { '@id': `${AG}nodes`, '@array': true, '@schema': NodeSchema },
} as const;

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`smoke read failed: ${message}`);
  }
}

const graphs = createLens(ApplicationGraphSchema, { sources: [ENDPOINT] });

const all = await graphs.find();
check(all.length === 3, `expected 3 graphs, got ${all.length}`);
for (const graph of all) {
  console.log(
    `- ${graph.name} | created ${graph.created.toISOString()} | archived ${graph.archived ?? '(unset)'} | dataSources ${graph.dataSources.length} | nodes ${graph.nodes.length}`
  );
}

const minimal = all.find((graph) => graph.name === 'Prázdný náčrt');
check(minimal !== undefined, 'minimal graph not found');
// LDKit returns null, not undefined, for a missing optional value.
check(minimal!.archived == null, 'optional archived should be unset on the minimal graph');
check(minimal!.created instanceof Date, 'created should parse to a Date');

const manager = await graphs.findByIri(MANAGER_IRI);
check(manager !== null, 'graph-manager not found by IRI');
check(manager!.archived === true, 'graph-manager should be archived');
check(
  manager!.nodes.length === 2,
  `graph-manager should have 2 nodes, got ${manager!.nodes.length}`
);

console.log(`\nnodes of "${manager!.name}":`);
for (const node of manager!.nodes) {
  check(
    typeof node.nodeId === 'string' && node.nodeId.length > 0,
    'node nodeId should be a string'
  );
  check(typeof node.operation === 'string', 'node operation should resolve to an IRI string');
  console.log(`- ${node.nodeId} | aggregate ${node.aggregateIri} | operation ${node.operation}`);
}

console.log('\nsmoke read OK');
process.exit(0);
