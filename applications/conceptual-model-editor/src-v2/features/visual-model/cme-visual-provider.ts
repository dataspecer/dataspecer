import { ModelIdentifier } from "@dataspecer/core/model";
import {
  isModelVisualInformation,
  isVisualDiagramNode,
  isVisualGroup,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  isVisualView,
  VisualDiagramNode, VisualGroup, VisualModelData, VisualNode,
  VisualProfileRelationship, VisualRelationship, VisualView,
} from "@dataspecer/visual-model";
import { Logger } from "../../infrastructure/logger";
import { SubscriptionManager } from "../../shared/subscription-manager";
import {
  CmeProvider, EventToStateUpdate, selectStable, StateUpdate, UpdateArray,
} from "../../core/cme-provider";
import { Entity, EntityIdentifier } from "@dataspecer/core/entity-model";
import { EntitiesChangeEvent } from "../../infrastructure/dataspecer";

export function createCmeVisualProvider(
  { logger }: { logger: Logger },
): CmeVisualProvider {
  return new DefaultCmeVisualProvider(logger);
}

export interface CmeVisualProvider extends CmeProvider {

  onEntitiesDidChange(event: EntitiesChangeEvent): void;

  subscribe(subscriber: (value: CmeVisualEvent) => void): () => void;

}

const CME_VISUAL_STATE_TYPE = "cme-visual-provider-state";

export interface CmeVisualEvent {

  type: typeof CME_VISUAL_STATE_TYPE;

  models: { [model: ModelIdentifier]: CmeVisualModel };

}

export function isCmeVisualEvent(
  value: { type: string },
): value is CmeVisualEvent {
  return value.type === CME_VISUAL_STATE_TYPE;
}

export interface CmeVisualModel {

  diagrams: VisualDiagramNode[];

  groups: VisualGroup[];

  models: VisualModelData[];

  nodes: VisualNode[];

  profileEdge: VisualProfileRelationship[];

  relationshipEdge: VisualRelationship[];

  views: VisualView[];

  /**
   * Identifiers of visual entities (nodes/edges) representing a given
   * semantic entity within this visual model.
   */
  representedEntities: { [entity: EntityIdentifier]: EntityIdentifier[] };

  /**
   * Explicit colors assigned to semantic models, as configured on this
   * visual model. Falls back to a generated color when missing.
   */
  colors: { [model: ModelIdentifier]: string };

}

function createEmptyCmeVisualModel(): CmeVisualModel {
  return {
    diagrams: [],
    groups: [],
    models: [],
    nodes: [],
    profileEdge: [],
    relationshipEdge: [],
    views: [],
    representedEntities: {},
    colors: {},
  };
}

class DefaultCmeVisualProvider implements CmeVisualProvider {

  private state: CmeVisualEvent = { type: CME_VISUAL_STATE_TYPE, models: {} };

  private readonly logger: Logger;

  private readonly subscribers = new SubscriptionManager<CmeVisualEvent>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  onEntitiesDidChange(event: EntitiesChangeEvent) {
    const update = new CmeVisualUpdate(this.state);
    (new EventToStateUpdate(update)).onEntitiesDidChange(event);
    // Update state.
    const next = update.state();
    if (next === this.state) {
      return;
    }
    this.state = next;
    // Notify listeners about a new state.
    this.subscribers.notifyAll(this.state);
  }

  subscribe(subscriber: (value: CmeVisualEvent) => void): () => void {
    return this.subscribers.subscribe(subscriber);
  }

}

class CmeVisualModelUpdate {

  readonly previous: CmeVisualModel;

  readonly diagrams: UpdateArray<VisualDiagramNode>;

  readonly groups: UpdateArray<VisualGroup>;

  readonly models: UpdateArray<VisualModelData>;

  readonly nodes: UpdateArray<VisualNode>;

  readonly profileEdge: UpdateArray<VisualProfileRelationship>;

  readonly relationshipEdge: UpdateArray<VisualRelationship>;

  readonly views: UpdateArray<VisualView>;

  /** Represented-entity changes not covered by the generic UpdateArrays. */
  private representedEntitiesDirty = false;

  private removedVisualIds: EntityIdentifier[] = [];

  private addedRepresentations: { entity: EntityIdentifier, visual: EntityIdentifier }[] = [];

  constructor(previous: CmeVisualModel) {
    this.previous = previous;
    this.diagrams = new UpdateArray(previous.diagrams);
    this.groups = new UpdateArray(previous.groups);
    this.models = new UpdateArray(previous.models);
    this.nodes = new UpdateArray(previous.nodes);
    this.profileEdge = new UpdateArray(previous.profileEdge);
    this.relationshipEdge = new UpdateArray(previous.relationshipEdge);
    this.views = new UpdateArray(previous.views);
  }

  onCreateEntity(next: Entity): void {
    if (isVisualDiagramNode(next)) {
      this.diagrams.onCreateEntity(next);
    } else if (isVisualGroup(next)) {
      this.groups.onCreateEntity(next);
    } else if (isModelVisualInformation(next)) {
      this.models.onCreateEntity(next);
    } else if (isVisualNode(next)) {
      this.nodes.onCreateEntity(next);
      this.addedRepresentations.push({ entity: next.representedEntity, visual: next.id });
      this.representedEntitiesDirty = true;
    } else if (isVisualProfileRelationship(next)) {
      this.profileEdge.onCreateEntity(next);
      this.addedRepresentations.push({ entity: next.entity, visual: next.id });
      this.representedEntitiesDirty = true;
    } else if (isVisualRelationship(next)) {
      this.relationshipEdge.onCreateEntity(next);
      this.addedRepresentations.push({ entity: next.representedRelationship, visual: next.id });
      this.representedEntitiesDirty = true;
    } else if (isVisualView(next)) {
      this.views.onCreateEntity(next);
    }
  }

