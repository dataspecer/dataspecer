import { ArrayIterator } from 'asynciterator';
import type { QueryContext, Schema } from 'ldkit';
import { QueryEngine } from 'ldkit';
import { DataFactory, type RDF } from 'ldkit/rdf';

// This predicate is added only to parsed responses and is never sent to the endpoint.
const REFERENCED_NODE_MARKER = 'urn:dataspecer:generated-app:referenced-node';

/**
 * Creates an LDKit engine that keeps reads working when a referenced target has no subject data.
 *
 * LDKit cannot decode a nested reference unless the referenced IRI appears as a subject in the
 * query result. This engine adds a temporary marker triple when necessary, allowing LDKit to return
 * an ID-only reference. The marker exists only in memory and is never stored in the RDF endpoint.
 *
 * The engine records which IRIs it had to synthesize, so a composed child that is missing can be
 * told apart from one that is stored but empty. Returns undefined when the schema expands no
 * references.
 */
export function referencePreservingEngine(
  schema: Schema,
): ReferencePreservingQueryEngine | undefined {
  const predicates = expandedReferencePredicates(schema);
  return predicates.size === 0 ? undefined : new ReferencePreservingQueryEngine(predicates);
}

/** Predicates whose targets LDKit expands, and therefore expects to find as subjects. */
function expandedReferencePredicates(
  schema: Schema,
  predicates = new Set<string>(),
): ReadonlySet<string> {
  for (const property of Object.values(schema)) {
    if (
      typeof property !== 'object' ||
      !('@id' in property) ||
      !('@schema' in property) ||
      !property['@schema']
    ) {
      continue;
    }
    predicates.add(property['@id']);
    expandedReferencePredicates(property['@schema'], predicates);
  }
  return predicates;
}

export class ReferencePreservingQueryEngine extends QueryEngine {
  private readonly factory = new DataFactory();
  readonly missingNodeIds = new Set<string>();

  constructor(private readonly referencePropertyIris: ReadonlySet<string>) {
    super();
  }

  override async queryQuads(
    query: string,
    context?: QueryContext,
  ): Promise<RDF.ResultStream<RDF.Quad>> {
    const quads = await this.collect(await super.queryQuads(query, context));
    this.preserveReferencedNodes(quads);
    // delay startup so LDKit can attach listeners before an empty iterator ends
    return new ArrayIterator(quads, { autoStart: false });
  }

  private collect(stream: RDF.ResultStream<RDF.Quad>): Promise<RDF.Quad[]> {
    return new Promise((resolve, reject) => {
      const quads: RDF.Quad[] = [];
      stream.on('data', (quad: RDF.Quad) => quads.push(quad));
      stream.on('end', () => resolve(quads));
      stream.on('error', reject);
    });
  }

  private preserveReferencedNodes(quads: RDF.Quad[]): void {
    // only named nodes can represent entity IRIs
    const subjects = new Set(
      quads.flatMap((quad) => (quad.subject.termType === 'NamedNode' ? [quad.subject.value] : [])),
    );
    const marker = this.factory.namedNode(REFERENCED_NODE_MARKER);

    for (const quad of [...quads]) {
      const node = quad.object;
      if (
        node.termType !== 'NamedNode' ||
        !this.referencePropertyIris.has(quad.predicate.value) ||
        subjects.has(node.value)
      ) {
        continue;
      }
      subjects.add(node.value);
      this.missingNodeIds.add(node.value);
      quads.push(this.factory.quad(node, marker, node));
    }
  }
}
