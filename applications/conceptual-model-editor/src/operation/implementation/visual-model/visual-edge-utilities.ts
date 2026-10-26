import {
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualModel,
  VisualProfileRelationship,
  VisualRelationship,
} from "@dataspecer/visual-model";

import {
  InvalidEntity,
} from "../../operation";
import { getVisualEntity } from "./visual-model-utilities";

/**
 * @throws MissingEntity
 * @throws InvalidEntity
 */
export function getVisualEdge(
  visualModel: VisualModel,
  identifier: string,
): VisualRelationship | VisualProfileRelationship {
  const result = getVisualEntity(visualModel, identifier);
  if (!isVisualRelationship(result) && !isVisualProfileRelationship(result)) {
    throw new InvalidEntity("Expected an edge.");
  }
  return result;
}
