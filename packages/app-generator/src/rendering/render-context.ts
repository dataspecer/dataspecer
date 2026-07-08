import type { GeneratedOperationDescriptor, GenerationModel } from '../generation-model/types.ts';
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
  // Only aggregates used by a node produce a module. Association targets are inlined or rendered
  // as reference IRIs, so an aggregate without an operation would generate an unused module.
  const usedAggregateIris = new Set(model.operations.map((operation) => operation.aggregateIri));
  const aggregates = model.aggregates
    .filter((aggregate) => usedAggregateIris.has(aggregate.iri))
    .map(toRenderedAggregate);
  const aggregateByIri = new Map(aggregates.map((aggregate) => [aggregate.iri, aggregate]));

  return {
    model,
    aggregates,
    instanceBaseIri: toInstanceBaseIri(model.app.dataSpecificationIri),
    pages: model.operations.map((operation) => {
      const aggregate = aggregateByIri.get(operation.aggregateIri);
      if (!aggregate) {
        throw new Error(`Missing aggregate render context for "${operation.aggregateIri}".`);
      }

      return {
        fileName: `${operation.pageComponentName}.tsx`,
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

// Base IRI for generating new entity IRIs in Create forms. A data specification IRI that is a real
// absolute IRI is reused as the base, with any trailing separators trimmed. Anything else, such
// as a bare identifier, yields an empty base and the form falls back to a urn:uuid IRI.
function toInstanceBaseIri(dataSpecificationIri: string): string {
  const isAbsoluteIri = /^[a-z][a-z0-9+.-]*:/i.test(dataSpecificationIri);
  return isAbsoluteIri ? dataSpecificationIri.replace(/[#/]+$/, '') : '';
}
