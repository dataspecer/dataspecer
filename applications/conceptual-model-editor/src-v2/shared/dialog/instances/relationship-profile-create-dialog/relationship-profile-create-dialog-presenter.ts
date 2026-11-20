// Presenter for RelationshipProfileCreateDialog
import { useMemo } from "react";
import { createSelectModelPresenter, SelectModelPresenter } from "../../components/select-model";
import { createSelectEntitiesPresenter, SelectEntitiesPresenter } from "../../components/select-entities";
import { createSelectEntityPresenter, SelectEntityPresenter } from "../../components/select-entity";
import { createIriInputPresenter, IriInputPresenter } from "../../components/iri-input";
import { createLanguageStringInputPresenter, LanguageStringInputPresenter } from "../../components/language-string-input";
import { createSelectCardinalityPresenter, SelectCardinalityPresenter } from "../../components/select-cardinality";
import { createStringInputPresenter, StringInputPresenter } from "../../components/string-input";
import { RelationshipProfileCreateDialogState } from "./relationship-profile-create-dialog-state";
import { createSelectOptionPresenter, SelectOptionPresenter } from "../../components/select-option";

export interface RelationshipProfileCreateDialogPresenter {
  model: SelectModelPresenter;
  profileOf: SelectEntitiesPresenter;
  domain: SelectEntityPresenter;
  iri: IriInputPresenter;
  specializationOf: SelectEntitiesPresenter;
  usageNote: LanguageStringInputPresenter;
  domainCardinality: SelectCardinalityPresenter;
  range: SelectEntityPresenter;
  rangeCardinality: SelectCardinalityPresenter;
  externalDocumentationUrl: StringInputPresenter;
  order: StringInputPresenter;
  mandatoryLevel: SelectOptionPresenter;
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
    const updateFunction = (next: (state: RelationshipProfileCreateDialogState) => RelationshipProfileCreateDialogState) =>
      props.changeState((prev) => next(prev));
    return createRelationshipProfileCreateDialogPresenter(updateFunction);
  }, [props.changeState]);
}
