import { Select } from "../../../src-v2/shared/dialog/select";
import { SelectQualifier } from "../components/select-qualifier";
import { AddVocabularyPresenter } from "./add-vocabulary-presenter";
import { AddVocabularyState } from "./add-vocabulary-state";

export function AddVocabularyView(props: {
  state: AddVocabularyState;
  presenter: AddVocabularyPresenter;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded border-2 border-dashed border-indigo-400 p-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold">Select controlled vocabulary:</label>
        <Select
          state={props.state.vocabularyPicker}
          presenter={props.presenter.vocabularyPicker}
          placeholder="-- Choose a vocabulary --"
        />
      </div>
      <SelectQualifier
        value={props.state.qualifier}
        onChange={props.presenter.onQualifierChange}
      />
      <div className="flex justify-end gap-2">
        <button
          className="rounded bg-gray-400 px-3 py-1 text-sm text-white hover:bg-gray-500"
          onClick={props.onCancel}
        >
          Cancel
        </button>
        <button
          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-40"
          disabled={props.state.vocabularyPicker.value === null}
          onClick={props.onConfirm}
        >
          Add
        </button>
      </div>
    </div>
  );
}
