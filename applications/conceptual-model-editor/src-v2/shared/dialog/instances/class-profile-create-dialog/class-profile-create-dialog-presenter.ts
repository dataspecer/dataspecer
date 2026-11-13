// Presenter for ClassProfileCreateDialog
import { useMemo } from "react";
import { createSelectModelPresenter, SelectModelPresenter } from "../../components/select-model";
import { createSelectEntitiesPresenter, SelectEntitiesPresenter } from "../../components/select-entities";
import { createLanguageStringInputPresenter, LanguageStringInputPresenter } from "../../components/language-string-input";
import { createIriInputPresenter, IriInputPresenter } from "../../components/iri-input";
import { createStringInputPresenter, StringInputPresenter } from "../../components/string-input";
import { ClassProfileCreateDialogState } from "./class-profile-create-dialog-state";
import { createSelectOptionPresenter, SelectOptionPresenter } from "../../components/select-option";

export interface ClassProfileCreateDialogPresenter {
  model: SelectModelPresenter;
  profileOf: SelectEntitiesPresenter;
  name: LanguageStringInputPresenter;
  iri: IriInputPresenter;
  specializationOf: SelectEntitiesPresenter;
  definition: LanguageStringInputPresenter;
  usageNote: LanguageStringInputPresenter;
  externalDocumentationUrl: StringInputPresenter;
  order: StringInputPresenter;
  role: SelectOptionPresenter;
}

/** Creates presenters for all sub‑components used in ClassProfileCreateDialog. */
export function createClassProfileCreateDialogPresenter(
  changeState: (next: (state: ClassProfileCreateDialogState) => ClassProfileCreateDialogState) => void,
): ClassProfileCreateDialogPresenter {
  return {
    model: createSelectModelPresenter((next) => {
      changeState((s) => ({ ...s, model: next(s.model) }));
    }),
    profileOf: createSelectEntitiesPresenter((next) => {
      changeState((s) => ({ ...s, profileOf: next(s.profileOf) }));
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
    usageNote: createLanguageStringInputPresenter((next) => {
      changeState((s) => ({ ...s, usageNote: next(s.usageNote) }));
    }),
    externalDocumentationUrl: createStringInputPresenter((next) => {
      changeState((s) => ({ ...s, externalDocumentationUrl: next(s.externalDocumentationUrl) }));
    }),
    order: createStringInputPresenter((next) => {
      changeState((s) => ({ ...s, order: next(s.order) }));
    }),
    role: createSelectOptionPresenter((next) => {
      changeState((s) => ({ ...s, role: next(s.role) }));
    }),
  };
}

/** Hook that memoises the presenter creation. */
export function useClassProfileCreateDialogPresenter(props: {
  state: ClassProfileCreateDialogState;
  changeState: (next: ClassProfileCreateDialogState | ((prev: ClassProfileCreateDialogState) => ClassProfileCreateDialogState)) => void;
}): ClassProfileCreateDialogPresenter {
  return useMemo(() => {
    const updaupdateFunctionteFn = (next: (state: ClassProfileCreateDialogState) => ClassProfileCreateDialogState) => {
      props.changeState((prev) => next(prev));
    };
    return createClassProfileCreateDialogPresenter(updateFunction);
  }, [props.changeState]);
}
