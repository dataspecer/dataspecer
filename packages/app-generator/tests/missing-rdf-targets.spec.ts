import { afterEach, describe, expect, it, vi } from 'vitest';

import { RdfLdkitDataSource } from '../assets/generated-app/src/shared/data-source/rdf-ldkit-data-source.ts';
import { DEFAULT_READ_LIST_SORT } from '../assets/generated-app/src/shared/data-source/data-source.ts';
import { referencePreservingEngine } from '../assets/generated-app/src/shared/data-source/reference-preserving-engine.ts';
import {
  isMissingEntity,
  MISSING_ENTITY_PROPERTY,
  RDF_TYPES_PROPERTY,
  type AggregateDescriptor,
  type EntityModel,
  type EntityRecord,
} from '../assets/generated-app/src/shared/types/aggregate.ts';
import { AssociationKind } from '../src/graph/types.ts';
import { FieldKind } from '../src/metadata/types.ts';
import { buildLdkitSchemaBundle } from '../src/rendering/ldkit-schema.ts';
import { toRenderedAggregate } from '../src/rendering/rendered-aggregate.ts';

afterEach(() => vi.unstubAllGlobals());

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const LDKIT_RESOURCE = 'https://ldkit.io/ontology/Resource';

const P = {
  a: 'https://example.org/p/a',
  a1: 'https://example.org/p/a1',
  a1a: 'https://example.org/p/a1a',
  a3: 'https://example.org/p/a3',
  b: 'https://example.org/p/b',
  bComp: 'https://example.org/p/b-comp',
  d: 'https://example.org/p/d',
  label: 'https://example.org/p/label',
};

const IRI = {
  root: 'https://example.org/root/1',
  a: 'https://example.org/a/1',
  a1: 'https://example.org/a1/1',
  a1a: 'https://example.org/a1a/1',
  a3: 'https://example.org/a3/1',
  b: ['https://example.org/b/0', 'https://example.org/b/1', 'https://example.org/b/2'],
  bComp: ['https://example.org/b-comp/0', 'https://example.org/b-comp/1'],
  d: ['https://example.org/d/0', 'https://example.org/d/1'],
  shared: 'https://example.org/shared/1',
};

describe('reference-preserving query engine', () => {
  it('is not installed for a schema without expanded references', () => {
    expect(referencePreservingEngine({ '@type': 'https://example.org/Flat' })).toBeUndefined();
  });
});

function primitive(path: string, propertyIri = P.label) {
  return {
    path,
    label: path,
    kind: FieldKind.Primitive,
    propertyIri,
    many: false,
    required: false,
  } as const;
}

/**
 * The tree from the regression plan. It mixes both expansion mechanisms at several depths so a
 * missing target can be placed anywhere and only its own branch should degrade.
 */
function buildRoot() {
  return toRenderedAggregate({
    iri: 'https://example.org/aggregate/root',
    name: 'Root',
    safeName: 'Root',
    classIri: 'https://example.org/class/root',
    fields: [
      {
        path: 'a',
        label: 'A',
        kind: FieldKind.Association,
        propertyIri: P.a,
        targetClassIri: 'https://example.org/class/a',
        associationKind: AssociationKind.Composition,
        many: false,
        required: false,
        fields: [
          primitive('label'),
          {
            path: 'a1',
            label: 'A1',
            kind: FieldKind.Association,
            propertyIri: P.a1,
            targetClassIri: 'https://example.org/class/a1',
            associationKind: AssociationKind.Composition,
            many: false,
            required: false,
            fields: [
              primitive('label'),
              {
                path: 'a1a',
                label: 'A1a',
                kind: FieldKind.Association,
                propertyIri: P.a1a,
                targetClassIri: 'https://example.org/class/a1a',
                associationKind: AssociationKind.Aggregation,
                many: false,
                required: false,
                fields: [primitive('label')],
              },
            ],
          },
          {
            // aggregation with no display fields never becomes an expanded reference
            path: 'a3',
            label: 'A3',
            kind: FieldKind.Association,
            propertyIri: P.a3,
            targetClassIri: 'https://example.org/class/a3',
            associationKind: AssociationKind.Aggregation,
            many: false,
            required: false,
            fields: [],
          },
        ],
      },
      {
        path: 'b',
        label: 'B',
        kind: FieldKind.Association,
        propertyIri: P.b,
        targetClassIri: 'https://example.org/class/b',
        associationKind: AssociationKind.Composition,
        many: true,
        required: false,
        fields: [
          primitive('label'),
          {
            path: 'bComp',
            label: 'BComp',
            kind: FieldKind.Association,
            propertyIri: P.bComp,
            targetClassIri: 'https://example.org/class/b-comp',
            associationKind: AssociationKind.Composition,
            many: false,
            required: false,
            fields: [primitive('label')],
          },
        ],
      },
      {
        path: 'd',
        label: 'D',
        kind: FieldKind.Association,
        propertyIri: P.d,
        targetClassIri: 'https://example.org/class/d',
        associationKind: AssociationKind.Aggregation,
        many: true,
        required: false,
        fields: [primitive('label')],
      },
    ],
  });
}

