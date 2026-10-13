import {
  HexColor,
  isVisualNode,
  isVisualRelationship,
  VisualModel,
  VisualNode,
  VisualRelationship,
} from "@dataspecer/visual-model";

/**
 * Custom color of the visual entities, which represent the edited entity
 * in the active visual model.
 */
export interface VisualColorDialogState {

  /**
   * True when the entity is shown in the active visual model,
   * so the color can be set.
   */
  visualColorAvailable: boolean;

  /**
   * Custom color, null when the model color is used.
   */
  visualColor: HexColor | null;

}

/**
 * Use for create dialogs, there is nothing to color yet.
 */
export function createNoVisualColorDialogState(): VisualColorDialogState {
  return {
    visualColorAvailable: false,
    visualColor: null,
  };
}

/**
 * When there are more visual entities, we use the first custom color.
 */
export function createVisualColorDialogState(
  visualModel: VisualModel | null,
  represented: string,
): VisualColorDialogState {
  const visualEntities = selectColorableVisualEntities(visualModel, represented);
  const color = visualEntities.find(item => item.color !== undefined && item.color !== null)?.color;
  return {
    visualColorAvailable: visualEntities.length > 0,
    visualColor: color ?? null,
  };
}

/**
 * @returns Visual nodes and relationships representing given entity.
 */
export function selectColorableVisualEntities(
  visualModel: VisualModel | null,
  represented: string,
): (VisualNode | VisualRelationship)[] {
  if (visualModel === null) {
    return [];
  }
  return visualModel.getVisualEntitiesForRepresented(represented)
    .filter((item): item is VisualNode | VisualRelationship =>
      isVisualNode(item) || isVisualRelationship(item));
}
