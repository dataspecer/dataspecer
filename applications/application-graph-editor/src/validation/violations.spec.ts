import { describe, expect, it } from 'vitest';
import {
  DatasourceType,
  EdgeType,
  FieldKind,
  Operation,
  type ApplicationEdge,
  type ApplicationGraph,
  type ApplicationNode,
  type SpecificationMetadata,
} from '@dataspecer/app-generator/graph';
import { connectableTargets } from './violations.ts';

const BOOK_LIST = 'urn:aggregate:book-list';
const BOOK_DETAIL = 'urn:aggregate:book-detail';
const BOOK_FORM = 'urn:aggregate:book-form';
const AUTHOR_DETAIL = 'urn:aggregate:author-detail';
const CHAPTER_DETAIL = 'urn:aggregate:chapter-detail';

const METADATA: SpecificationMetadata = {
  dataSpecificationIri: 'urn:spec',
  aggregates: [
    {
      iri: BOOK_LIST,
      name: 'BookList',
      classIri: 'urn:class:book',
      fields: [
        {
          path: 'author',
          label: 'Author',
          kind: FieldKind.Association,
          targetAggregateIri: AUTHOR_DETAIL,
          targetClassIri: 'urn:class:author',
        },
      ],
    },
    { iri: BOOK_DETAIL, name: 'BookDetail', classIri: 'urn:class:book', fields: [] },
    { iri: BOOK_FORM, name: 'BookForm', classIri: 'urn:class:book', fields: [] },
    { iri: AUTHOR_DETAIL, name: 'AuthorDetail', classIri: 'urn:class:author', fields: [] },
    { iri: CHAPTER_DETAIL, name: 'ChapterDetail', classIri: 'urn:class:chapter', fields: [] },
  ],
};

function node(aggregateIri: string, operation: Operation): ApplicationNode {
  return { id: `${aggregateIri}#${operation}`, aggregateIri, operation };
}

const LIST = node(BOOK_LIST, Operation.ReadList);
const DETAIL = node(BOOK_DETAIL, Operation.ReadDetail);
const FORM = node(BOOK_FORM, Operation.Create);
const AUTHOR = node(AUTHOR_DETAIL, Operation.ReadDetail);
const CHAPTER = node(CHAPTER_DETAIL, Operation.ReadDetail);

function graphOf(edges: ApplicationEdge[] = []): ApplicationGraph {
  return {
    name: 'Test',
    dataSpecificationIri: 'urn:spec',
    datasources: [{ id: 'ds', type: DatasourceType.Rdf, endpoint: 'http://example.org/sparql' }],
    nodes: [LIST, DETAIL, FORM, AUTHOR, CHAPTER],
    edges,
  };
}

function connect(
  source: ApplicationNode,
  target: ApplicationNode,
  edges: ApplicationEdge[] = [],
): boolean {
  return connectableTargets(graphOf(edges), source, METADATA).has(target.id);
}

describe('connectableTargets', () => {
  it('allows a list to reach the detail of the same class', () => {
    expect(connect(LIST, DETAIL)).toBe(true);
  });

  it('allows a list to reach the detail of an unrelated class, which only warns', () => {
    expect(connect(LIST, CHAPTER)).toBe(true);
  });

  it('allows a form of the same class', () => {
    expect(connect(LIST, FORM)).toBe(true);
  });

  it('rejects a form of another class', () => {
    expect(connect(LIST, node(AUTHOR_DETAIL, Operation.Create))).toBe(false);
  });

  it('rejects an operation pair no edge type allows', () => {
    expect(connect(FORM, node(BOOK_FORM, Operation.Update))).toBe(false);
  });

  it('allows a redirect from a form back to the list', () => {
    expect(connect(FORM, LIST)).toBe(true);
  });

  it('rejects a redirect to the detail of another class', () => {
    expect(connect(FORM, AUTHOR)).toBe(false);
  });

  it('rejects a second redirect from a node that already has one', () => {
    const existing: ApplicationEdge = {
      id: 'form-redirect',
      source: FORM.id,
      target: DETAIL.id,
      type: EdgeType.Redirect,
    };
    expect(connect(FORM, LIST, [existing])).toBe(false);
  });

  it('counts only redirects leaving the source node', () => {
    const elsewhere: ApplicationEdge = {
      id: 'author-redirect',
      source: AUTHOR.id,
      target: LIST.id,
      type: EdgeType.Redirect,
    };
    expect(connect(FORM, LIST, [elsewhere])).toBe(true);
  });

  it('allows an edge that duplicates an existing one, which only warns', () => {
    const existing: ApplicationEdge = {
      id: 'list-detail',
      source: LIST.id,
      target: DETAIL.id,
      type: EdgeType.Transition,
    };
    expect(connect(LIST, DETAIL, [existing])).toBe(true);
  });

  it('allows a detail to reach itself, which the rules permit', () => {
    expect(connect(DETAIL, DETAIL)).toBe(true);
  });

  it('rejects a list reaching itself', () => {
    expect(connect(LIST, LIST)).toBe(false);
  });

  it('blocks nothing while the graph itself is not valid', () => {
    const broken = { ...graphOf(), name: '' };
    expect(connectableTargets(broken, LIST, METADATA).has(LIST.id)).toBe(true);
  });

  it('judges what it can without specification metadata', () => {
    const fromForm = connectableTargets(graphOf(), FORM, null);
    expect(fromForm.has(node(BOOK_FORM, Operation.Update).id)).toBe(false);
    expect(connectableTargets(graphOf(), LIST, null).has(DETAIL.id)).toBe(true);
  });
});
