import type {
  GeneratedFieldDescriptor,
  GeneratedOperationDescriptor,
  GenerationModel,
} from '../generation-model/types.ts';
import type { RenderedAggregate } from './rendered-aggregate.ts';

import { toOperationClassName } from '../utils/naming.ts';
import { toRenderedAggregate } from './rendered-aggregate.ts';

export interface GeneratedAppRenderContext {
  model: GenerationModel;
  aggregates: RenderedAggregate[];
  pages: RenderedPage[];
  /** Base IRI Create forms prefill when generating a new entity IRI. Empty when none derivable. */
  instanceBaseIri: string;
  json: (value: unknown) => string;
}

export interface RenderedPage {
  fileName: string;
  componentName: string;
  moduleName: string;
  modelName: string;
  operationClassName: string;
  operation: GeneratedOperationDescriptor;
}

export function buildRenderContext(model: GenerationModel): GeneratedAppRenderContext {
  const usedAggregateIris = new Set(model.operations.map((operation) => operation.aggregateIri));
  const aggregateByIri = new Map(model.aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const pending = [...usedAggregateIris];
  while (pending.length > 0) {
    const aggregateIri = pending.pop() as string;
    const aggregate = aggregateByIri.get(aggregateIri);
    if (!aggregate) {
      continue;
    }
    for (const targetIri of referencedAggregateIris(aggregate.fields)) {
      if (!usedAggregateIris.has(targetIri)) {
        usedAggregateIris.add(targetIri);
        pending.push(targetIri);
      }
    }
  }

  // Referenced targets need descriptors even when they have no operation of their own.
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
        operationClassName: toOperationClassName(operation.nodeId),
        operation,
      };
    }),
    json: (value) => JSON.stringify(value, null, 2),
  };
}

function referencedAggregateIris(fields: GeneratedFieldDescriptor[]): string[] {
  return fields.flatMap((field) => [
    ...(field.targetAggregateIri ? [field.targetAggregateIri] : []),
    ...(field.fields ? referencedAggregateIris(field.fields) : []),
  ]);
}

// Base IRI for generating new entity IRIs in Create forms. A data specification IRI that is a real
// absolute IRI is reused as the base, with any trailing separators trimmed. Anything else, such
// as a bare identifier, yields an empty base and the form falls back to a urn:uuid IRI.
function toInstanceBaseIri(dataSpecificationIri: string): string {
  const isAbsoluteIri = /^[a-z][a-z0-9+.-]*:/i.test(dataSpecificationIri);
  return isAbsoluteIri ? dataSpecificationIri.replace(/[#/]+$/, '') : '';
}
