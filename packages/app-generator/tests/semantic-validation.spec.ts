import { describe, expect, it } from 'vitest';

import { ViolationCode } from '../src/validation/violation-codes.ts';
import {
  AssociationKind,
  DatasourceType,
  DeletePolicy,
  EdgeType,
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
  type ApplicationNodeConfig,
} from '../src/graph/types.ts';
import { analyzeGraphSemantics } from '../src/validation/analyze-semantics.ts';
import { ViolationSeverity } from '../src/validation/types.ts';
import { FieldKind } from '../src/metadata/types.ts';
import { basicMetadata, specificationIri } from './fixtures/metadata/basic-metadata.ts';

describe('analyzeGraphSemantics', () => {
  it('accepts a valid read list to read detail transition', () => {
    const graph = validGraph();
    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('requires exactly one RDF datasource', () => {
    const tooMany = validGraph({
      datasources: [
        {
          id: 'main-rdf',
          type: DatasourceType.Rdf,
          endpoint: 'https://example.org/sparql',
        },
        {
          id: 'other-rdf',
          type: DatasourceType.Rdf,
          endpoint: 'https://example.org/other',
        },
      ],
    });
    const wrongType = validGraph({
      datasources: [
        // The JSON schema already rejects non-RDF types, so a cast is needed here to exercise
        // the defensive re-check in semantic validation.
        { id: 'main-rest', type: 'rest' as DatasourceType, endpoint: 'https://example.org/api' },
      ],
    });

    expectViolations(tooMany, ViolationCode.SemanticUnsupportedDatasourceCount);
    expectViolations(wrongType, ViolationCode.SemanticUnsupportedDatasourceType);
  });

  it('rejects unknown aggregate references', () => {
    const graph = validGraph({
      nodes: [
        node('Missing.ReadList', 'https://example.org/aggregate/missing', Operation.ReadList),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticUnknownAggregate);
  });

  it('rejects edges with unknown source or target nodes', () => {
    const graph = validGraph({
      edges: [
        {
          id: 'missing-edge',
          source: 'Missing.ReadList',
          target: 'Missing.ReadDetail',
          type: EdgeType.Transition,
        },
      ],
    });

    const result = validatePreparedGraph(graph);

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ViolationCode.SemanticUnknownEdgeSource,
        }),
        expect.objectContaining({
          code: ViolationCode.SemanticUnknownEdgeTarget,
        }),
      ])
    );
  });

  it('rejects multiple redirects from one source node', () => {
    const createNode = node(
      'Book.Create',
      'https://example.org/aggregate/book-form',
      Operation.Create
    );
    const graph = validGraph({
      nodes: [...validGraph().nodes, createNode],
      edges: [
        {
          id: 'create-to-list',
          source: createNode.id,
          target: 'Book.ReadList',
          type: EdgeType.Redirect,
        },
        {
          id: 'create-to-detail',
          source: createNode.id,
          target: 'Book.ReadDetail',
          type: EdgeType.Redirect,
        },
      ],
    });

    expectViolations(graph, ViolationCode.SemanticMultipleRedirects);
  });

  it('validates redirect operation pairs and same-class detail redirects', () => {
    const createBook = node(
      'Book.Create',
      'https://example.org/aggregate/book-form',
      Operation.Create
    );
    const authorDetail = node(
      'Author.ReadDetail',
      'https://example.org/aggregate/author-detail',
      Operation.ReadDetail
    );
    const invalidPair = validGraph({
      edges: [
        {
          id: 'list-redirect',
          source: 'Book.ReadList',
          target: 'Book.ReadDetail',
          type: EdgeType.Redirect,
        },
      ],
    });
    const invalidClass = validGraph({
      nodes: [...validGraph().nodes, createBook, authorDetail],
      edges: [
        {
          id: 'create-author-detail',
          source: createBook.id,
          target: authorDetail.id,
          type: EdgeType.Redirect,
        },
      ],
    });

    expectViolations(invalidPair, ViolationCode.SemanticInvalidRedirect);
    expectViolations(invalidClass, ViolationCode.SemanticRedirectRequiresSameClass);
  });

  it('validates transition operation pairs and class compatibility', () => {
    const authorDetail = node(
      'Author.ReadDetail',
      'https://example.org/aggregate/author-detail',
      Operation.ReadDetail
    );
    const updateAuthor = node(
      'Author.Update',
      'https://example.org/aggregate/author-detail',
      Operation.Update
    );
    const invalidPair = validGraph({
      edges: [
        {
          id: 'create-transition',
          source: 'Book.ReadList',
          target: 'Book.ReadList',
          type: EdgeType.Transition,
        },
      ],
    });
    const invalidClass = validGraph({
      nodes: [...validGraph().nodes, authorDetail, updateAuthor],
      edges: [
        {
          id: 'book-detail-author-update',
          source: 'Book.ReadDetail',
          target: updateAuthor.id,
          type: EdgeType.Transition,
        },
      ],
    });

    expectViolations(invalidPair, ViolationCode.SemanticInvalidTransition);
    expectViolations(invalidClass, ViolationCode.SemanticTransitionRequiresSameClass);
  });

  it('allows associated cross-aggregate detail transitions', () => {
    const authorDetail = node(
      'Author.ReadDetail',
      'https://example.org/aggregate/author-detail',
      Operation.ReadDetail
    );
    const graph = validGraph({
      nodes: [...validGraph().nodes, authorDetail],
      edges: [
        {
          id: 'book-detail-author-detail',
          source: 'Book.ReadDetail',
          target: authorDetail.id,
          type: EdgeType.Transition,
        },
      ],
    });

    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(true);
  });

  it('allows nested associations from detail pages but not list rows', () => {
    const footnoteDetail = node(
      'Footnote.ReadDetail',
      'https://example.org/aggregate/footnote-detail',
      Operation.ReadDetail
    );
    const detailGraph = validGraph({
      nodes: [validGraph().nodes[1], footnoteDetail],
      edges: [
        {
          id: 'book-detail-nested-footnote-detail',
          source: 'Book.ReadDetail',
          target: footnoteDetail.id,
          type: EdgeType.Transition,
        },
      ],
    });
    const listGraph = validGraph({
      nodes: [
        node('Book.ReadList', 'https://example.org/aggregate/book-detail', Operation.ReadList),
        footnoteDetail,
      ],
      edges: [
        {
          id: 'book-list-nested-footnote-detail',
          source: 'Book.ReadList',
          target: footnoteDetail.id,
          type: EdgeType.Transition,
        },
      ],
    });

    expect(validatePreparedGraph(detailGraph).valid).toBe(true);
    expectWarnings(listGraph, ViolationCode.SemanticTransitionRequiresAssociation);
  });

  it('rejects unrelated cross-aggregate detail transitions', () => {
    const chapterDetail = node(
      'Chapter.ReadDetail',
      'https://example.org/aggregate/chapter-detail',
      Operation.ReadDetail
    );
    const graph = validGraph({
      nodes: [validGraph().nodes[0], chapterDetail],
      edges: [
        {
          id: 'book-list-chapter-detail',
          source: 'Book.ReadList',
          target: chapterDetail.id,
          type: EdgeType.Transition,
        },
      ],
    });

    expectWarnings(graph, ViolationCode.SemanticTransitionRequiresAssociation);
  });

  it('defaults unconfigured associations to aggregation', () => {
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        delete: { chapters: DeletePolicy.Cascade },
      }
    );
    const graph = validGraph({
      nodes: [deleteBook],
      edges: [],
    });

    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticCannotCascadeAggregation })
    );
    const book = result.enrichedMetadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );
    expect(book?.fields.find((field) => field.path === 'chapters')?.associationKind).toBe(
      AssociationKind.Aggregation
    );
  });

  it('rejects delete cascade when no operation configures the matching association', () => {
    const createBook = node(
      'Book.Create',
      'https://example.org/aggregate/book-form',
      Operation.Create
    );
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        delete: { chapters: DeletePolicy.Cascade },
      }
    );
    const graph = validGraph({
      nodes: [createBook, deleteBook],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCannotCascadeAggregation);
  });

  it('rejects delete cascade when an update node declares the association as an aggregation', () => {
    const updateBook = node(
      'Book.Update',
      'https://example.org/aggregate/book-detail',
      Operation.Update,
      {
        associations: { author: AssociationKind.Aggregation },
      }
    );
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        delete: { author: DeletePolicy.Cascade },
      }
    );
    const graph = validGraph({
      nodes: [updateBook, deleteBook],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCannotCascadeAggregation);
  });

  it('rejects delete cascade when the association is unconfigured on an update node', () => {
    const updateBook = node(
      'Book.Update',
      'https://example.org/aggregate/book-detail',
      Operation.Update
    );
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        delete: { chapters: DeletePolicy.Cascade },
      }
    );
    const graph = validGraph({
      nodes: [updateBook, deleteBook],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCannotCascadeAggregation);
  });

  it('inherits a composition on another node of the same aggregate', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Create', 'https://example.org/aggregate/book-detail', Operation.Create, {
          associations: { chapters: AssociationKind.Composition },
        }),
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update),
        node('Book.Delete', 'https://example.org/aggregate/book-detail', Operation.Delete, {
          delete: { chapters: DeletePolicy.Cascade },
        }),
      ],
      edges: [],
    });

    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(true);
    const book = result.enrichedMetadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );
    expect(book?.fields.find((field) => field.path === 'chapters')?.associationKind).toBe(
      AssociationKind.Composition
    );
  });

  it('inherits a composition across matching aggregates of the same class', () => {
    const metadata = structuredClone(basicMetadata);
    const detailAuthor = metadata.aggregates
      .find((aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail')
      ?.fields.find((field) => field.path === 'author');
    const listAuthor = metadata.aggregates
      .find((aggregate) => aggregate.iri === 'https://example.org/aggregate/book-list')
      ?.fields.find((field) => field.path === 'author');
    if (!detailAuthor || !listAuthor) {
      throw new Error('Missing author fields in the test metadata.');
    }
    detailAuthor.propertyIri = 'https://example.org/property/author';
    listAuthor.path = 'writer';
    listAuthor.propertyIri = detailAuthor.propertyIri;

    const graph = validGraph({
      nodes: [
        node('Book.Create', 'https://example.org/aggregate/book-detail', Operation.Create, {
          associations: { author: AssociationKind.Composition },
        }),
        node('BookRow.Update', 'https://example.org/aggregate/book-list', Operation.Update),
        node('BookRow.Delete', 'https://example.org/aggregate/book-list', Operation.Delete, {
          delete: { writer: DeletePolicy.Cascade },
        }),
      ],
      edges: [],
    });

    const result = analyzeGraphSemantics(graph, metadata);

    expect(result.valid).toBe(true);
    const bookList = result.enrichedMetadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-list'
    );
    expect(bookList?.fields.find((field) => field.path === 'writer')?.associationKind).toBe(
      AssociationKind.Composition
    );
  });

  it('inherits a nested association kind in an aggregate rooted at the nested class', () => {
    const metadata = structuredClone(basicMetadata);
    const bookChapters = metadata.aggregates
      .find((aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail')
      ?.fields.find((field) => field.path === 'chapters');
    const nestedFootnotes = bookChapters?.fields?.find((field) => field.path === 'footnotes');
    const chapterFootnotes = metadata.aggregates
      .find((aggregate) => aggregate.iri === 'https://example.org/aggregate/chapter-detail')
      ?.fields.find((field) => field.path === 'footnotes');
    if (!nestedFootnotes || !chapterFootnotes) {
      throw new Error('Missing footnote fields in the test metadata.');
    }
    nestedFootnotes.propertyIri = 'https://example.org/property/footnotes';
    chapterFootnotes.propertyIri = nestedFootnotes.propertyIri;

    const graph = validGraph({
      nodes: [
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
          associations: {
            chapters: AssociationKind.Composition,
            'chapters.footnotes': AssociationKind.Composition,
          },
        }),
        node('Chapter.Update', 'https://example.org/aggregate/chapter-detail', Operation.Update),
        node('Chapter.Delete', 'https://example.org/aggregate/chapter-detail', Operation.Delete, {
          delete: { footnotes: DeletePolicy.Cascade },
        }),
      ],
      edges: [],
    });

    const result = analyzeGraphSemantics(graph, metadata);

    expect(result.valid).toBe(true);
    const chapter = result.enrichedMetadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/chapter-detail'
    );
    expect(chapter?.fields.find((field) => field.path === 'footnotes')?.associationKind).toBe(
      AssociationKind.Composition
    );
  });

  it('allows nested delete cascade through compositions declared on an update node', () => {
    const updateBook = node(
      'Book.Update',
      'https://example.org/aggregate/book-detail',
      Operation.Update,
      {
        associations: {
          chapters: AssociationKind.Composition,
          'chapters.footnotes': AssociationKind.Composition,
        },
      }
    );
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        delete: {
          chapters: DeletePolicy.Cascade,
          'chapters.footnotes': DeletePolicy.Cascade,
        },
      }
    );
    const graph = validGraph({
      nodes: [updateBook, deleteBook],
      edges: [],
    });

    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(true);
  });

  it('rejects nested delete cascade whose parent composition does not cascade', () => {
    const updateBook = node(
      'Book.Update',
      'https://example.org/aggregate/book-detail',
      Operation.Update,
      {
        associations: {
          chapters: AssociationKind.Composition,
          'chapters.footnotes': AssociationKind.Composition,
        },
      }
    );
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        delete: { 'chapters.footnotes': DeletePolicy.Cascade },
      }
    );
    const graph = validGraph({
      nodes: [updateBook, deleteBook],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCascadeRequiresParentCascade);
  });

  it('rejects aggregates whose names produce the same module name', () => {
    const graph = validGraph({
      nodes: [node('Book.ReadList', 'https://example.org/aggregate/book-a', Operation.ReadList)],
      edges: [],
    });
    const metadata = {
      dataSpecificationIri: specificationIri,
      aggregates: [
        {
          iri: 'https://example.org/aggregate/book-a',
          name: 'Book Detail',
          classIri: 'https://example.org/class/book',
          fields: [],
        },
        {
          iri: 'https://example.org/aggregate/book-b',
          name: 'Book detail',
          classIri: 'https://example.org/class/book',
          fields: [],
        },
      ],
    };

    const result = analyzeGraphSemantics(graph, metadata);

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticDuplicateAggregateName })
    );
  });

  it('rejects field paths that collide after TypeScript name normalization', () => {
    const graph = validGraph({
      nodes: [node('Book.ReadList', 'urn:aggregate:collision', Operation.ReadList)],
      edges: [],
    });
    const metadata = {
      dataSpecificationIri: specificationIri,
      aggregates: [
        {
          iri: 'urn:aggregate:collision',
          name: 'Collision',
          classIri: 'urn:class:collision',
          fields: [
            {
              path: 'a-b',
              label: 'First',
              kind: FieldKind.Primitive,
              propertyIri: 'urn:property:first',
            },
            {
              path: 'a.b',
              label: 'Second',
              kind: FieldKind.Primitive,
              propertyIri: 'urn:property:second',
            },
          ],
        },
      ],
    };

    const result = analyzeGraphSemantics(graph, metadata);

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticDuplicateGeneratedFieldName,
        message: expect.stringContaining('property name "aB"'),
      })
    );
  });

  it('rejects fields that collide with generated runtime properties', () => {
    const graph = validGraph();
    const metadata = structuredClone(basicMetadata);
    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );
    if (!book) {
      throw new Error('Missing book aggregate in test metadata.');
    }
    book.fields.push(
      { path: 'id', label: 'Id', kind: FieldKind.Primitive },
      {
        path: '__specializationIri',
        label: 'Specialization',
        kind: FieldKind.Primitive,
      },
      { path: '__rdfTypes', label: 'Types', kind: FieldKind.Primitive }
    );

    const result = analyzeGraphSemantics(graph, metadata);
    const reservedNameViolations = result.violations.filter(
      (violation) =>
        violation.code === ViolationCode.SemanticDuplicateGeneratedFieldName &&
        violation.message.includes('reserved property name')
    );

    expect(result.valid).toBe(false);
    expect(reservedNameViolations).toHaveLength(3);
  });

  it('warns once per writable NEVER composition, including specialization targets', () => {
    const metadata = structuredClone(basicMetadata);
    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );
    const chapters = book?.fields.find((field) => field.path === 'chapters');
    if (!book || !chapters) {
      throw new Error('Missing book composition in test metadata.');
    }
    chapters.targetIdentityPolicy = 'NEVER';
    book.fields.push({
      path: 'contacts',
      label: 'Contacts',
      kind: FieldKind.Association,
      targetClassIri: 'https://example.org/class/contact',
      fields: [],
      specializations: [
        {
          specializationIri: 'https://example.org/psm/organization',
          label: 'Organization',
          classIri: 'https://example.org/class/organization',
          fieldPaths: [],
          identityPolicy: 'NEVER',
        },
        {
          specializationIri: 'https://example.org/psm/individual',
          label: 'Individual',
          classIri: 'https://example.org/class/individual',
          fieldPaths: [],
          identityPolicy: 'NEVER',
        },
      ],
    });
    const graph = validGraph({
      nodes: [
        node('Book.Create', book.iri, Operation.Create, {
          associations: {
            chapters: AssociationKind.Composition,
            contacts: AssociationKind.Composition,
          },
        }),
        node('Book.Update', book.iri, Operation.Update, {
          associations: {
            chapters: AssociationKind.Composition,
            contacts: AssociationKind.Composition,
          },
        }),
      ],
      edges: [],
    });

    const result = analyzeGraphSemantics(graph, metadata);
    const identityWarnings = result.violations.filter(
      (violation) => violation.code === ViolationCode.SemanticNamedNodeIdentityOverride
    );

    expect(result.valid).toBe(true);
    expect(identityWarnings).toHaveLength(2);
    expect(identityWarnings.map((warning) => warning.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Composition "chapters"'),
        expect.stringContaining('Composition "contacts"'),
      ])
    );
    expect(identityWarnings.map((warning) => warning.message).join(' ')).toContain(
      'Affected specializations: "Organization", "Individual".'
    );
    expect(identityWarnings.map((warning) => warning.message).join(' ')).not.toMatch(
      /prototype|instancesHaveIdentity/
    );
  });

  it('rejects field-name collisions in composition targets without operation nodes', () => {
    const parentIri = 'urn:aggregate:parent';
    const childIri = 'urn:aggregate:child';
    const graph = validGraph({
      nodes: [
        node('Parent.Create', parentIri, Operation.Create, {
          associations: { child: AssociationKind.Composition },
        }),
      ],
      edges: [],
    });
    const metadata = {
      dataSpecificationIri: specificationIri,
      aggregates: [
        {
          iri: parentIri,
          name: 'Parent',
          classIri: 'urn:class:parent',
          fields: [
            {
              path: 'child',
              label: 'Child',
              kind: FieldKind.Association,
              targetAggregateIri: childIri,
              targetClassIri: 'urn:class:child',
            },
          ],
        },
        {
          iri: childIri,
          name: 'Child',
          classIri: 'urn:class:child',
          fields: [
            {
              path: 'a-b',
              label: 'First',
              kind: FieldKind.Primitive,
              propertyIri: 'urn:property:first',
            },
            {
              path: 'a.b',
              label: 'Second',
              kind: FieldKind.Primitive,
              propertyIri: 'urn:property:second',
            },
          ],
        },
      ],
    };

    const result = analyzeGraphSemantics(graph, metadata);

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticDuplicateGeneratedFieldName,
        message: expect.stringContaining('aggregate "Child"'),
      })
    );
  });

  it('rejects circular compositions across aggregates', () => {
    const createBook = node(
      'Book.Create',
      'https://example.org/aggregate/book-detail',
      Operation.Create,
      {
        associations: { author: AssociationKind.Composition },
      }
    );
    const createAuthor = node(
      'Author.Create',
      'https://example.org/aggregate/author-detail',
      Operation.Create,
      {
        associations: { books: AssociationKind.Composition },
      }
    );
    const graph = validGraph({
      nodes: [createBook, createAuthor],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCircularComposition);
  });

  it('warns about association config on read nodes', () => {
    const graph = validGraph({
      nodes: [
        node('Book.ReadList', 'https://example.org/aggregate/book-list', Operation.ReadList, {
          associations: { author: AssociationKind.Aggregation },
        }),
      ],
      edges: [],
    });

    expectWarnings(graph, ViolationCode.SemanticAssociationConfigNotAllowed);
  });

  it('warns about delete config on non-delete nodes', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Create', 'https://example.org/aggregate/book-detail', Operation.Create, {
          associations: { chapters: AssociationKind.Composition },
          delete: { chapters: DeletePolicy.Cascade },
        }),
      ],
      edges: [],
    });

    expectWarnings(graph, ViolationCode.SemanticDeleteConfigNotAllowed);
  });

  it('rejects nested delete cascade through aggregations', () => {
    const updateBook = node(
      'Book.Update',
      'https://example.org/aggregate/book-detail',
      Operation.Update,
      {
        associations: {
          chapters: AssociationKind.Composition,
          'chapters.editor': AssociationKind.Aggregation,
        },
      }
    );
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        delete: {
          chapters: DeletePolicy.Cascade,
          'chapters.editor': DeletePolicy.Cascade,
        },
      }
    );
    const graph = validGraph({
      nodes: [updateBook, deleteBook],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCannotCascadeAggregation);
  });

  it('warns about association config on delete nodes', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Delete', 'https://example.org/aggregate/book-detail', Operation.Delete, {
          associations: { chapters: AssociationKind.Composition },
        }),
      ],
      edges: [],
    });

    expectWarnings(graph, ViolationCode.SemanticAssociationConfigNotAllowed);
  });

  it('warns about invalid association config values', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
          associations: { chapters: 'invalid' },
        } as unknown as ApplicationNodeConfig),
      ],
      edges: [],
    });

    expectWarnings(graph, ViolationCode.SemanticInvalidAssociationKind);
  });

  it('warns about association config paths that are not associations', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
          associations: { title: AssociationKind.Composition },
        }),
      ],
      edges: [],
    });

    expectWarnings(graph, ViolationCode.SemanticAssociationPathNotAssociation);
  });

  it('rejects nested association config below aggregations', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
          associations: {
            author: AssociationKind.Aggregation,
            'author.name': AssociationKind.Aggregation,
          },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticNestedAssociationRequiresComposition);
  });

  it('rejects nested association config paths that are not associations', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
          associations: {
            chapters: AssociationKind.Composition,
            'chapters.name': AssociationKind.Aggregation,
          },
        }),
      ],
      edges: [],
    });

    expectWarnings(graph, ViolationCode.SemanticAssociationPathNotAssociation);
  });

  it('rejects nested association config whose parent is configured on another node', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
          associations: { 'chapters.editor': AssociationKind.Aggregation },
        }),
        node('Book.Create', 'https://example.org/aggregate/book-detail', Operation.Create, {
          associations: { chapters: AssociationKind.Composition },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticNestedAssociationRequiresComposition);
  });

  it('accepts nested association config declared in one node config', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
          associations: {
            chapters: AssociationKind.Composition,
            'chapters.editor': AssociationKind.Aggregation,
          },
        }),
      ],
      edges: [],
    });

    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(true);
  });

  it('rejects conflicting association config for the same aggregate path', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Create', 'https://example.org/aggregate/book-detail', Operation.Create, {
          associations: { chapters: AssociationKind.Composition },
        }),
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
          associations: { chapters: AssociationKind.Aggregation },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticConflictingAssociationKind);
  });

  it('rejects conflicting association config across aggregates of the same class', () => {
    // BookList and BookDetail both represent the Book class, so their author associations
    // describe the same semantic association and must agree on the kind.
    const graph = validGraph({
      nodes: [
        node('Book.Create', 'https://example.org/aggregate/book-detail', Operation.Create, {
          associations: { author: AssociationKind.Composition },
        }),
        node('BookRow.Update', 'https://example.org/aggregate/book-list', Operation.Update, {
          associations: { author: AssociationKind.Aggregation },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticConflictingAssociationKind);
  });
});

function expectViolations(graph: ApplicationGraph, code: ViolationCode) {
  const result = validatePreparedGraph(graph);

  expect(result.valid).toBe(false);
  expect(result.violations).toContainEqual(
    expect.objectContaining({ code, severity: ViolationSeverity.Error })
  );
}

/** The graph still generates, but the reported part does not do what the graph asks for. */
function expectWarnings(graph: ApplicationGraph, code: ViolationCode) {
  const result = validatePreparedGraph(graph);

  expect(result.valid).toBe(true);
  expect(result.violations).toContainEqual(
    expect.objectContaining({ code, severity: ViolationSeverity.Warning })
  );
}

function validatePreparedGraph(graph: ApplicationGraph) {
  return analyzeGraphSemantics(graph, basicMetadata);
}

function validGraph(overrides: Partial<ApplicationGraph> = {}): ApplicationGraph {
  return {
    name: 'Library application',
    dataSpecificationIri: specificationIri,
    datasources: [
      {
        id: 'main-rdf',
        type: DatasourceType.Rdf,
        endpoint: 'https://example.org/sparql',
      },
    ],
    nodes: [
      node('Book.ReadList', 'https://example.org/aggregate/book-list', Operation.ReadList),
      node('Book.ReadDetail', 'https://example.org/aggregate/book-detail', Operation.ReadDetail),
    ],
    edges: [
      {
        id: 'book-list-book-detail',
        source: 'Book.ReadList',
        target: 'Book.ReadDetail',
        type: EdgeType.Transition,
      },
    ],
    ...overrides,
  };
}

function node(
  id: string,
  aggregateIri: string,
  operation: ApplicationNode['operation'],
  config?: ApplicationNodeConfig
): ApplicationNode {
  return {
    id,
    aggregateIri,
    operation,
    ...(config ? { config } : {}),
  };
}
