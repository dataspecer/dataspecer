import { useMemo } from "react";
import { AddVocabularyView } from "./add-vocabulary-view";
import {
  createSelectControlledVocabulariesPresenter,
} from "./select-controlled-vocabularies-presenter";
import {
  findDuplicateVocabularyItemIds,
  hasControlledVocabularyConflict,
  SelectControlledVocabulariesState,
} from "./select-controlled-vocabularies-state";
import { VocabularyItemView } from "./vocabulary-item-view";

export function SelectControlledVocabulariesView(props: {
  state: SelectControlledVocabulariesState;
  setState: (next: (prevState: SelectControlledVocabulariesState) =>
    SelectControlledVocabulariesState) => void;
}) {
  const presenter = useMemo(
    () => createSelectControlledVocabulariesPresenter(props.setState),
    [props.setState],
  );
  const state = props.state;
  const hasConflict = hasControlledVocabularyConflict(state);
  const duplicateItemIds = findDuplicateVocabularyItemIds(state);
  const hasDuplicates = duplicateItemIds.size > 0;
  const inheritedItems = state.items.filter(item => item.inherited !== null);
  const addedItems = state.items.filter(item => item.inherited === null);

  return (
    <div className="flex flex-col gap-3">
      {inheritedItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">From profiled</p>
          {inheritedItems.map(item => (
            <VocabularyItemView
              key={item.id}
              state={item}
              presenter={presenter.getItemPresenter(item.id)}
              isDuplicate={duplicateItemIds.has(item.id)}
            />
          ))}
        </div>
      )}

      {addedItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">In this profile</p>
          {addedItems.map(item => (
            <VocabularyItemView
              key={item.id}
              state={item}
              presenter={presenter.getItemPresenter(item.id)}
              onRemove={() => presenter.onRemove(item.id)}
              isDuplicate={duplicateItemIds.has(item.id)}
            />
          ))}
        </div>
      )}

      {hasConflict && (
        <p className="text-sm text-red-600">
          A profile cannot contain more than one controlled vocabulary when one
          has a MUST qualifier. Remove the others or change the MUST qualifier
          to continue.
        </p>
      )}

      {hasDuplicates && (
        <p className="text-sm text-red-600">
          The highlighted controlled vocabularies are assigned with the exact
          same qualifier more than once. Remove or change one of each pair
          to continue.
        </p>
      )}

      {state.addForm !== null && (
        <AddVocabularyView
          state={state.addForm}
          presenter={presenter.addFormPresenter}
          onConfirm={presenter.onConfirmAddForm}
          onCancel={presenter.onCancelAddForm}
        />
      )}

      {state.addForm === null && !hasConflict && (
        <button
          className="self-start rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
          onClick={presenter.onOpenAddForm}
        >
          + Add controlled vocabulary
        </button>
      )}
    </div>
  );
}