  onUpdateEntity(previous: Entity, next: Entity): void {
    if (isVisualDiagramNode(next)) {
      this.diagrams.onUpdateEntity(next);
    } else if (isVisualGroup(next)) {
      this.groups.onUpdateEntity(next);
    } else if (isModelVisualInformation(next)) {
      this.models.onUpdateEntity(next);
    } else if (isVisualNode(next)) {
      this.nodes.onUpdateEntity(next);
    } else if (isVisualProfileRelationship(next)) {
      this.profileEdge.onUpdateEntity(next);
    } else if (isVisualRelationship(next)) {
      this.relationshipEdge.onUpdateEntity(next);
    } else if (isVisualView(next)) {
      this.views.onUpdateEntity(next);
    }
  }

  onRemoveEntity(previous: Entity): void {
    if (isVisualDiagramNode(previous)) {
      this.diagrams.onRemoveEntityById(previous.id);
    } else if (isVisualGroup(previous)) {
      this.groups.onRemoveEntityById(previous.id);
    } else if (isModelVisualInformation(previous)) {
      this.models.onRemoveEntityById(previous.id);
    } else if (isVisualNode(previous)) {
      this.nodes.onRemoveEntityById(previous.id);
      this.removedVisualIds.push(previous.id);
      this.representedEntitiesDirty = true;
    } else if (isVisualProfileRelationship(previous)) {
      this.profileEdge.onRemoveEntityById(previous.id);
      this.removedVisualIds.push(previous.id);
      this.representedEntitiesDirty = true;
    } else if (isVisualRelationship(previous)) {
      this.relationshipEdge.onRemoveEntityById(previous.id);
      this.removedVisualIds.push(previous.id);
      this.representedEntitiesDirty = true;
    } else if (isVisualView(previous)) {
      this.views.onRemoveEntityById(previous.id);
    }
  }

  private updateRepresentedEntities(): { [entity: EntityIdentifier]: EntityIdentifier[] } {
    if (!this.representedEntitiesDirty) {
      return this.previous.representedEntities;
    }
    const result: { [entity: EntityIdentifier]: EntityIdentifier[] } = {};
    for (const [entity, visuals] of Object.entries(this.previous.representedEntities)) {
      const kept = visuals.filter(id => !this.removedVisualIds.includes(id));
      if (kept.length > 0) {
        result[entity] = kept;
      }
    }
    for (const { entity, visual } of this.addedRepresentations) {
      result[entity] = [...(result[entity] ?? []), visual];
    }
    return result;
  }

  private updateColors(): { [model: ModelIdentifier]: string } {
    const models = this.models.state();
    if (models === this.previous.models) {
      return this.previous.colors;
    }
    const colors: { [model: ModelIdentifier]: string } = {};
    for (const item of models) {
      if (item.representedModel !== null && item.color !== null) {
        colors[item.representedModel] = item.color;
      }
    }
    return colors;
  }

  state(): CmeVisualModel {
    const next: CmeVisualModel = {
      diagrams: this.diagrams.state(),
      groups: this.groups.state(),
      models: this.models.state(),
      nodes: this.nodes.state(),
      profileEdge: this.profileEdge.state(),
      relationshipEdge: this.relationshipEdge.state(),
      views: this.views.state(),
      representedEntities: this.updateRepresentedEntities(),
      colors: this.updateColors(),
    };
    return selectStable(this.previous, next);
  }

}

class CmeVisualUpdate implements StateUpdate<CmeVisualEvent> {

  readonly previous: CmeVisualEvent;

  private readonly modelUpdates = new Map<ModelIdentifier, CmeVisualModelUpdate>();

  private readonly removedModels: ModelIdentifier[] = [];

  constructor(state: CmeVisualEvent) {
    this.previous = state;
  }

  private getOrCreateModelUpdate(model: ModelIdentifier): CmeVisualModelUpdate {
    let result = this.modelUpdates.get(model);
    if (result === undefined) {
      const previousModel = this.previous.models[model] ?? createEmptyCmeVisualModel();
      result = new CmeVisualModelUpdate(previousModel);
      this.modelUpdates.set(model, result);
    }
    return result;
  }

  onCreateEntity(model: ModelIdentifier, next: Entity): void {
    this.getOrCreateModelUpdate(model).onCreateEntity(next);
  }

  onUpdateEntity(model: ModelIdentifier, previous: Entity, next: Entity): void {
    this.getOrCreateModelUpdate(model).onUpdateEntity(previous, next);
  }

  onRemoveEntity(model: ModelIdentifier, previous: Entity): void {
    this.getOrCreateModelUpdate(model).onRemoveEntity(previous);
  }

  state(): CmeVisualEvent {
    if (this.modelUpdates.size === 0 && this.removedModels.length === 0) {
      return this.previous;
    }
    const models = { ...this.previous.models };
    for (const [model, update] of this.modelUpdates) {
      models[model] = update.state();
    }
    for (const model of this.removedModels) {
      delete models[model];
    }
    const next: CmeVisualEvent = { ...this.previous, models };
    return selectStable(this.previous, next);
  }

}
