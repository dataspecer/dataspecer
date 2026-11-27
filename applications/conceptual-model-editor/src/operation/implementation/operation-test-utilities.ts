/**
 * Shared setup for operation tests.
 *
 * This file is for tests only, it is not imported by the operations.
 * It does not import the test framework, so it type checks with the rest
 * of the source code.
 */
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import {
  createDefaultVisualModelFactory,
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualNode,
  Waypoint,
  WritableVisualModel,
} from "@dataspecer/visual-model";

import {
  CmeOperationExecutor,
  CmeOperationExecutorState,
  createCmeOperationExecutor,
} from "../operation-executor";
import { cmeOperations } from "../operations";
import {
  CmeCreateContext,
  CmeOperationArguments,
  CmeOperationResultOf,
} from "../operation";

/**
 * Range which makes a relationship an attribute.
 */
export const STRING_RANGE = "http://www.w3.org/2001/XMLSchema#string";

export interface OperationTestContext {

  semanticModel: InMemorySemanticModel;

  visualModel: WritableVisualModel;

  /**
   * Second visual model, for operations working with two visual models.
   */
  otherVisualModel: WritableVisualModel;

  executor: CmeOperationExecutor;

  createContext: CmeCreateContext;

  /**
   * State of the executor, add models here to make them available
   * to the following executions.
   */
  state: CmeOperationExecutorState;

}

/**
 * One in-memory semantic model, two visual models and an executor
 * with all operations.
 */
export function createOperationTestContext(): OperationTestContext {
  const semanticModel = new InMemorySemanticModel();
  const factory = createDefaultVisualModelFactory();
  const visualModel = factory.createNewWritableVisualModelSync(null);
  const otherVisualModel = factory.createNewWritableVisualModelSync(null);
  const state: CmeOperationExecutorState = {
    entityModels: [semanticModel],
    visualModels: [visualModel, otherVisualModel],
    createNewEntityIdentifier: () => crypto.randomUUID(),
  };
  const executor = createCmeOperationExecutor(cmeOperations, state);
  return {
    semanticModel, visualModel, otherVisualModel, executor,
    createContext: executor.createContext,
    state,
  };
}

/**
 * Add a new in-memory semantic model to the executor state.
 */
export function addSemanticModel(context: OperationTestContext): InMemorySemanticModel {
  const model = new InMemorySemanticModel();
  context.state.entityModels.push(model);
  return model;
}

/**
 * Add a new visual model to the executor state.
 */
export function addVisualModel(context: OperationTestContext): WritableVisualModel {
  const model = createDefaultVisualModelFactory()
    .createNewWritableVisualModelSync(null);
  context.state.visualModels.push(model);
  return model;
}

/**
 * External semantic model which records calls instead of querying a source.
 */
export function addFakeExternalSemanticModel(context: OperationTestContext): {
  model: ExternalSemanticModel,
  calls: string[],
} {
  const calls: string[] = [];
  const observable = {
    addQuery: async (query: string) => { calls.push(`add ${query}`); },
    releaseQuery: async (query: string) => { calls.push(`release ${query}`); },
    getEntities: () => ({}),
    subscribeToChanges: () => () => { },
  };
  type Parameters = ConstructorParameters<typeof ExternalSemanticModel>;
  const model = new ExternalSemanticModel(
    {} as Parameters[0], observable as unknown as Parameters[1]);
  context.state.entityModels.push(model);
  return { model, calls };
}

/**
 * Executes the operation and throws when it reports an exception,
 * so the test fails.
 */
export async function run<ArgumentType extends CmeOperationArguments>(
  context: OperationTestContext, args: ArgumentType,
): Promise<CmeOperationResultOf<ArgumentType>> {
  const result = await context.executor.execute(args);
  if (result.exception !== undefined) {
    throw result.exception;
  }
  return result;
}

/**
 * @returns Identifier of the created class.
 */
export async function createClass(
  context: OperationTestContext, name: string,
  options: { model?: InMemorySemanticModel } = {},
): Promise<string> {
  const model = options.model ?? context.semanticModel;
  const result = await run(context, cmeOperations.createSemanticClass.create(context.createContext, {
    semanticModel: model.getId(),
    iri: name,
    name: { en: name },
    description: null,
    externalDocumentationUrl: null,
    order: null,
  }));
  return result.created;
}

/**
 * Use {@link STRING_RANGE} as a range to create an attribute.
 *
 * @returns Identifier of the created relationship.
 */
export async function createRelationship(
  context: OperationTestContext, domain: string, range: string, iri: string,
): Promise<string> {
  const result = await run(context, cmeOperations.createSemanticRelationship.create(context.createContext, {
    semanticModel: context.semanticModel.getId(),
    iri,
    name: null,
    description: null,
    domain,
    domainCardinality: null,
    range,
    rangeCardinality: null,
    externalDocumentationUrl: null,
    order: null,
  }));
  return result.created;
}

/**
 * @returns Identifier of the created generalization.
 */
export async function createGeneralization(
  context: OperationTestContext, child: string, parent: string,
): Promise<string> {
  const result = await run(context, cmeOperations.createSemanticGeneralization.create(context.createContext, {
    semanticModel: context.semanticModel.getId(),
    iri: null,
    child,
    parent,
  }));
  return result.created;
}

