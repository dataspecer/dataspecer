// Presenter for RelationshipProfileCreateDialog
import { useMemo } from "react";
import { createSelectModelPresenter } from "../../components/select-model";
import { createSelectEntitiesPresenter } from "../../components/select-entities";
import { createSelectEntityPresenter } from "../../components/select-entity";
import { createIriInputPresenter } from "../../components/iri-input";
import { createLanguageStringInputPresenter } from "../../components/language-string-input";
import { createSelectCardinalityPresenter } from "../../components/select-cardinality";
import { createStringInputPresenter } from "../../components/string-input";
import { RelationshipProfileCreateDialogState } from "./relationship-profile-create-dialog-state";
import { createSelectOptionPresenter } from "../../components/select-option";

export interface RelationshipProfileCreateDialogPresenter {
  model: ReturnType<typeof createSelectModelPresenter>;
  profileOf: ReturnType<typeof createSelectEntitiesPresenter>;
  domain: ReturnType<typeof createSelectEntityPresenter>;
  iri: ReturnType<typeof createIriInputPresenter>;
  specializationOf: ReturnType<typeof createSelectEntitiesPresenter>;
  usageNote: ReturnType<typeof createLanguageStringInputPresenter>;
  domainCardinality: ReturnType<typeof createSelectCardinalityPresenter>;
  range: ReturnType<typeof createSelectEntityPresenter>;
  rangeCardinality: ReturnType<typeof createSelectCardinalityPresenter>;
  externalDocumentationUrl: ReturnType<typeof createStringInputPresenter>;
  order: ReturnType<typeof createStringInputPresenter>;
  mandatoryLevel: ReturnType<typeof createSelectOptionPresenter>;
}

export function createRelationshipProfileCreateDialogPresenter(
  changeState: (next: (state: RelationshipProfileCreateDialogState) => RelationshipProfileCreateDialogState) => void,
): RelationshipProfileCreateDialogPresenter {
  return {
    model: createSelectModelPresenter((next) => changeState((s) => ({ ...s, model: next(s.model) }))),
    profileOf: createSelectEntitiesPresenter((next) => changeState((s) => ({ ...s, profileOf: next(s.profileOf) }))),
    domain: createSelectEntityPresenter((next) => changeState((s) => ({ ...s, domain: next(s.domain) }))),
    iri: createIriInputPresenter((next) => changeState((s) => ({ ...s, iri: next(s.iri) }))),
    specializationOf: createSelectEntitiesPresenter((next) => changeState((s) => ({ ...s, specializationOf: next(s.specializationOf) }))),
    usageNote: createLanguageStringInputPresenter((next) => changeState((s) => ({ ...s, usageNote: next(s.usageNote) }))),
    domainCardinality: createSelectCardinalityPresenter((next) => changeState((s) => ({ ...s, domainCardinality: next(s.domainCardinality) }))),
    range: createSelectEntityPresenter((next) => changeState((s) => ({ ...s, range: next(s.range) }))),
    rangeCardinality: createSelectCardinalityPresenter((next) => changeState((s) => ({ ...s, rangeCardinality: next(s.rangeCardinality) }))),
    externalDocumentationUrl: createStringInputPresenter((next) => changeState((s) => ({ ...s, externalDocumentationUrl: next(s.externalDocumentationUrl) }))),
    order: createStringInputPresenter((next) => changeState((s) => ({ ...s, order: next(s.order) }))),
    mandatoryLevel: createSelectOptionPresenter((next) => changeState((s) => ({ ...s, mandatoryLevel: next(s.mandatoryLevel) }))),
  };
}

export function useRelationshipProfileCreateDialogPresenter(props: {
  state: RelationshipProfileCreateDialogState;
  changeState: (next: RelationshipProfileCreateDialogState | ((prev: RelationshipProfileCreateDialogState) => RelationshipProfileCreateDialogState)) => void;
}): RelationshipProfileCreateDialogPresenter {
  return useMemo(() => {
    const updateFn = (next: (state: RelationshipProfileCreateDialogState) => RelationshipProfileCreateDialogState) =>
      props.changeState((prev) => next(prev));
    return createRelationshipProfileCreateDialogPresenter(updateFn);
  }, [props.changeState]);
}