const rendered = buildRoot();
const rootAggregate: AggregateDescriptor<EntityModel> = {
  iri: rendered.iri,
  name: rendered.name,
  classIri: rendered.classIri,
  fields: rendered.descriptorFields,
  createEmpty: () => ({}),
};
const rootSchemas = buildLdkitSchemaBundle(rendered.classIri, rendered.fields);

function stub(triples: string[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(triples.join('\n'), {
          status: 200,
          headers: { 'Content-Type': 'application/n-triples' },
        }),
      ),
    ),
  );
}

function dataSource(): RdfLdkitDataSource {
  return new RdfLdkitDataSource('https://example.org/sparql', {
    [rootAggregate.iri]: rootSchemas,
  });
}

/**
 * A list read mixes query kinds: counting and paging return SPARQL results, loading the page
 * returns quads. The stub answers each with the shape LDKit expects for it.
 */
function stubListRead(iris: string[], triples: string[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? init.body : '';
      if (/CONSTRUCT|DESCRIBE/i.test(body)) {
        return Promise.resolve(
          new Response(triples.join('\n'), {
            status: 200,
            headers: { 'Content-Type': 'application/n-triples' },
          }),
        );
      }
      const bindings = /COUNT/i.test(body)
        ? [{ count: { type: 'literal', value: String(iris.length) } }]
        : iris.map((iri) => ({ iri: { type: 'uri', value: iri } }));
      return Promise.resolve(
        new Response(JSON.stringify({ head: { vars: ['iri', 'count'] }, results: { bindings } }), {
          status: 200,
          headers: { 'Content-Type': 'application/sparql-results+json' },
        }),
      );
    }),
  );
}

function readRoot(triples: string[], source = dataSource()) {
  stub([`<${IRI.root}> <${RDF_TYPE}> <${LDKIT_RESOURCE}> .`, ...triples]);
  return source.readDetail({ aggregate: rootAggregate, id: IRI.root });
}

/** Every triple needed for a fully populated tree, so a case can remove exactly one target. */
function fullTree(): string[] {
  return [
    `<${IRI.root}> <${P.a}> <${IRI.a}> .`,
    `<${IRI.a}> <${P.label}> "A" .`,
    `<${IRI.a}> <${P.a1}> <${IRI.a1}> .`,
    `<${IRI.a1}> <${P.label}> "A1" .`,
    `<${IRI.a1}> <${P.a1a}> <${IRI.a1a}> .`,
    `<${IRI.a1a}> <${P.label}> "A1a" .`,
    `<${IRI.a}> <${P.a3}> <${IRI.a3}> .`,
    ...IRI.b.flatMap((iri, index) => [
      `<${IRI.root}> <${P.b}> <${iri}> .`,
      `<${iri}> <${P.label}> "B${index}" .`,
    ]),
    `<${IRI.b[1]}> <${P.bComp}> <${IRI.bComp[1]}> .`,
    `<${IRI.bComp[1]}> <${P.label}> "BComp1" .`,
    ...IRI.d.flatMap((iri, index) => [
      `<${IRI.root}> <${P.d}> <${iri}> .`,
      `<${iri}> <${P.label}> "D${index}" .`,
    ]),
  ];
}

/** Drops every triple whose subject is one of the given IRIs, leaving the links that point at it. */
function without(triples: string[], ...subjects: string[]): string[] {
  return triples.filter(
    (triple) => !subjects.some((subject) => triple.startsWith(`<${subject}> `)),
  );
}

