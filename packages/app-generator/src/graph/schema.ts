import type { SchemaObject } from 'ajv';

import { AssociationKind, DatasourceType, DeletePolicy, EdgeType, Operation } from './types.ts';

const configSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    pageTitle: {
      type: 'string',
      minLength: 1,
      nullable: true,
    },
    associations: {
      type: 'object',
      additionalProperties: {
        type: 'string',
        enum: Object.values(AssociationKind),
      },
      nullable: true,
    },
    delete: {
      type: 'object',
      additionalProperties: {
        type: 'string',
        enum: Object.values(DeletePolicy),
      },
      nullable: true,
    },
  },
} as const;

export const applicationGraphSchema: SchemaObject = {
  $id: 'https://dataspecer.com/application-prototype-generator/application-graph.schema.json',
  type: 'object',
  additionalProperties: false,
  required: ['name', 'dataSpecificationIri', 'datasources', 'nodes', 'edges'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
    },
    dataSpecificationIri: {
      type: 'string',
      minLength: 1,
    },
    datasources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'endpoint'],
        properties: {
          id: {
            type: 'string',
            minLength: 1,
          },
          type: {
            type: 'string',
            enum: Object.values(DatasourceType),
          },
          endpoint: {
            type: 'string',
            format: 'uri',
          },
        },
      },
    },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'aggregateIri', 'operation'],
        properties: {
          id: {
            type: 'string',
            minLength: 1,
          },
          aggregateIri: {
            type: 'string',
            minLength: 1,
          },
          operation: {
            type: 'string',
            enum: Object.values(Operation),
          },
          config: {
            ...configSchema,
            nullable: true,
          },
        },
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'source', 'target', 'type'],
        properties: {
          id: {
            type: 'string',
            minLength: 1,
          },
          source: {
            type: 'string',
            minLength: 1,
          },
          target: {
            type: 'string',
            minLength: 1,
          },
          type: {
            type: 'string',
            enum: Object.values(EdgeType),
          },
        },
      },
    },
  },
};
