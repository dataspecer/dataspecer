import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import {
  SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import {
  EntityDsIdentifier,
  LanguageString,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  executeCreateProfileOperation,
  findProfileModel,
} from "../operation-utilities";

export function changeProfileClassOperation(
  args: Omit<ChangeProfileClassArguments, "type">,
): CmeOperation<ChangeProfileClassArguments, ChangeProfileClassResult> {
  return {
    type: ChangeProfileClassType,
    ...args,
  };
}

const ChangeProfileClassType =
  "change-profile-class-operation";

interface ChangeProfileClassArguments extends CmeOperationArguments {

  type: typeof ChangeProfileClassType;

  profileModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

  /**
   * Only given properties are changed.
   */
  changes: {
    profileOf?: EntityDsIdentifier[];
    iri?: string | null;
    name?: LanguageString | null;
    nameSource?: EntityDsIdentifier | null;
    description?: LanguageString | null;
    descriptionSource?: EntityDsIdentifier | null;
    usageNote?: LanguageString | null;
    usageNoteSource?: EntityDsIdentifier | null;
    externalDocumentationUrl?: string | null;
    tags?: string[];
    order?: string | null;
  };

}

type ChangeProfileClassResult =
  CmeOperationResult<ChangeProfileClassArguments>;

cmeOperationExecutorRegistry.register(
  ChangeProfileClassType,
  changeProfileClassOperation,
  { execute: changeProfileClassExecutor });

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws CmeOperationExecutionFailed
 */
export async function changeProfileClassExecutor(
  context: CmeExecutionContext,
  args: ChangeProfileClassArguments,
): Promise<ChangeProfileClassResult> {
  const model = findProfileModel(context, args.profileModel);
  const { changes } = args;

  const entity: Partial<Omit<SemanticModelClassProfile, "type">> = {};
  if (changes.profileOf !== undefined) {
    entity.profiling = changes.profileOf;
  }
  if (changes.iri !== undefined) {
    entity.iri = changes.iri;
  }
  if (changes.name !== undefined) {
    entity.name = changes.name;
  }
  if (changes.nameSource !== undefined) {
    entity.nameFromProfiled = changes.nameSource;
  }
  if (changes.description !== undefined) {
    entity.description = changes.description;
  }
  if (changes.descriptionSource !== undefined) {
    entity.descriptionFromProfiled = changes.descriptionSource;
  }
  if (changes.usageNote !== undefined) {
    entity.usageNote = changes.usageNote;
  }
  if (changes.usageNoteSource !== undefined) {
    entity.usageNoteFromProfiled = changes.usageNoteSource;
  }
  if (changes.externalDocumentationUrl !== undefined) {
    entity.externalDocumentationUrl = changes.externalDocumentationUrl;
  }
  if (changes.tags !== undefined) {
    entity.tags = changes.tags;
  }
  if (changes.order !== undefined) {
    entity.order = changes.order;
  }

  const operation = factory.modifyClassProfile(args.entity, entity);
  await executeCreateProfileOperation(model, operation);
  return { args };
}
