// Presenter for AttributeCreateDialog
import { useMemo } from "react";
import { createSelectModelPresenter, SelectModelPresenter } from "../../components/select-model";
import { createSelectEntityPresenter,SelectEntityPresenter } from "../../components/select-entity";
import { createLanguageStringInputPresenter, LanguageStringInputPresenter } from "../../components/language-string-input";
import { createIriInputPresenter, IriInputPresenter } from "../../components/iri-input";
import { createStringInputPresenter, StringInputPresenter } from "../../components/string-input";
import { createSelectCardinalityPresenter, SelectCardinalityPresenter } from "../../components/select-cardinality";
import { createSelectOptionPresenter, SelectOptionPresenter} from "../../components/select-option";
import { AttributeCreateDialogState } from "./attribute-create-dialog-state";

export interface AttributeCreateDialogPresenter {
  model: SelectModelPresenter;
  name: StringInputPresenter;
  domain: SelectEntityPresenter;
  iri: IriInputPresenter;
  definition: LanguageStringInputPresenter;
  usageNote: LanguageStringInputPresenter;
  domainCardinality: SelectCardinalityPresenter;
  range: SelectEntityPresenter;
  rangeCardinality: SelectCardinalityPresenter;
  externalDocumentationUrl: StringInputPresenter;
  order: StringInputPresenter
  mandatoryLevel: SelectOptionPresenter;
}

export function createAttributeCreateDialogPresenter(
  changeState: (next: (state: AttributeCreateDialogState) => AttributeCreateDialogState) => void,
): AttributeCreateDialogPresenter {
  return {
    model: createSelectModelPresenter((next) => {
      changeState((s) => ({ ...s, model: next(s.model) }));
    }),
    name: createLanguageStringInputPresenter((next) => {
      changeState((s) => ({ ...s, name: next(s.name) }));
    }),
    domain: createSelectEntityPresenter((next) => {
      changeState((s) => ({ ...s, domain: next(s.domain) }));
    }),
    iri: createIriInputPresenter((next) => {
      changeState((s) => ({ ...s, iri: next(s.iri) }));
    }),
    definition: createLanguageStringInputPresenter((next) => {
      changeState((s) => ({ ...s, definition: next(s.definition) }));
    }),
    usageNote: createLanguageStringInputPresenter((next) => {
      changeState((s) => ({ ...s, usageNote: next(s.usageNote) }));
    }),
    domainCardinality: createSelectCardinalityPresenter((next) => {
      changeState((s) => ({ ...s, domainCardinality: next(s.domainCardinality) }));
    }),
    range: createSelectEntityPresenter((next) => {
      changeState((s) => ({ ...s, range: next(s.range) }));
    }),
    rangeCardinality: createSelectCardinalityPresenter((next) => {
      changeState((s) => ({ ...s, rangeCardinality: next(s.rangeCardinality) }));
    }),
    externalDocumentationUrl: createStringInputPresenter((next) => {
      changeState((s) => ({ ...s, externalDocumentationUrl: next(s.externalDocumentationUrl) }));
    }),
    order: createStringInputPresenter((next) => {
      changeState((s) => ({ ...s, order: next(s.order) }));
    }),
    mandatoryLevel: createSelectOptionPresenter((next) => {
      changeState((s) => ({ ...s, mandatoryLevel: next(s.mandatoryLevel) }));
    }),
  };
}

export function useAttributeCreateDialogPresenter(props: {
  state: AttributeCreateDialogState;
  changeState: (
    next: AttributeCreateDialogState | ((prev: AttributeCreateDialogState) => AttributeCreateDialogState),
  ) => void;
}): AttributeCreateDialogPresenter {
  return useMemo(() => {
    const updateFunction = (next: (state: AttributeCreateDialogState) => AttributeCreateDialogState) => {
      props.changeState((prev) => next(prev));
    };
    return createAttributeCreateDialogPresenter(updateFunction);
  }, [props.changeState]);
}
