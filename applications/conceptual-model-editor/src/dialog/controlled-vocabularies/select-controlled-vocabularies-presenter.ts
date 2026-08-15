import {
  AddVocabularyPresenter,
  createAddVocabularyPresenter,
} from "./add-vocabulary-presenter";
import { createAddVocabularyState } from "./add-vocabulary-state";
import {
  createVocabularyItemPresenter,
  VocabularyItemPresenter,
} from "./vocabulary-item-presenter";
import { SelectControlledVocabulariesState } from "./select-controlled-vocabularies-state";


export interface SelectControlledVocabulariesPresenter {

  getItemPresenter(itemId: string): VocabularyItemPresenter;

  /**
   * No-op when the target item is inherited rather than directly added
   */
  onRemove(itemId: string): void;

  onOpenAddForm(): void;

  onCancelAddForm(): void;

  /**
   * No-op when no vocabulary is selected in the add form
   */
  onConfirmAddForm(): void;

  /**
   * Presenter for the form for adding additional controlled vocabularies
   */
  addFormPresenter: AddVocabularyPresenter;

}

export function createSelectControlledVocabulariesPresenter(
  setState: (next: (state: SelectControlledVocabulariesState)
    => SelectControlledVocabulariesState) => void,
): SelectControlledVocabulariesPresenter {
  return {
    getItemPresenter(itemId) {
      return createVocabularyItemPresenter(next => {
        setState(state => ({
          ...state,
          items: state.items.map(item =>
            item.id === itemId ? next(item) : item),
        }));
      });
    },
    onRemove(itemId) {
      setState(state => {
        const target = state.items.find(item => item.id === itemId);
        if (target === undefined || target.inherited !== null) {
          return state;
        }
        return {
          ...state,
          items: state.items.filter(item => item.id !== itemId),
        };
      });
    },
    onOpenAddForm() {
      setState(state => ({
        ...state,
        addForm: createAddVocabularyState(state.availableVocabularies),
      }));
    },
    onCancelAddForm() {
      setState(state => ({ ...state, addForm: null }));
    },
    onConfirmAddForm() {
      setState(state => {
        const addForm = state.addForm;
        if (addForm === null) {
          return state;
        }
        const selectedId = addForm.vocabularyPicker.value?.id ?? null;
        const vocabulary = addForm.availableVocabularies.find(
          item => item.id === selectedId);
        if (vocabulary === undefined) {
          return state;
        }
        return {
          ...state,
          items: [
            ...state.items,
            { id: crypto.randomUUID(), vocabulary, qualifier: addForm.qualifier, inherited: null },
          ],
          addForm: null,
        };
      });
    },
    addFormPresenter: createAddVocabularyPresenter(next => {
      setState(state => {
        if (state.addForm === null) {
          return state;
        }
        return { ...state, addForm: next(state.addForm) };
      });
    }),
  };
}
