import {
  type SemanticModelClass,
  type SemanticModelRelationship,
  isSemanticModelClass,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

export const getTheOriginalProfiledEntity = (
  resource:
    SemanticModelClassProfile
    | SemanticModelRelationshipProfile,
  sources: (
    | SemanticModelClass
    | SemanticModelRelationship
    | SemanticModelClassProfile
    | SemanticModelRelationshipProfile
  )[]
): (SemanticModelClass | SemanticModelRelationship)[] => {
  let profiling: string[] = [];
  if (isSemanticModelClassProfile(resource)) {
    profiling = resource.profiling;
  } else if (isSemanticModelRelationshipProfile(resource)) {
    resource.ends.forEach(item => profiling.push(...item.profiling));
  }
  const result: (SemanticModelClass | SemanticModelRelationship)[] = [];
  profiling.map(identifier => sources.find(item => item.id === identifier))
    .filter(item => item !== undefined)
    .forEach(item => {
      if (isSemanticModelClass(item) || isSemanticModelRelationship(item)) {
        result.push(item);
      } else {
        result.push(...getTheOriginalProfiledEntity(item, sources));
      }
    });
  // Make it uniq.
  return [...new Set(result)];
};

export type WithOverrideHandlerType = {
  callback: () => void;
  defaultValue: boolean;
};
