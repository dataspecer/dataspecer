import { useOptions } from "../../configuration/options";
import { getLocalizedStringFromLanguageString } from "../../util/language-utils";
import { SelectQualifier } from "../components/select-qualifier";
import { VocabularyItemPresenter } from "./vocabulary-item-presenter";
import { VocabularyItemState } from "./vocabulary-item-state";

export function VocabularyItemView(props: {
  state: VocabularyItemState;
  presenter: VocabularyItemPresenter;
  onRemove?: () => void;
  isDuplicate?: boolean;
}) {
  const { language } = useOptions();
  const inherited = props.state.inherited;
  const qualifierDisabled = inherited !== null && !inherited.overrideEnabled;
  const effectiveQualifier = qualifierDisabled ? null : props.state.qualifier;
  const reference = props.state.vocabulary;
  const isMissing = reference.state === "not_found";

  return (
    <div
      className={`rounded border p-3 ${
        props.isDuplicate || isMissing ? "border-red-400 bg-red-50" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2 min-w-0">
          {reference.state === "not_found" ? (
            <p className="font-semibold truncate" title={reference.vocabularyId}>
              {reference.vocabularyId}
            </p>
          ) : (
            <>
              <p className="font-semibold shrink-0">{getLocalizedStringFromLanguageString(reference.vocabulary.title, language)}</p>
              <p className="text-sm text-gray-500 truncate">{reference.vocabulary.references}</p>
            </>
          )}
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
      {isMissing && (
        <p className="mt-1 text-sm text-red-600">
          Vocabulary not found. It may have been deleted.
          {inherited !== null && " It is inherited, remove it in the profiled class."}
        </p>
      )}
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
