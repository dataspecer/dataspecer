import { Entity, EntityModel } from "@dataspecer/core-v2";

export type ProfileEntity = Entity;

export type ProfileModel =  EntityModel;

export {
  isPrimitiveType as isProfilePrimitiveType,
  isComplexType as isProfileComplexType,
} from "@dataspecer/core-v2/semantic-model/datatypes";
