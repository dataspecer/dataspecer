import { Entity } from "@dataspecer/core-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { ProfileModel } from "@dataspecer/profile-model";

export {
  InMemorySemanticModel,
} from "@dataspecer/core-v2/semantic-model/in-memory";

export {
  type ProfileModel
} from "@dataspecer/profile-model";

export type ProfileEntity = Entity;

export {
  isPrimitiveType as isProfilePrimitiveType,
  isComplexType as isProfileComplexType,
} from "@dataspecer/core-v2/semantic-model/datatypes";

/** True when we can write into the model. */
export function isInMemoryProfileModel(
  what: ProfileModel | undefined,
): what is InMemorySemanticModel {
  if (what === undefined) {
    return false;
  }
  return what instanceof InMemorySemanticModel && !what.getMainEntity()?.source;
}