describe('missing targets in a nested composition tree', () => {
  it('marks a missing top-level composition and leaves siblings intact', async () => {
    const model = (await readRoot(without(fullTree(), IRI.a))) as EntityRecord;
    expect(isMissingEntity(model.a as EntityRecord)).toBe(true);
    expect((model.a as EntityRecord).id).toBe(IRI.a);
    expect((model.b as EntityRecord[]).map((entry) => entry.label)).toEqual(['B0', 'B1', 'B2']);
    expect((model.d as EntityRecord[]).map((entry) => entry.label)).toEqual(['D0', 'D1']);
  });

  it('keeps a present parent usable when its composed child is missing', async () => {
    const model = (await readRoot(without(fullTree(), IRI.a1))) as EntityRecord;
    const a = model.a as EntityRecord;
    expect(isMissingEntity(a)).toBe(false);
    expect(a.label).toBe('A');
    expect(isMissingEntity(a.a1 as EntityRecord)).toBe(true);
    expect((a.a3 as EntityRecord).id).toBe(IRI.a3);
  });

  it('preserves a missing display-bearing aggregation nested inside compositions', async () => {
    const model = (await readRoot(without(fullTree(), IRI.a1a))) as EntityRecord;
    const a1a = ((model.a as EntityRecord).a1 as EntityRecord).a1a as EntityRecord;

    expect(a1a).toMatchObject({ id: IRI.a1a, label: null });
    expect(isMissingEntity(a1a)).toBe(false);
  });

  it('leaves a plain-IRI aggregation unmarked', async () => {
    const model = (await readRoot(without(fullTree(), IRI.a3))) as EntityRecord;
    const a3 = (model.a as EntityRecord).a3 as EntityRecord;
    expect(a3.id).toBe(IRI.a3);
    expect(MISSING_ENTITY_PROPERTY in a3).toBe(false);
  });

  it('reports only the outermost node when its descendant links are unavailable', async () => {
    const model = (await readRoot(without(fullTree(), IRI.a, IRI.a1))) as EntityRecord;
    const a = model.a as EntityRecord;
    expect(isMissingEntity(a)).toBe(true);
    // No returned triple describes the child link, so its identifier cannot be recovered.
    expect(a.a1).toBeNull();
  });

  it('preserves the other entries when one repeated composition is missing', async () => {
    const model = (await readRoot(without(fullTree(), IRI.b[1]))) as EntityRecord;
    const entries = model.b as EntityRecord[];
    expect(entries.map((entry) => entry.id)).toEqual(expect.arrayContaining(IRI.b));
    expect(entries.filter(isMissingEntity).map((entry) => entry.id)).toEqual([IRI.b[1]]);
  });

  it('isolates a missing grandchild inside one repeated composition', async () => {
    const model = (await readRoot(without(fullTree(), IRI.bComp[1]))) as EntityRecord;
    const entries = model.b as EntityRecord[];
    expect(entries.some(isMissingEntity)).toBe(false);
    expect(isMissingEntity(entries[1].bComp as EntityRecord)).toBe(true);
  });

  it('marks a shared missing IRI only where it is reached as a composition', async () => {
    const triples = [
      `<${IRI.root}> <${P.a}> <${IRI.shared}> .`,
      `<${IRI.root}> <${P.d}> <${IRI.shared}> .`,
    ];
    const model = (await readRoot(triples)) as EntityRecord;
    expect(isMissingEntity(model.a as EntityRecord)).toBe(true);
    const viaAggregation = (model.d as EntityRecord[])[0];
    expect(viaAggregation.id).toBe(IRI.shared);
    expect(viaAggregation.label).toBeNull();
    expect(MISSING_ENTITY_PROPERTY in viaAggregation).toBe(false);
  });

  it('does not mark aggregation targets returned by list reads', async () => {
    // List schemas keep display-bearing aggregations but omit compositions.
    expect('a' in rootSchemas.list).toBe(false);
    expect('b' in rootSchemas.list).toBe(false);
    expect('d' in rootSchemas.list).toBe(true);

    stubListRead(
      [IRI.root],
      [
        `<${IRI.root}> <${RDF_TYPE}> <${LDKIT_RESOURCE}> .`,
        `<${IRI.root}> <${P.d}> <${IRI.d[0]}> .`,
      ],
    );
    const result = await dataSource().readList({
      aggregate: rootAggregate,
      page: 1,
      pageSize: 10,
      sort: DEFAULT_READ_LIST_SORT,
    });
    expect(result.items).toHaveLength(1);
    for (const item of result.items as EntityRecord[]) {
      expect(MISSING_ENTITY_PROPERTY in item).toBe(false);
      const references = (item.d ?? []) as EntityRecord[];
      expect(references.every((entry) => !(MISSING_ENTITY_PROPERTY in entry))).toBe(true);
    }
  });

  it('keeps missing identifiers isolated between reads', async () => {
    const source = dataSource();
    const broken = (await readRoot(without(fullTree(), IRI.a), source)) as EntityRecord;
    expect(isMissingEntity(broken.a as EntityRecord)).toBe(true);
    const healthy = (await readRoot(fullTree(), source)) as EntityRecord;
    expect(isMissingEntity(healthy.a as EntityRecord)).toBe(false);
    expect((healthy.a as EntityRecord).label).toBe('A');
  });

  it('leaves healthy compositions and aggregations unchanged', async () => {
    const model = (await readRoot(fullTree())) as EntityRecord;
    const a1 = (model.a as EntityRecord).a1 as EntityRecord;

    expect(JSON.stringify(model)).not.toContain(MISSING_ENTITY_PROPERTY);
    expect(a1.a1a).toMatchObject({ id: IRI.a1a, label: 'A1a' });
    expect((model.b as EntityRecord[]).map((entry) => entry.label)).toEqual(['B0', 'B1', 'B2']);
    expect((model.d as EntityRecord[]).map((entry) => entry.label)).toEqual(['D0', 'D1']);
  });
});