/**
 * @returns Identifier of the created class profile.
 */
export async function createClassProfile(
  context: OperationTestContext, profileOf: string,
): Promise<string> {
  const result = await run(context, cmeOperations.createProfileClass.create(context.createContext, {
    profileModel: context.semanticModel.getId(),
    profileOf: [profileOf],
    iri: null,
    name: null,
    nameSource: profileOf,
    description: null,
    descriptionSource: profileOf,
    usageNote: null,
    usageNoteSource: null,
    externalDocumentationUrl: null,
    tags: [],
    order: null,
  }));
  return result.created;
}

/**
 * Show the class in {@link OperationTestContext.visualModel}.
 *
 * @returns The created visual node.
 */
export async function showClass(
  context: OperationTestContext, entity: string, x: number,
): Promise<VisualNode> {
  const result = await run(context, cmeOperations.showSemanticClass.create(context.createContext, {
    visualModel: context.visualModel.getId(),
    entity,
    x,
    y: 0,
  }));
  return getVisualNode(context.visualModel, result.created);
}

/**
 * Show the class profile in {@link OperationTestContext.visualModel}.
 *
 * @returns The created visual node.
 */
export async function showClassProfile(
  context: OperationTestContext, entity: string, x: number,
): Promise<VisualNode> {
  const result = await run(context, cmeOperations.showProfileClass.create(context.createContext, {
    visualModel: context.visualModel.getId(),
    entity,
    x,
    y: 300,
  }));
  return getVisualNode(context.visualModel, result.created);
}

/**
 * Show the relationship in {@link OperationTestContext.visualModel}.
 */
export async function showRelationship(
  context: OperationTestContext, entity: string,
): Promise<void> {
  await run(context, cmeOperations.showRelationship.create(context.createContext, {
    visualModel: context.visualModel.getId(),
    entity,
  }));
}

/**
 * @returns Current state of the visual node, not a stale copy.
 */
export function getVisualNode(
  visualModel: WritableVisualModel, identifier: string,
): VisualNode {
  return visualModel.getVisualEntity(identifier) as VisualNode;
}

export function visualRelationships(visualModel: WritableVisualModel) {
  return [...visualModel.getVisualEntities().values()]
    .filter(isVisualRelationship);
}

export function visualProfileRelationships(visualModel: WritableVisualModel) {
  return [...visualModel.getVisualEntities().values()]
    .filter(isVisualProfileRelationship);
}

/**
 * @returns Identifier of the created attribute.
 */
export function createAttribute(
  context: OperationTestContext, domain: string, iri: string,
): Promise<string> {
  return createRelationship(context, domain, STRING_RANGE, iri);
}

//
// Raw visual builders.
//
// They write directly into the visual model, no operation is executed
// and nothing else is added. Use them to set up the visual state,
// so a test does not depend on other operations.
//

interface VisualOptions {

  /**
   * Defaults to {@link OperationTestContext.visualModel}.
   */
  visualModel?: WritableVisualModel;

  /**
   * Model of the represented entity,
   * defaults to {@link OperationTestContext.semanticModel}.
   */
  model?: string;

}

/**
 * @returns Identifier of the created visual node.
 */
export function addNode(
  context: OperationTestContext,
  entity: string,
  options: VisualOptions & { x?: number, y?: number, content?: string[] } = {},
): string {
  const visualModel = options.visualModel ?? context.visualModel;
  return visualModel.addVisualNode({
    model: options.model ?? context.semanticModel.getId(),
    representedEntity: entity,
    position: { x: options.x ?? 0, y: options.y ?? 0, anchored: null },
    content: options.content ?? [],
    visualModels: [],
  });
}

/**
 * Visual relationship for a relationship, relationship profile
 * or generalization.
 *
 * @returns Identifier of the created visual relationship.
 */
export function addEdge(
  context: OperationTestContext,
  entity: string,
  visualSource: string,
  visualTarget: string,
  options: VisualOptions & { waypoints?: Waypoint[] } = {},
): string {
  const visualModel = options.visualModel ?? context.visualModel;
  return visualModel.addVisualRelationship({
    model: options.model ?? context.semanticModel.getId(),
    representedRelationship: entity,
    visualSource,
    visualTarget,
    waypoints: options.waypoints ?? [],
  });
}

/**
 * Visual profile relationship from the node of a class profile
 * to the node of the profiled entity.
 *
 * @returns Identifier of the created visual profile relationship.
 */
export function addProfileEdge(
  context: OperationTestContext,
  profile: string,
  visualSource: string,
  visualTarget: string,
  options: VisualOptions = {},
): string {
  const visualModel = options.visualModel ?? context.visualModel;
  return visualModel.addVisualProfileRelationship({
    model: options.model ?? context.semanticModel.getId(),
    entity: profile,
    visualSource,
    visualTarget,
    waypoints: [],
  });
}

/**
 * @returns Identifier of the created visual diagram node.
 */
export function addDiagramNode(
  context: OperationTestContext,
  representedVisualModel: string,
  options: { visualModel?: WritableVisualModel, x?: number, y?: number } = {},
): string {
  const visualModel = options.visualModel ?? context.visualModel;
  return visualModel.addVisualDiagramNode({
    position: { x: options.x ?? 0, y: options.y ?? 0, anchored: null },
    representedVisualModel,
  });
}
