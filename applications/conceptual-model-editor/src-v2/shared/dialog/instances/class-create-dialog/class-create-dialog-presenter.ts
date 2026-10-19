// Presenter for ClassCreateDialog
import { useMemo } from "react";
import { createSelectModelPresenter, SelectModelPresenter } from "../../components/select-model";
import { createSelectEntitiesPresenter, SelectEntitiesPresenter } from "../../components/select-entities";
import { createLanguageStringInputPresenter, LanguageStringInputPresenter } from "../../components/language-string-input";
import { createIriInputPresenter, IriInputPresenter } from "../../components/iri-input";
import { createStringInputPresenter, StringInputPresenter } from "../../components/string-input";
import { ClassCreateDialogState } from "./class-create-dialog-state";

export interface ClassCreateDialogPresenter {
  model: SelectModelPresenter;
  name: LanguageStringInputPresenter;
  iri: IriInputPresenter;
  specializationOf: SelectEntitiesPresenter;
  definition: LanguageStringInputPresenter;
  externalDocumentationUrl: StringInputPresenter;
  order: StringInputPresenter;
}

export function createClassCreateDialogPresenter(
  changeState: (next: (state: ClassCreateDialogState) => ClassCreateDialogState) => void,
): ClassCreateDialogPresenter {
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
    externalDocumentationUrl: createStringInputPresenter((next) => {
      changeState((s) => ({ ...s, externalDocumentationUrl: next(s.externalDocumentationUrl) }));
    }),
    order: createStringInputPresenter((next) => {
      changeState((s) => ({ ...s, order: next(s.order) }));
    }),
  };
}

export function useClassCreateDialogPresenter(props: {
  state: ClassCreateDialogState;
  changeState: (next: ClassCreateDialogState | ((prev: ClassCreateDialogState) => ClassCreateDialogState)) => void;
}): ClassCreateDialogPresenter {
  return useMemo(() => {
    const updateFunction = (next: (state: ClassCreateDialogState) => ClassCreateDialogState) => {
      props.changeState((prev) => next(prev));
    };
    return createClassCreateDialogPresenter(updateFunction);
  }, [props.changeState]);
}
