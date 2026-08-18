import { useCallback, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, MousePointerClick } from "lucide-react";

import { useApplicationState } from "../../core/application/application-react";
import { CmeProviderEvent } from "../../core/cme-provider/cme-provider";
import { useCmeProviders } from "../../core/cme-provider";
import { SelectionApi } from "../../core/application/application-selection-api";
import { SelectedEntity } from "../../core/application/application-state";
import { isCmeVocabularyStateEvent } from "../../features/vocabulary-model/cme-vocabulary-provider";
import {
  CmeVocabularyClass,
  CmeVocabularyGeneralization,
  CmeVocabularyRelation,
} from "../../features/vocabulary-model/cme-vocabulary-model";
import { entityViewPreviewRegistry } from "../../core/entity-view";

export function EntityView(props: {

}) {

  // TODO We should not use the feature directly here!
  const [state, setState] = useState<{

    classes: CmeVocabularyClass[];

    relationships: CmeVocabularyRelation[];

    generalizations: CmeVocabularyGeneralization[];

  }>({
    classes: [],
    relationships: [],
    generalizations: [],
  });

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const application = useApplicationState();

  const updateState = useCallback((event: CmeProviderEvent) => {
    if (isCmeVocabularyStateEvent(event)) {
      setState(previous => ({
        ...previous,
        classes: event.classes,
        relationships: event.relationships,
        generalizations: event.generalizations,
      }));
    }
  }, [setState]);

  useCmeProviders(updateState);

  // Check if something is selected.
  const selection = application.state.selection;
  if (selection.length === 0) {
    return (
      <EmptySelection />
    );
  }

  // Next we check for focus.
  if (focusedIndex !== null) {
    // We make sure index is in the bounds.
    const index = focusedIndex & selection.length;
    const onBack = () => setFocusedIndex(null);
    const onPrevious = () => setFocusedIndex(index - 1 % selection.length);
    const onNext = () => setFocusedIndex(index - 1 % selection.length);
    return (
      <>
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft size={13} />
            Back to selection ({selection.length})
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-zinc-500">
              {index + 1} of {selection.length}
            </span>
            <button
              onClick={onPrevious}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={onNext}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div>
          FOCUSED: {index}
        </div>
      </>
    )
  }

  // Not it is just about how many entities we have selected.
  if (selection.length === 1) {
    return (
      <SingleEntitySelection />
    );
  } else {
    return (
      <MultipleEntitiesSelection
        selection={selection}
        selectionApi={application.selectionApi}
        onFocus={setFocusedIndex}
      />
    );
  }
}

function EmptySelection() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-600">
      <MousePointerClick size={22} />
      <div className="text-[12.5px]">Select an entity to edit, or select several for bulk actions.</div>
    </div>
  );
}

function SingleEntitySelection() {
  return (
    <div>
      ...
    </div>
  )
}

function MultipleEntitiesSelection(props: {
  selection: SelectedEntity[],
  selectionApi: SelectionApi,
  onFocus: (index: number) => void,
}) {
  const { selection, selectionApi } = props;

  const deselectAll = () => selectionApi.set([]);

  const contributions = entityViewPreviewRegistry.list();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-red-500/5 px-3 py-2 text-[12px]">
        <span className="text-zinc-300">{selection.length} selected</span>
        <div className="flex items-center gap-3">
          <button onClick={deselectAll} className="text-zinc-500 hover:text-zinc-300">
            Deselect all
          </button>
          {/*
          <button className="flex items-center gap-1 text-red-400 hover:text-red-300">
            <Trash2 size={12} />
            Delete
          </button>
          */}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {
          selection.map((item, index) => (
            <div
              key={item.model + ":" + item.entity}
              onClick={() => props.onFocus(index)}
            >
              {item.model} : {item.entity}
            </div>
          ))
        }
      </div>
    </div>
  )
}

/*
function EntityDetail({ entity, nav }) {
  const config = TYPE_CONFIG[entity.type];
  const Icon = config.icon;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${config.accent}1a`, color: config.accent }}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
        <div>
          <div className="text-[15px] font-medium text-zinc-100">{entity.label}</div>
          <div className="text-[12px] text-zinc-500">{config.label}</div>
        </div>
        <div className="mt-2 rounded-md border border-dashed border-zinc-700 px-4 py-3 text-[12px] text-zinc-500">
          Detail / edit form — stub
        </div>
      </div>
    </div>
  );
}
*/

/*
function SelectionListRow({ entity, onFocus, onToggle }) {
  const config = TYPE_CONFIG[entity.type];
  const Icon = config.icon;

  return (
    <div
      onClick={() => onFocus(entity.id)}
      className="group flex h-9 cursor-pointer items-center gap-2 border-b border-zinc-900 px-3 hover:bg-zinc-900/70"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(entity.id);
        }}
        className="flex h-4 w-4 shrink-0 items-center justify-center text-red-400"
      >
        <CheckSquare size={14} />
      </button>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
        style={{ color: config.accent }}
      >
        <Icon size={13} strokeWidth={2} />
      </span>
      <span className="flex-1 truncate text-[13px] text-zinc-200">{entity.label}</span>
      <span className="shrink-0 text-[11px] text-zinc-600">{config.label}</span>
      <ChevronRight size={13} className="shrink-0 text-zinc-700 group-hover:text-zinc-500" />
    </div>
  );
}
*/
