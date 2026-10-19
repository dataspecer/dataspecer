// Presenter for RelationshipCreateDialog
import { useMemo } from "react";
import { createSelectModelPresenter, SelectModelPresenter } from "../../components/select-model";
import { createSelectEntitiesPresenter, SelectEntitiesPresenter } from "../../components/select-entities";
import { createSelectEntityPresenter, SelectEntityPresenter } from "../../components/select-entity";
import { createLanguageStringInputPresenter, LanguageStringInputPresenter } from "../../components/language-string-input";
import { createIriInputPresenter, IriInputPresenter } from "../../components/iri-input";
import { createStringInputPresenter, StringInputPresenter } from "../../components/string-input";
import { RelationshipCreateDialogState } from "./relationship-create-dialog-state";

export interface RelationshipCreateDialogPresenter {
  model: SelectModelPresenter;
  name: LanguageStringInputPresenter;
  iri: IriInputPresenter;
  specializationOf: SelectEntitiesPresenter;
  definition: LanguageStringInputPresenter;
  domain: SelectEntityPresenter;
  range: SelectEntityPresenter;
  externalDocumentationUrl: StringInputPresenter;
  order: StringInputPresenter;
}

export function createRelationshipCreateDialogPresenter(
  changeState: (next: (state: RelationshipCreateDialogState) => RelationshipCreateDialogState) => void,
): RelationshipCreateDialogPresenter {
  return {
    model: createSelectModelPresenter((next) => {
      changeState((s) => ({ ...s, model: next(s.model) }));
    }),
    name: createLanguageStringInputPresenter((next) => {
      changeState((s) => ({ ...s, name: next(s.name) }));
    }),
    iri: createIriInputPresenter((next) => {
      changeState((s) => ({ ...s, iri: next(s.iri) }));
    }),
    specializationOf: createSelectEntitiesPresenter((next) => {
      changeState((s) => ({ ...s, specializationOf: next(s.specializationOf) }));
    }),
    definition: createLanguageStringInputPresenter((next) => {
      changeState((s) => ({ ...s, definition: next(s.definition) }));
    }),
    domain: createSelectEntityPresenter((next) => {
      changeState((s) => ({ ...s, domain: next(s.domain) }));
    }),
    range: createSelectEntityPresenter((next) => {
      changeState((s) => ({ ...s, range: next(s.range) }));
    }),
    externalDocumentationUrl: createStringInputPresenter((next) => {
      changeState((s) => ({ ...s, externalDocumentationUrl: next(s.externalDocumentationUrl) }));
    }),
    order: createStringInputPresenter((next) => {
      changeState((s) => ({ ...s, order: next(s.order) }));
    }),
  };
}

export function useRelationshipCreateDialogPresenter(props: {
  state: RelationshipCreateDialogState;
  changeState: (
    next: RelationshipCreateDialogState | ((prev: RelationshipCreateDialogState) => RelationshipCreateDialogState),
  ) => void;
}): RelationshipCreateDialogPresenter {
  return useMemo(() => {
    const updateFunction = (next: (state: RelationshipCreateDialogState) => RelationshipCreateDialogState) => {
      props.changeState((prev) => next(prev));
    };
    return createRelationshipCreateDialogPresenter(updateFunction);
  }, [props.changeState]);
}
