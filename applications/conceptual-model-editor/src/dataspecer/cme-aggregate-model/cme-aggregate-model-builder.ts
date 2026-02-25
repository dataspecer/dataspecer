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
import { CmeAggregateModelApi } from "./cme-aggregate-model-api";
import { CmeAggregateModelState } from "./cme-aggregate-model-state";
import {
  CmeGeneralizationAggregate,
  CmeProfileClassAggregate,
  CmeProfileRelationshipAggregate,
  CmeSemanticClassAggregate,
  CmeSemanticRelationshipAggregate,
} from "./model";
import { resolveSources } from "./utilities";

interface CmeAggregateModel {

  fromClassesContext(context: ClassesContextType): void;

  buildApi(): CmeAggregateModelApi;

  buildState(): CmeAggregateModelState;

}

class DefaultCmeAggregateModelBuilder implements CmeAggregateModel {

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
      const semantic = toCmeSemanticClass(model, item);
      const aggregate = toCmeSemanticClassAggregate(
        semantic, this.semanticClasses[item.id])
      this.semanticClasses[item.id] = aggregate;
    });
    context.relationships.forEach(item => {
      const model = context.sourceModelOfEntityMap.get(item.id) ?? "";
      const semantic = toCmeSemanticRelationship(model, item);
      const aggregate = toCmeSemanticRelationshipAggregate(
        semantic, this.semanticRelationships[item.id])
      this.semanticRelationships[item.id] = aggregate;
    });
    context.classProfiles.forEach(item => {
      const model = context.sourceModelOfEntityMap.get(item.id) ?? "";
      const profile = toCmeProfileClass(model, item);
      const aggregate = toCmeProfileClassAggregate(
        profile, this.profileClasses[item.id]);
      this.profileClasses[item.id] = aggregate;
    });
    context.relationshipProfiles.forEach(item => {
      const model = context.sourceModelOfEntityMap.get(item.id) ?? "";
      const profile = toCmeProfileRelationship(model, item);
      const aggregate = toCmeProfileRelationshipAggregate(
        profile, this.profileRelationships[item.id])
      this.profileRelationships[item.id] = aggregate;
    });
    context.generalizations.forEach(item => {
      const model = context.sourceModelOfEntityMap.get(item.id) ?? "";
      const semantic = toCmeSemanticGeneralization(model, item);
      this.generalizations[semantic.identifier] = {
        type: "cme-generalization-aggregate",
        identifier: semantic.identifier,
        model: semantic.model,
        models: [semantic.model],
        dependencies: [semantic.identifier],
        iri: item.iri,
        childIdentifier: semantic.childIdentifier,
        parentIdentifier: semantic.parentIdentifier,
      };
    });
  }

  buildApi(): CmeAggregateModelApi {
    this.resolveSources();
    return {
      profileModel: id => this.profileModels[id] ?? null,
      profileClass: id => this.profileClasses[id] ?? null,
      profileRelationship: id => this.profileRelationships[id] ?? null,
      semanticModel: id => this.semanticModels[id] ?? null,
      semanticClass: id => this.semanticClasses[id] ?? null,
      semanticRelationship: id => this.semanticRelationships[id] ?? null,
      generalization: id => this.generalizations[id] ?? null,
    };
  }

  private resolveSources() {
    // Profiles classes
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
    // Profile relationships
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
  }

  buildState(): CmeAggregateModelState {
    this.resolveSources();
    return {
      profileModels: this.profileModels,
      profileClasses: this.profileClasses,
      profileRelationships: this.profileRelationships,
      semanticModels: this.semanticModels,
      semanticClasses: this.semanticClasses,
      semanticRelationships: this.semanticRelationships,
      generalizations: this.generalizations,
    };
  }

}

export function createCmeAggregateModelBuilder(): CmeAggregateModel {
  return new DefaultCmeAggregateModelBuilder();
}

export function createCmeAggregateModelContextFromClassesContext(
  context: ClassesContextType,
): CmeAggregateModelState {
  const builder = new DefaultCmeAggregateModelBuilder();
  builder.fromClassesContext(context);
  return builder.buildState();
}
