import { useState } from "react";
import { Qualifier, SelectQualifier } from "../components/select-qualifier";
import { Vocabulary, VocabularyUsage } from "./controlled-vocabulary-model";

export function AddVocabularyForm(props: {
  availableVocabularies: Vocabulary[];
  onAdd: (usage: VocabularyUsage) => void;
  onCancel: () => void;
}) {
  const [selectedVocabularyId, setSelectedVocabularyId] = useState<string>("");
  const [qualifier, setQualifier] = useState<Qualifier>(Qualifier.AtLeastOne);

  const selectedVocabulary = props.availableVocabularies.find(v => v.id === selectedVocabularyId) ?? null;

  const onAdd = () => {
    if (selectedVocabulary === null) {
      return;
    }
    props.onAdd({ vocabulary: selectedVocabulary, qualifier });
  };

  return (
    <div className="rounded border-2 border-dashed border-indigo-400 p-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold">Select vocabulary:</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={selectedVocabularyId}
          onChange={e => setSelectedVocabularyId(e.target.value)}
        >
          <option value="">-- Choose a vocabulary --</option>
          {props.availableVocabularies.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>
      <SelectQualifier value={qualifier} onChange={setQualifier} />
      <div className="flex justify-end gap-2">
        <button
          className="rounded bg-gray-400 px-3 py-1 text-sm text-white hover:bg-gray-500"
          onClick={props.onCancel}
        >
          Cancel
        </button>
        <button
          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-40"
          disabled={selectedVocabulary === null}
          onClick={onAdd}
        >
          Add
        </button>
      </div>
    </div>
  );
}