describe('missing specialized composition children', () => {
  const SPEC = {
    person: 'https://example.org/psm/person',
    org: 'https://example.org/psm/org',
  };
  const specRendered = toRenderedAggregate({
    iri: 'https://example.org/aggregate/owner-spec',
    name: 'OwnerSpec',
    safeName: 'OwnerSpec',
    classIri: 'https://example.org/class/owner-spec',
    fields: [
      {
        path: 'contact',
        label: 'Contact',
        kind: FieldKind.Association,
        propertyIri: 'https://example.org/p/contact',
        targetClassIri: 'https://example.org/class/contact',
        associationKind: AssociationKind.Composition,
        many: false,
        required: false,
        fields: [
          primitive('personName', 'https://example.org/p/person-name'),
          primitive('orgName', 'https://example.org/p/org-name'),
        ],
        specializations: [
          {
            specializationIri: SPEC.person,
            label: 'Person',
            classIri: 'https://example.org/class/person',
            fieldPaths: ['personName'],
          },
          {
            specializationIri: SPEC.org,
            label: 'Organization',
            classIri: 'https://example.org/class/org',
            fieldPaths: ['orgName'],
          },
        ],
      },
    ],
  });
  const specAggregate: AggregateDescriptor<EntityModel> = {
    iri: specRendered.iri,
    name: specRendered.name,
    classIri: specRendered.classIri,
    fields: specRendered.descriptorFields,
    createEmpty: () => ({}),
  };
  const contactIri = 'https://example.org/contact/1';

  it('reads a missing specialized child without resolving a specialization', async () => {
    const schemas = buildLdkitSchemaBundle(specRendered.classIri, specRendered.fields);
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            [
              `<${IRI.root}> <${RDF_TYPE}> <${LDKIT_RESOURCE}> .`,
              `<${IRI.root}> <https://example.org/p/contact> <${contactIri}> .`,
            ].join('\n'),
            { status: 200, headers: { 'Content-Type': 'application/n-triples' } },
          ),
        ),
      ),
    );
    const source = new RdfLdkitDataSource('https://example.org/sparql', {
      [specAggregate.iri]: schemas,
    });
    const model = (await source.readDetail({
      aggregate: specAggregate,
      id: IRI.root,
    })) as EntityRecord | null;
    const contact = model?.contact as EntityRecord;
    expect(isMissingEntity(contact)).toBe(true);
    expect(contact[RDF_TYPES_PROPERTY]).toEqual([]);
  });
});
