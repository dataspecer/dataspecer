// Presenter for AttributeProfileCreateDialog
import { useMemo } from "react";
import { createSelectModelPresenter } from "../../components/select-model";
import { createSelectEntityPresenter } from "../../components/select-entity";
import { createIriInputPresenter } from "../../components/iri-input";
import { createLanguageStringInputPresenter } from "../../components/language-string-input";
import { createSelectCardinalityPresenter } from "../../components/select-cardinality";
import { createStringInputPresenter } from "../../components/string-input";
import { createSelectOptionPresenter } from "../../components/select-option";
import { AttributeProfileCreateDialogState } from "./attribute-profile-create-dialog-state";

export interface AttributeProfileCreateDialogPresenter {
  model: ReturnType<typeof createSelectModelPresenter>;
  name: ReturnType<typeof createLanguageStringInputPresenter>;
  domain: ReturnType<typeof createSelectEntityPresenter>;
  iri: ReturnType<typeof createIriInputPresenter>;
  definition: ReturnType<typeof createLanguageStringInputPresenter>;
  usageNote: ReturnType<typeof createLanguageStringInputPresenter>;
  domainCardinality: ReturnType<typeof createSelectCardinalityPresenter>;
  range: ReturnType<typeof createSelectEntityPresenter>;
  rangeCardinality: ReturnType<typeof createSelectCardinalityPresenter>;
  externalDocumentationUrl: ReturnType<typeof createStringInputPresenter>;
  order: ReturnType<typeof createStringInputPresenter>;
  mandatoryLevel: ReturnType<typeof createSelectOptionPresenter>;
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
    const updateFn = (next: (state: AttributeProfileCreateDialogState) => AttributeProfileCreateDialogState) =>
      props.changeState((prev) => next(prev));
    return createAttributeProfileCreateDialogPresenter(updateFn);
  }, [props.changeState]);
}
