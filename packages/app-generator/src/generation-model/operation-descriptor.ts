import { sortBy } from 'es-toolkit';

import type { ApplicationNode } from '../graph/types.ts';
import { DeletePolicy, Operation } from '../graph/types.ts';
import type {
  GeneratedAggregateDescriptor,
  GeneratedDeleteDescriptor,
  GeneratedDetailDescriptor,
  GeneratedFieldDescriptor,
  GeneratedFormDescriptor,
  GeneratedListDescriptor,
  GeneratedOperationDescriptor,
} from './types.ts';

import { toPageComponentName, toRouteId } from '../utils/naming.ts';

export function buildOperationDescriptor(
  node: ApplicationNode,
  aggregate: GeneratedAggregateDescriptor
): GeneratedOperationDescriptor {
  const pageComponentName = toPageComponentName(node.id);
  const descriptor: GeneratedOperationDescriptor = {
    id: node.id,
    nodeId: node.id,
    aggregateIri: aggregate.iri,
    aggregateName: aggregate.name,
    operation: node.operation,
    routeId: toRouteId(node.id),
    pageComponentName,
    pageTitle: getPageTitle(node, aggregate),
    navigation: {
      pageActions: [],
      rowActions: [],
      associationActions: [],
    },
  };

  if (node.operation === Operation.ReadList) {
    descriptor.list = buildListDescriptor(aggregate.fields);
  }

  if (node.operation === Operation.ReadDetail) {
    descriptor.detail = buildDetailDescriptor(aggregate.fields);
  }

  if (node.operation === Operation.Create || node.operation === Operation.Update) {
    descriptor.form = buildFormDescriptor(aggregate.fields);
  }

  if (node.operation === Operation.Delete) {
    descriptor.delete = buildDeleteDescriptor(node);
  }

  return descriptor;
}

function buildListDescriptor(fields: GeneratedFieldDescriptor[]): GeneratedListDescriptor {
  return {
    columns: sortBy(fields, [(field) => field.path]),
  };
}

function buildDetailDescriptor(fields: GeneratedFieldDescriptor[]): GeneratedDetailDescriptor {
  return {
    fields: sortBy(fields, [(field) => field.path]),
  };
}

function buildFormDescriptor(fields: GeneratedFieldDescriptor[]): GeneratedFormDescriptor {
  return {
    fields: sortBy(fields, [(field) => field.path]),
    placeholder: true,
  };
}

function buildDeleteDescriptor(node: ApplicationNode): GeneratedDeleteDescriptor {
  const cascadePaths = Object.entries(node.config?.delete ?? {})
    .filter(([, value]) => value === DeletePolicy.Cascade)
    .map(([path]) => path)
    .sort((left, right) => left.localeCompare(right));

  return {
    cascadePaths,
    placeholder: true,
  };
}

function getPageTitle(node: ApplicationNode, aggregate: GeneratedAggregateDescriptor): string {
  if (node.config?.pageTitle) {
    return node.config.pageTitle;
  }

  return `${operationLabel(node.operation)} ${aggregate.name}`;
}

function operationLabel(operation: ApplicationNode['operation']): string {
  switch (operation) {
    case Operation.ReadList:
      return 'List';
    case Operation.ReadDetail:
      return 'Detail';
    default:
      return operation;
  }
}
