// Presenter for ClassCreateDialog
import { useMemo } from "react";
import { createSelectModelPresenter } from "../../components/select-model";
import { createSelectEntitiesPresenter } from "../../components/select-entities";
import { createLanguageStringInputPresenter } from "../../components/language-string-input";
import { createIriInputPresenter } from "../../components/iri-input";
import { createStringInputPresenter } from "../../components/string-input";
import { ClassCreateDialogState } from "./class-create-dialog-state";

export interface ClassCreateDialogPresenter {
  model: ReturnType<typeof createSelectModelPresenter>;
  name: ReturnType<typeof createLanguageStringInputPresenter>;
  iri: ReturnType<typeof createIriInputPresenter>;
  specializationOf: ReturnType<typeof createSelectEntitiesPresenter>;
  definition: ReturnType<typeof createLanguageStringInputPresenter>;
  externalDocumentationUrl: ReturnType<typeof createStringInputPresenter>;
  order: ReturnType<typeof createStringInputPresenter>;
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
    const updateFn = (next: (state: ClassCreateDialogState) => ClassCreateDialogState) => {
      props.changeState((prev) => next(prev));
    };
    return createClassCreateDialogPresenter(updateFn);
  }, [props.changeState]);
}
