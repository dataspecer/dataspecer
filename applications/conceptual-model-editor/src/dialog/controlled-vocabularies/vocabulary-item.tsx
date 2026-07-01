import { Qualifier, SelectQualifier } from "../components/select-qualifier";
import { Vocabulary } from "./vocabulary";

export function VocabularyItem(props: {
  vocabulary: Vocabulary;
  qualifier: Qualifier;
  inherited?: Qualifier;
  overrideEnabled?: boolean;
  onQualifierChange: (qualifier: Qualifier) => void;
  onRemove?: () => void;
  onOverrideToggle?: () => void;
}) {
  const showOverrideCheckbox = props.onOverrideToggle !== undefined;
  const qualifierDisabled = showOverrideCheckbox && !props.overrideEnabled;
  const effectiveQualifier = qualifierDisabled ? null : props.qualifier;

  return (
    <div className="rounded border bg-white p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2 min-w-0">
          <p className="font-semibold shrink-0">{props.vocabulary.name}</p>
          <p className="text-sm text-gray-500 truncate">{props.vocabulary.iri}</p>
        </div>
        {props.onRemove && (
          <button
            className="ml-4 rounded bg-red-500 px-2 py-1 text-sm text-white hover:bg-red-600"
            onClick={props.onRemove}
          >
            Remove
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-4">
        <SelectQualifier
          value={effectiveQualifier}
          inherited={props.inherited}
          disabled={qualifierDisabled}
          onChange={props.onQualifierChange}
        />
        {showOverrideCheckbox && (
          <label className="flex items-center gap-1 text-sm text-nowrap">
            <input
              type="checkbox"
              checked={props.overrideEnabled ?? false}
              onChange={props.onOverrideToggle}
            />
            Change in profile
          </label>
        )}
      </div>
    </div>
  );
}
