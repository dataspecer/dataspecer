import { WritableVisualModel } from "@dataspecer/visual-model";
import { findTopLevelGroup, getGroupMappings } from "./utilities";

export function addGroupToVisualModelAction(
  visualModel: WritableVisualModel,
  nodesInGroup: string[],
): string {
  const convertedContentWithExistingGroups: string[] = [];

  const { existingGroups, nodeToGroupMapping } = getGroupMappings(visualModel);

  for(const nodeInGroup of nodesInGroup) {
    const topLevelGroup = findTopLevelGroup(nodeInGroup, existingGroups, nodeToGroupMapping);
    convertedContentWithExistingGroups.push(topLevelGroup ?? nodeInGroup);
  }

  return visualModel.addVisualGroup({
    // Remove possible duplicate groups
    content: [...new Set(convertedContentWithExistingGroups)],
    anchored: null,
  });
}
