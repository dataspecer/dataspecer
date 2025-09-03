import { ClassesContextType } from "../../context/classes-context";
import { CmeSemanticModel } from "../cme-model";
import {
  toCmeProfileClass,
  toCmeProfileRelationship,
} from "../cme-profile-model/adapter";
import { CmeProfileModel } from "../cme-profile-model/model";
import {
  toCmeSemanticClass,
  toCmeSemanticGeneralization,
  toCmeSemanticRelationship,
} from "../cme-semantic-model/adapter";
import {
  toCmeProfileClassAggregate,
  toCmeProfileRelationshipAggregate,
  toCmeSemanticClassAggregate,
  toCmeSemanticRelationshipAggregate,
} from "./adapter";
import { CmeAggregateModelContext } from "./cme-aggregate-model-context";
import {
  CmeGeneralizationAggregate,
  CmeProfileClassAggregate,
  CmeProfileRelationshipAggregate,
  CmeSemanticClassAggregate,
  CmeSemanticRelationshipAggregate,
} from "./model";
import { resolveSources } from "./utilities";

interface CmeAggregateModelBuilder {

  fromClassesContext(context: ClassesContextType): void;

  buildContext(): CmeAggregateModelContext;

}

class DefaultCmeAggregateModelBuilder implements CmeAggregateModelBuilder {

  profileModels: Record<string, CmeProfileModel> = {};

  profileClasses: Record<string, CmeProfileClassAggregate> = {};

  profileRelationships: Record<string, CmeProfileRelationshipAggregate> = {};

  semanticModels: Record<string, CmeSemanticModel> = {};

  semanticClasses: Record<string, CmeSemanticClassAggregate> = {};

  semanticRelationships: Record<string, CmeSemanticRelationshipAggregate> = {};

  generalizations: Record<string, CmeGeneralizationAggregate> = {};

  fromClassesContext(context: ClassesContextType): void {
    context.classes.forEach(item => {
      const model = context.sourceModelOfEntityMap.get(item.id) ?? "";
      const semantic = toCmeSemanticClass(model, false, item);
      const aggregate = toCmeSemanticClassAggregate(
        semantic, this.semanticClasses[item.id])
      this.semanticClasses[item.id] = aggregate;
    });
    context.relationships.forEach(item => {
      const model = context.sourceModelOfEntityMap.get(item.id) ?? "";
      const semantic = toCmeSemanticRelationship(model, false, item);
      const aggregate = toCmeSemanticRelationshipAggregate(
        semantic, this.semanticRelationships[item.id])
      this.semanticRelationships[item.id] = aggregate;
    });
    context.classProfiles.forEach(item => {
      const model = context.sourceModelOfEntityMap.get(item.id) ?? "";
      const profile = toCmeProfileClass(model, false, item);
      const aggregate = toCmeProfileClassAggregate(
        profile, this.profileClasses[item.id]);
      this.profileClasses[item.id] = aggregate;
    });
    context.relationshipProfiles.forEach(item => {
      const model = context.sourceModelOfEntityMap.get(item.id) ?? "";
      const profile = toCmeProfileRelationship(model, false, item);
      const aggregate = toCmeProfileRelationshipAggregate(
        profile, this.profileRelationships[item.id])
      this.profileRelationships[item.id] = aggregate;
    });
    context.generalizations.forEach(item => {
      const model = context.sourceModelOfEntityMap.get(item.id) ?? "";
      const semantic = toCmeSemanticGeneralization(model, false, item);
      this.generalizations[semantic.identifier] = {
        type: "cme-generalization-aggregate",
        identifier: semantic.identifier,
        models: [semantic.model],
        dependencies: [semantic.identifier],
        readOnly: false,
        iri: item.iri,
        childIdentifier: semantic.childIdentifier,
        parentIdentifier: semantic.parentIdentifier,
      };
    });
  }

  buildContext(): CmeAggregateModelContext {

    resolveSources(this.semanticClasses, this.profileClasses,
      item => item.nameSource,
      item => item.name,
      item => item.name,
      (item, value) => ({ ...item, nameAggregate: value }));
    resolveSources(this.semanticClasses, this.profileClasses,
      item => item.descriptionSource,
      item => item.description,
      item => item.description,
      (item, value) => ({ ...item, descriptionAggregate: value }));
    resolveSources(this.semanticClasses, this.profileClasses,
      item => item.usageNoteSource,
      () => null,
      item => item.usageNote,
      (item, value) => ({ ...item, usageNoteAggregate: value }));

    resolveSources(this.semanticRelationships, this.profileRelationships,
      item => item.nameSource,
      item => item.name,
      item => item.name,
      (item, value) => ({ ...item, nameAggregate: value }));
    resolveSources(this.semanticRelationships, this.profileRelationships,
      item => item.descriptionSource,
      item => item.description,
      item => item.description,
      (item, value) => ({ ...item, descriptionAggregate: value }));
    resolveSources(this.semanticRelationships, this.profileRelationships,
      item => item.usageNoteSource,
      () => null,
      item => item.usageNote,
      (item, value) => ({ ...item, usageNoteAggregate: value }));

    return {
      profileModels: Object.values(this.profileModels),
      profileClasses: Object.values(this.profileClasses),
      profileClass: id => this.profileClasses[id] ?? null,
      profileRelationships: Object.values(this.profileRelationships),
      profileRelationship: id => this.profileRelationships[id] ?? null,
      semanticModels: Object.values(this.semanticModels),
      semanticClasses: Object.values(this.semanticClasses),
      semanticClass: id => this.semanticClasses[id] ?? null,
      semanticRelationships: Object.values(this.semanticRelationships),
      semanticRelationship: id => this.semanticRelationships[id] ?? null,
      generalizations: Object.values(this.generalizations),
      generalization: id => this.generalizations[id] ?? null,
    };
  }

}

export function createCmeAggregateModelBuilder(): CmeAggregateModelBuilder {
  return new DefaultCmeAggregateModelBuilder();
}

export function createCmeAggregateModelContextFromClassesContext(
  context: ClassesContextType,
): CmeAggregateModelContext {
  const builder = new DefaultCmeAggregateModelBuilder();
  builder.fromClassesContext(context);
  return builder.buildContext();
}
