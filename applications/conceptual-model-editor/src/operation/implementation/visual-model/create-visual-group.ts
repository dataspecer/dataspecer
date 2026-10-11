import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findTopLevelGroup,
  findWritableVisualModel,
  getGroupMappings,
} from "./visual-model-utilities";
import { setAnchor } from "./toggle-anchor";

export function createVisualGroupOperation(
  args: Omit<CreateVisualGroupArguments, "type">,
): CmeOperation<CreateVisualGroupArguments, CreateVisualGroupResult> {
  return {
    type: CreateVisualGroupType,
    ...args,
  };
}

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

cmeOperationExecutorRegistry.register(
  CreateVisualGroupType,
  createVisualGroupOperation,
  { execute: createVisualGroupExecutor });

/**
 * A node which is part of a group is replaced by its top level group.
 * The anchors of the whole content are reset.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function createVisualGroupExecutor(
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
