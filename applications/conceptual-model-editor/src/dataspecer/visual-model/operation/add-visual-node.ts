import { WritableVisualModel } from "@dataspecer/core-v2/visual-model";
import { EntityDsIdentifier, ModelDsIdentifier } from "../../entity-model";

export function addVisualNode(
  visualModel: WritableVisualModel,
  entity: {
    id: EntityDsIdentifier,
  },
  model: ModelDsIdentifier,
  position: { x: number, y: number },
  content: string[],
): string {
  return visualModel.addVisualNode({
    model: model,
    representedEntity: entity.id,
    position: {
      x: position.x,
      y: position.y,
      anchored: null,
    },
    content,
    visualModels: [],
  });
}
