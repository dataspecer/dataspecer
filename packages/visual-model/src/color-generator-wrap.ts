import { ColorGenerator, createColorGenerator } from "./color-generator.ts";
import { ModelIdentifier } from "./entity-model/entity-model.ts";
import { EntityIdentifier } from "./entity-model/entity.ts";
import { LanguageString } from "./entity-model/labeled-model.ts";
import { UnsubscribeCallback } from "./entity-model/observable-entity-model.ts";
import {
  VisualNode, VisualDiagramNode, VisualRelationship,
  VisualProfileRelationship, VisualGroup, VisualEntity,
  HexColor, VisualView, RepresentedEntityIdentifier, VisualModelData,
} from "./concepts/index.ts";
import { VisualModelDataVersion, VisualModelListener } from "./visual-model.ts";
import { WritableVisualModel } from "./writable-visual-model.ts";

const colorGenerator: ColorGenerator = createColorGenerator();

class WrappedModel implements WritableVisualModel {

  model: WritableVisualModel;

  constructor(model: WritableVisualModel) {
    this.model = model;
  }

  addVisualNode(entity: Omit<VisualNode, "identifier" | "type">): string {
    return this.model.addVisualNode(entity);
  }

  addVisualDiagramNode(
    entity: Omit<VisualDiagramNode, "identifier" | "type">): string {
    return this.model.addVisualDiagramNode(entity);
  }

  addVisualRelationship(
    entity: Omit<VisualRelationship, "identifier" | "type">): string {
    return this.model.addVisualRelationship(entity);
  }

  addVisualProfileRelationship(
    entity: Omit<VisualProfileRelationship, "identifier" | "type">): string {
    return this.model.addVisualProfileRelationship(entity);
  }

  addVisualGroup(entity: Omit<VisualGroup, "identifier" | "type">): string {
    return this.model.addVisualGroup(entity);
  }

  updateVisualEntity<T extends VisualEntity>(
    identifier: EntityIdentifier,
    entity: Partial<Omit<T, "identifier" | "type">>): void {
    this.model.updateVisualEntity(identifier, entity);
  }

  deleteVisualEntity(identifier: EntityIdentifier): void {
    this.model.deleteVisualEntity(identifier);
  }

  setModelColor(identifier: ModelIdentifier, color: HexColor): void {
    this.model.setModelColor(identifier, color);
  }

  deleteModelColor(identifier: ModelIdentifier): void {
    this.model.deleteModelColor(identifier);
  }

  deleteModelData(identifier: ModelIdentifier): void {
    this.model.deleteModelData(identifier);
  }

  setView(view: Omit<VisualView, "identifier" | "type">): void {
    this.model.setView(view);
  }

  getIdentifier(): ModelIdentifier {
    return this.model.getIdentifier();
  }

  getVisualEntity(identifier: EntityIdentifier): VisualEntity | null {
    return this.model.getVisualEntity(identifier);
  }

  getVisualEntitiesForRepresented(represented: RepresentedEntityIdentifier): VisualEntity[] {
    return this.model.getVisualEntitiesForRepresented(represented);
  }

  hasVisualEntityForRepresented(represented: RepresentedEntityIdentifier): boolean {
    return this.model.hasVisualEntityForRepresented(represented);
  }

  getVisualEntities(): Map<EntityIdentifier, VisualEntity> {
    return this.model.getVisualEntities();
  }

  subscribeToChanges(listener: VisualModelListener): UnsubscribeCallback {
    return this.model.subscribeToChanges(listener);
  }

  getModelColor(identifier: ModelIdentifier): HexColor | null {
    const stored = this.model.getModelColor(identifier);
    if (stored === null) {
      return colorGenerator.generateModelColor(identifier);
    } else {
      return stored;
    }
  }

  getModelsData(): Map<ModelIdentifier, VisualModelData> {
    return this.model.getModelsData();
  }

  getInitialModelVersion(): VisualModelDataVersion {
    return this.model.getInitialModelVersion();
  }

  getVisualView(): VisualView | null {
    return this.model.getVisualView();
  }

  getTypes(): string[] {
    return this.model.getTypes();
  }

  getId(): string {
    return this.model.getIdentifier();
  }

  serializeModel(): object {
    return this.model.serializeModel();
  }

  deserializeModel(value: object): this {
    this.model.deserializeModel(value);
    return this;
  }

  getLabel(): LanguageString | null {
    return this.model.getLabel();
  }

  setLabel(label: LanguageString | null): void {
    this.model.setLabel(label);
  }

}

/**
 * Add {@link ColorGenerator} to {@link WritableVisualModel} to generate
 * missing model colors.
 */
export function wrapWithColorGenerator(
  visualModel: WritableVisualModel,
): WritableVisualModel {
  return new WrappedModel(visualModel);
}
