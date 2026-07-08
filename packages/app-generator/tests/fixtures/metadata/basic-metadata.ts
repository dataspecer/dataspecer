import { type DataspecerSpecificationMetadata, FieldKind } from '../../../src/metadata/types.ts';

export const specificationIri = 'https://example.org/specification/library';

export const basicMetadata: DataspecerSpecificationMetadata = {
  dataSpecificationIri: specificationIri,
  aggregates: [
    {
      iri: 'https://example.org/aggregate/book-list',
      name: 'BookList',
      classIri: 'https://example.org/class/book',
      fields: [
        {
          path: 'title',
          label: 'Title',
          kind: FieldKind.Primitive,
          datatype: 'string',
        },
        {
          path: 'author',
          label: 'Author',
          kind: FieldKind.Association,
          targetAggregateIri: 'https://example.org/aggregate/author-detail',
          targetClassIri: 'https://example.org/class/author',
        },
      ],
    },
    {
      iri: 'https://example.org/aggregate/book-detail',
      name: 'BookDetail',
      classIri: 'https://example.org/class/book',
      fields: [
        {
          path: 'title',
          label: 'Title',
          kind: FieldKind.Primitive,
          datatype: 'string',
        },
        {
          path: 'chapters',
          label: 'Chapters',
          kind: FieldKind.Association,
          targetAggregateIri: 'https://example.org/aggregate/chapter-detail',
          targetClassIri: 'https://example.org/class/chapter',
          many: true,
        },
        {
          path: 'author',
          label: 'Author',
          kind: FieldKind.Association,
          targetAggregateIri: 'https://example.org/aggregate/author-detail',
          targetClassIri: 'https://example.org/class/author',
        },
      ],
    },
    {
      iri: 'https://example.org/aggregate/book-form',
      name: 'BookForm',
      classIri: 'https://example.org/class/book',
      fields: [
        {
          path: 'title',
          label: 'Title',
          kind: FieldKind.Primitive,
          datatype: 'string',
        },
      ],
    },
    {
      iri: 'https://example.org/aggregate/author-detail',
      name: 'AuthorDetail',
      classIri: 'https://example.org/class/author',
      fields: [
        {
          path: 'name',
          label: 'Name',
          kind: FieldKind.Primitive,
          datatype: 'string',
        },
      ],
    },
    {
      iri: 'https://example.org/aggregate/chapter-detail',
      name: 'ChapterDetail',
      classIri: 'https://example.org/class/chapter',
      fields: [
        {
          path: 'name',
          label: 'Name',
          kind: FieldKind.Primitive,
          datatype: 'string',
        },
        {
          path: 'editor',
          label: 'Editor',
          kind: FieldKind.Association,
          targetAggregateIri: 'https://example.org/aggregate/author-detail',
          targetClassIri: 'https://example.org/class/author',
        },
        {
          path: 'footnotes',
          label: 'Footnotes',
          kind: FieldKind.Association,
          targetAggregateIri: 'https://example.org/aggregate/footnote-detail',
          targetClassIri: 'https://example.org/class/footnote',
          many: true,
        },
      ],
    },
    {
      iri: 'https://example.org/aggregate/footnote-detail',
      name: 'FootnoteDetail',
      classIri: 'https://example.org/class/footnote',
      fields: [
        {
          path: 'text',
          label: 'Text',
          kind: FieldKind.Primitive,
          datatype: 'string',
        },
      ],
    },
  ],
};
