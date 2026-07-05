import {
  ModelEntityV1, VisualEntityV1, VisualModelDataV1, VisualModelSerializationV1, VisualNodeV1, VisualRelationshipV1,
} from "./serialization-v1-to-v2.ts";

/**
 * This is how data were stored in the initial version of the visual model.
 */
interface VisualModelSerializationV0 {

  type: "http://dataspecer.com/resources/local/visual-model";

  modelId: string;

  modelAlias?: string;

  visualEntities: Record<string, VisualEntityV0>;

  modelColors: Record<string, string>;

}

/**
 * There used to be only one entity as a visual representation.
 */
interface VisualEntityV0 {

  id: string;

  type: string[];

  sourceEntityId: string;

  visible: boolean | undefined;

  position: { x: number, y: number };

  hiddenAttributes: [];

}

const VISUAL_ENTITY_V0_TYPE = "visual-entity";

/**
 * Used for migration as the model can not be determined from the
 * visual model alone in version 0.
 */
const UNKNOWN_MODEL = "unknown-model";

/**
 * Used for migration as the visual entity can not be determined from the
 * visual model alone in version 0.
 */
const UNKNOWN_ENTITY = "unknown-entity";

export function isVisualModelSerializationV0(
  what: any,
): what is VisualModelSerializationV0 {
  return what.modelColors !== undefined
    || what.visualEntities !== undefined;
}

export function visualModelSerializationV0ToV2(
  serialization: VisualModelSerializationV0,
): VisualModelSerializationV1 {
  const entities: VisualEntityV1[] = [];
  // We start with existing entities.
  for (const entity of Object.values(serialization.visualEntities)) {
    if (!entity.type.includes(VISUAL_ENTITY_V0_TYPE)) {
      console.error("Removing unknown visual entity.", { entity });
      continue;
    }
    if (entity.visible === false) {
      // We removed hidden entities.
      continue;
    }
    // An entity can represent a node or an edge.
    // The best to tell the difference is using a position.
    const isNode = entity.position.x === Math.ceil(entity.position.x) &&
      entity.position.y === Math.ceil(entity.position.y);
    if (isNode) {
      const migrated: VisualNodeV1 = {
        identifier: entity.id,
        type: ["visual-node"],
        representedEntity: entity.sourceEntityId,
        model: UNKNOWN_MODEL,
        content: [],
        visualModels: [],
        position: { ...entity.position, anchored: null },
      };
      entities.push(migrated);
    } else {
      const migrated: VisualRelationshipV1 = {
        identifier: entity.id,
        type: ["visual-relationship"],
        representedRelationship: entity.sourceEntityId,
        model: UNKNOWN_MODEL,
        waypoints: [],
        visualSource: UNKNOWN_ENTITY,
        visualTarget: UNKNOWN_ENTITY,
      };
      entities.push(migrated);
    }
  }
  // Next are model colors.
  if (serialization.modelAlias !== undefined) {
    for (const [model, color] of Object.entries(serialization.modelColors)) {
      const migrated: VisualModelDataV1 = {
        representedModel: model,
        type: ["http://dataspecer.com/resources/local/visual-model"],
        color: color,
        identifier: "model-visual-" + model,
      };
      entities.push(migrated);
    }
  }
  // At the end we add information about model label.
  {
    const migrated: ModelEntityV1 = {
      identifier: "model-data" + serialization.modelId,
      type: ["entity-model-type"],
      label: { "en": serialization.modelAlias ?? "Anonymous model" },
    };
    entities.push(migrated);
  }
  //
  return {
    identifier: serialization.modelId,
    type: "http://dataspecer.com/resources/local/visual-model",
    version: 1,
    entities,
  };
}
