import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import {
  findTopLevelGroup,
  findWritableVisualModel,
  getGroupMappings,
} from "./visual-model-utilities";
import { setAnchor } from "./toggle-anchor";

const CreateVisualGroupType =
  "create-visual-group-operation";

interface CreateVisualGroupArguments extends CmeOperationArguments {

  type: typeof CreateVisualGroupType;

  visualModel: ModelDsIdentifier;

  /**
   * Visual nodes, visual diagram nodes or groups.
   */
  visualEntities: string[];

}

interface CreateVisualGroupResult
  extends CmeOperationResult<CreateVisualGroupArguments> {

  created: string;

}

export const createVisualGroupOperation: CmeOperation<
  CreateVisualGroupArguments, CreateVisualGroupResult> = {
  metadata: {
    type: CreateVisualGroupType,
  },
  create: (_context, parameters) => ({
    type: CreateVisualGroupType,
    ...parameters,
  }),
  execute: createVisualGroupExecutor,
};

/**
 * A node which is part of a group is replaced by its top level group.
 * The anchors of the whole content are reset.
 *
 * @throws CmeOperationExecutionFailed
 */
async function createVisualGroupExecutor(
  context: CmeExecutionContext,
  args: CreateVisualGroupArguments,
): Promise<CreateVisualGroupResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const { existingGroups, nodeToGroupMapping } = getGroupMappings(visualModel);
  const content = args.visualEntities.map(item =>
    findTopLevelGroup(item, existingGroups, nodeToGroupMapping) ?? item);
  const created = visualModel.addVisualGroup({
    content: [...new Set(content)],
    anchored: null,
  });
  // Group and its content share the anchor, we start with no anchor.
  setAnchor(visualModel, created, null);
  return { args, created };
}
