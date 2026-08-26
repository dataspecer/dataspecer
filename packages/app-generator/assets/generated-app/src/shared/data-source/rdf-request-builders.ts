import { DataFactory, type RDF } from 'ldkit/rdf';
import { DELETE, OPTIONAL, SELECT } from 'ldkit/sparql';

import {
  type AggregateDescriptor,
  type EntityModel,
  type FieldDescriptor,
  fieldValues,
  referenceIdOf,
} from '../types/aggregate.ts';
import { requireSafeAbsoluteIri } from '../forms/iri.ts';
import type { ReadListSort, ReferenceListArgs } from './data-source.ts';
import {
  DEFAULT_READ_LIST_SORT,
  INCOMING_REFERENCE_LIMIT,
  isListFieldSortable,
} from './data-source.ts';

const FALLBACK_LABEL_PROPERTIES = [
  'http://purl.org/dc/terms/title',
  'http://www.w3.org/2004/02/skos/core#prefLabel',
  'http://www.w3.org/2000/01/rdf-schema#label',
];
const dataFactory = new DataFactory();

export function buildPageIriQuery(
  aggregate: Pick<AggregateDescriptor, 'name' | 'classIri' | 'fields'>,
  take: number,
  skip: number,
  sort: ReadListSort = DEFAULT_READ_LIST_SORT,
): string {
  const classNode = toSparqlNamedNode(aggregate.classIri, 'Aggregate class IRI');
  if (sort.kind === 'iri') {
    const order = sort.direction === 'asc' ? 'ASC(STR(?iri))' : 'DESC(STR(?iri))';
    return SELECT.DISTINCT`?iri`.WHERE`?iri a ${classNode} .`.ORDER_BY`${order}`
      .LIMIT(take)
      .OFFSET(skip)
      .build();
  }

  const field = aggregate.fields.find((candidate) => candidate.path === sort.fieldPath);
  if (!field || !isListFieldSortable(field)) {
    throw new Error(`Field "${aggregate.name}.${sort.fieldPath}" cannot be used for list sorting.`);
  }

  const propertyNode = toSparqlNamedNode(field.propertyIri, 'Sort property IRI');
  const valueOrder = sort.direction === 'asc' ? 'ASC(?sortValue)' : 'DESC(?sortValue)';
  // grouping keeps one row per entity, MIN provides a stable sort value for malformed multi-values
  return SELECT`?iri (MIN(?value) AS ?sortValue)`
    .WHERE`?iri a ${classNode} . OPTIONAL { ?iri ${propertyNode} ?value . }`.GROUP_BY`?iri`
    .ORDER_BY`ASC(!BOUND(?sortValue)) ${valueOrder} ASC(STR(?iri))`
    .LIMIT(take)
    .OFFSET(skip)
    .build();
}

export function buildIncomingReferencesQuery(entityId: string): string {
  const entityNode = toSparqlNamedNode(entityId, 'Entity IRI');
  return SELECT.DISTINCT`?subject ?predicate`.WHERE`?subject ?predicate ${entityNode} .`
    .ORDER_BY`STR(?subject) STR(?predicate)`
    .LIMIT(INCOMING_REFERENCE_LIMIT)
    .build();
}

export function buildReferenceOptionsQuery(args: ReferenceListArgs): string {
  const classNode = toSparqlNamedNode(args.classIri, 'Reference target class IRI');
  const displayProperties = referenceDisplayProperties(args);
  const valueVariables = displayProperties.map((_, index) => `?value${index}`);
  // limit the entities before joining labels so multiple label values do not consume the limit
  const pageQuery = SELECT.DISTINCT`?iri`.WHERE`?iri a ${classNode} .`.ORDER_BY`STR(?iri)`.LIMIT(
    200,
  );
  const optionalPatterns = displayProperties.map((propertyIri, index) => {
    const predicate = toSparqlNamedNode(propertyIri, 'Reference display property IRI');
    return OPTIONAL`?iri ${predicate} ${valueVariables[index]} .`;
  });

  return SELECT`?iri ${valueVariables.join(' ')}`.WHERE`{ ${pageQuery} } ${optionalPatterns}`
    .ORDER_BY`STR(?iri)`.build();
}

export function referenceDisplayProperties(args: ReferenceListArgs): readonly string[] {
  return args.displayProperties.length > 0 ? args.displayProperties : FALLBACK_LABEL_PROPERTIES;
}

/** Builds reversed triples that LDKit cannot write through an @inverse schema property. */
export function buildInverseInsertQuads<TModel extends EntityModel>(
  fields: readonly FieldDescriptor[],
  payload: TModel,
): RDF.Quad[] {
  if (fields.length === 0) {
    return [];
  }

  const entityNode = toSparqlNamedNode(payload.id as string, 'Entity IRI');
  const record = payload as Record<string, unknown>;
  return fields.flatMap((field) => {
    const predicate = toSparqlNamedNode(field.propertyIri as string, 'Inverse predicate IRI');
    return referenceIds(record[field.propertyName], field).map((targetId) =>
      dataFactory.quad(
        toSparqlNamedNode(targetId, 'Inverse relation target IRI'),
        predicate,
        entityNode,
      ),
    );
  });
}

export function buildInverseDeleteQuery(
  fields: readonly FieldDescriptor[],
  entityId: string,
): string | null {
  const predicates = fields.map((field) =>
    toSparqlNamedNode(field.propertyIri as string, 'Inverse predicate IRI'),
  );
  if (predicates.length === 0) {
    return null;
  }

  const entityNode = toSparqlNamedNode(entityId, 'Entity IRI');
  return DELETE`?target ?predicate ${entityNode}`.WHERE`
    VALUES ?predicate { ${predicates} }
    ?target ?predicate ${entityNode}
  `.build();
}

export function toSparqlNamedNode(value: string, label: string): RDF.NamedNode {
  return dataFactory.namedNode(requireSafeAbsoluteIri(value, label));
}

/**
 * Validates the RDF term kind as well as its text. A literal can contain an IRI-shaped string but
 * still cannot be used where LDKit expects a named node.
 */
export function toSafeNamedNodeValue(term: RDF.Term | undefined, label: string): string {
  if (term?.termType !== 'NamedNode') {
    throw new Error(`${label} must be a safe absolute named-node IRI.`);
  }
  return requireSafeAbsoluteIri(term.value, label);
}

function referenceIds(value: unknown, field: FieldDescriptor): string[] {
  return fieldValues(value, field).flatMap((entry) => {
    const id = referenceIdOf(entry);
    return id === '' ? [] : [requireSafeAbsoluteIri(id, `${field.label} reference IRI`)];
  });
}
