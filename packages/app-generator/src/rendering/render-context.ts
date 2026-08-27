import { Operation } from '../graph/types.ts';
import type { GeneratedOperationDescriptor, GenerationModel } from '../generation-model/types.ts';
import type { RenderedAggregate } from './rendered-aggregate.ts';

import { collectReachableAggregateIris } from '../generation-model/aggregate-reachability.ts';
import { toOperationClassName, toPageActionsComponentName } from '../utils/naming.ts';
import { toRenderedAggregate } from './rendered-aggregate.ts';

export interface GeneratedAppRenderContext {
  model: GenerationModel;
  aggregates: RenderedAggregate[];
  pages: RenderedPage[];
  /** Base IRI prefilled by create forms, empty when unavailable. */
  instanceBaseIri: string;
  json: (value: unknown) => string;
}

export interface RenderedPage {
  fileName: string;
  componentName: string;
  moduleName: string;
  modelName: string;
  descriptorName: string;
  operationClassName: string;
  pageActionsComponentName: string;
  strategyBaseName: string;
  strategyModuleName: string;
  resultTypeName: string;
  operation: GeneratedOperationDescriptor;
}

const STRATEGY: Record<Operation, { className: string; moduleName: string }> = {
  [Operation.ReadList]: { className: 'DefaultReadListStrategy', moduleName: 'read-list-strategy' },
  [Operation.ReadDetail]: {
    className: 'DefaultReadDetailStrategy',
    moduleName: 'read-detail-strategy',
  },
  [Operation.Create]: { className: 'DefaultCreateStrategy', moduleName: 'create-strategy' },
  [Operation.Update]: { className: 'DefaultUpdateStrategy', moduleName: 'update-strategy' },
  [Operation.Delete]: { className: 'DefaultDeleteStrategy', moduleName: 'delete-strategy' },
};

function resultTypeName(operation: Operation, modelName: string): string {
  if (operation === Operation.ReadList) {
    return `ReadListResult<${modelName}>`;
  }
  return operation === Operation.Delete ? 'void' : modelName;
}

export function buildRenderContext(model: GenerationModel): GeneratedAppRenderContext {
  const usedAggregateIris = collectReachableAggregateIris(
    model.operations.map((operation) => operation.aggregateIri),
    model.aggregates,
  );

  // referenced targets need descriptors even when they have no operation of their own
  const aggregates = model.aggregates
    .filter((aggregate) => usedAggregateIris.has(aggregate.iri))
    .map(toRenderedAggregate);
  const renderedAggregateByIri = new Map(aggregates.map((aggregate) => [aggregate.iri, aggregate]));

  return {
    model,
    aggregates,
    instanceBaseIri: toInstanceBaseIri(model.app.dataSpecificationIri),
    pages: model.operations.map((operation) => {
      const aggregate = renderedAggregateByIri.get(operation.aggregateIri);
      if (!aggregate) {
        throw new Error(`Missing aggregate render context for "${operation.aggregateIri}".`);
      }

      return {
        fileName: `${operation.routeId}-page.tsx`,
        componentName: operation.pageComponentName,
        moduleName: aggregate.moduleName,
        modelName: aggregate.modelName,
        descriptorName: aggregate.descriptorName,
        operationClassName: toOperationClassName(operation.id),
        pageActionsComponentName: toPageActionsComponentName(operation.id),
        strategyBaseName: STRATEGY[operation.operation].className,
        strategyModuleName: STRATEGY[operation.operation].moduleName,
        resultTypeName: resultTypeName(operation.operation, aggregate.modelName),
        operation,
      };
    }),
    json: (value) => JSON.stringify(value, null, 2),
  };
}

// reuse an absolute specification IRI as the create-form base, otherwise forms generate urn:uuid IRIs
function toInstanceBaseIri(dataSpecificationIri: string): string {
  const isAbsoluteIri = /^[a-z][a-z0-9+.-]*:/i.test(dataSpecificationIri);
  return isAbsoluteIri ? dataSpecificationIri.replace(/[#/]+$/, '') : '';
}
