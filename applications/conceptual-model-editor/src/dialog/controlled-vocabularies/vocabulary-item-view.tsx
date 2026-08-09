import { SelectQualifier } from "../components/select-qualifier";
import { VocabularyItemPresenter } from "./vocabulary-item-presenter";
import { VocabularyItemState } from "./vocabulary-item-state";

export function VocabularyItemView(props: {
  state: VocabularyItemState;
  presenter: VocabularyItemPresenter;
  onRemove?: () => void;
}) {
  const inherited = props.state.inherited;
  const qualifierDisabled = inherited !== null && !inherited.overrideEnabled;
  const effectiveQualifier = qualifierDisabled ? null : props.state.qualifier;

  return (
    <div className="rounded border bg-white p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2 min-w-0">
          <p className="font-semibold shrink-0">{props.state.vocabulary.name}</p>
          <p className="text-sm text-gray-500 truncate">{props.state.vocabulary.iri}</p>
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
          inherited={inherited?.qualifier}
          disabled={qualifierDisabled}
          onChange={props.presenter.onQualifierChange}
        />
        {inherited !== null && (
          <label className="flex items-center gap-1 text-sm text-nowrap">
            <input
              type="checkbox"
              checked={inherited.overrideEnabled}
              onChange={props.presenter.onOverrideToggle}
            />
            Change in profile
          </label>
        )}
      </div>
    </div>
  );
}
