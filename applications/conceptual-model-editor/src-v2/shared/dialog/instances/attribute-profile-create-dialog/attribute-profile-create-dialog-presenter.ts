// Presenter for AttributeProfileCreateDialog
import { useMemo } from "react";
import { createSelectModelPresenter, SelectModelPresenter } from "../../components/select-model";
import { createSelectEntityPresenter, SelectEntityPresenter } from "../../components/select-entity";
import { createIriInputPresenter, IriInputPresenter } from "../../components/iri-input";
import { createLanguageStringInputPresenter, LanguageStringInputPresenter } from "../../components/language-string-input";
import { createSelectCardinalityPresenter, SelectCardinalityPresenter } from "../../components/select-cardinality";
import { createStringInputPresenter, StringInputPresenter } from "../../components/string-input";
import { createSelectOptionPresenter, SelectOptionPresenter } from "../../components/select-option";
import { AttributeProfileCreateDialogState } from "./attribute-profile-create-dialog-state";

export interface AttributeProfileCreateDialogPresenter {
  model: SelectModelPresenter;
  name: LanguageStringInputPresenter;
  domain: SelectEntityPresenter;
  iri: IriInputPresenter;
  definition: LanguageStringInputPresenter;
  usageNote: LanguageStringInputPresenter;
  domainCardinality: SelectCardinalityPresenter;
  range: SelectEntityPresenter;
  rangeCardinality: SelectCardinalityPresenter;
  externalDocumentationUrl: StringInputPresenter;
  order: StringInputPresenter;
  mandatoryLevel: SelectOptionPresenter;
}

export function createAttributeProfileCreateDialogPresenter(
  changeState: (next: (state: AttributeProfileCreateDialogState) => AttributeProfileCreateDialogState) => void,
): AttributeProfileCreateDialogPresenter {
  return {
    model: createSelectModelPresenter((next) => changeState((s) => ({ ...s, model: next(s.model) }))),
    name: createLanguageStringInputPresenter((next) => changeState((s) => ({ ...s, name: next(s.name) }))),
    domain: createSelectEntityPresenter((next) => changeState((s) => ({ ...s, domain: next(s.domain) }))),
    iri: createIriInputPresenter((next) => changeState((s) => ({ ...s, iri: next(s.iri) }))),
    definition: createLanguageStringInputPresenter((next) => changeState((s) => ({ ...s, definition: next(s.definition) }))),
    usageNote: createLanguageStringInputPresenter((next) => changeState((s) => ({ ...s, usageNote: next(s.usageNote) }))),
    domainCardinality: createSelectCardinalityPresenter((next) => changeState((s) => ({ ...s, domainCardinality: next(s.domainCardinality) }))),
    range: createSelectEntityPresenter((next) => changeState((s) => ({ ...s, range: next(s.range) }))),
    rangeCardinality: createSelectCardinalityPresenter((next) => changeState((s) => ({ ...s, rangeCardinality: next(s.rangeCardinality) }))),
    externalDocumentationUrl: createStringInputPresenter((next) => changeState((s) => ({ ...s, externalDocumentationUrl: next(s.externalDocumentationUrl) }))),
    order: createStringInputPresenter((next) => changeState((s) => ({ ...s, order: next(s.order) }))),
    mandatoryLevel: createSelectOptionPresenter((next) => changeState((s) => ({ ...s, mandatoryLevel: next(s.mandatoryLevel) }))),
  };
}

export function useAttributeProfileCreateDialogPresenter(props: {
  state: AttributeProfileCreateDialogState;
  changeState: (next: AttributeProfileCreateDialogState | ((prev: AttributeProfileCreateDialogState) => AttributeProfileCreateDialogState)) => void;
}): AttributeProfileCreateDialogPresenter {
  return useMemo(() => {
    const updateFunction = (next: (state: AttributeProfileCreateDialogState) => AttributeProfileCreateDialogState) =>
      props.changeState((prev) => next(prev));
    return createAttributeProfileCreateDialogPresenter(updateFunction);
  }, [props.changeState]);
}
