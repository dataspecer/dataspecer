import { ArrayIterator } from 'asynciterator';
import type { QueryContext, Schema } from 'ldkit';
import { QueryEngine } from 'ldkit';
import { DataFactory, type RDF } from 'ldkit/rdf';

import type { FieldDescriptor } from '../types/aggregate.ts';
import { isCompositionField, isInlineCompositionField } from '../forms/entity-target.ts';

// only ever added to a parsed response, never sent to the endpoint
const REFERENCED_NODE_MARKER = 'urn:dataspecer:generated-app:referenced-node';

/**
 * Creates an LDKit engine that keeps reads working when an aggregation target is missing or has no
 * returned details.
 *
 * LDKit cannot decode a nested reference unless the referenced IRI appears as a subject in the
 * query result. This engine adds a temporary marker triple when necessary, allowing LDKit to return
 * an ID-only reference. The marker exists only in memory and is never stored in the RDF endpoint.
 *
 * Compositions are not changed and missing owned entities still cause the read to fail. Returns
 * undefined when the schema has no aggregation references with display fields.
 */
export function referencePreservingEngine(
  fields: readonly FieldDescriptor[],
  schema: Schema,
): QueryEngine | undefined {
  const predicates = referenceDisplayPredicates(fields, schema);
  return predicates.size === 0 ? undefined : new ReferencePreservingQueryEngine(predicates);
}

function referenceDisplayPredicates(
  fields: readonly FieldDescriptor[],
  schema: Schema,
  predicates = new Set<string>(),
): ReadonlySet<string> {
  for (const field of fields) {
    const property = schema[field.propertyName];
    // only property objects can define @id and @schema
    if (typeof property !== 'object' || !('@id' in property) || !property['@schema']) {
      continue;
    }
    if (isInlineCompositionField(field)) {
      referenceDisplayPredicates(field.fields, property['@schema'], predicates);
    } else if (!isCompositionField(field)) {
      predicates.add(property['@id']);
    }
  }
  return predicates;
}

class ReferencePreservingQueryEngine extends QueryEngine {
  private readonly factory = new DataFactory();

  constructor(private readonly referencePropertyIris: ReadonlySet<string>) {
    super();
  }

  override async queryQuads(
    query: string,
    context?: QueryContext,
  ): Promise<RDF.ResultStream<RDF.Quad>> {
    const quads = await this.collect(await super.queryQuads(query, context));
    this.preserveReferencedNodes(quads);
    // autoStart would end an empty iterator before LDKit listens, leaving the read unresolved
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
      quads.push(this.factory.quad(node, marker, node));
    }
  }
}
