import { useEffect, useMemo, useState } from "react";
import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { ControlledVocabularyOverride, ControlledVocabularyUsage, ControlledVocabulary } from "./controlled-vocabulary-model";
import { VocabularyItem } from "./vocabulary-item";
import { AddVocabularyForm } from "./add-vocabulary-form";

/**
 * Class profile can only contain 1 controlled vocabulary assignment if the qualifier is MUST
 * This function validates it accross all CV assignements in the profile
 */
function hasMustConflict(
  inherited: ControlledVocabularyUsage[],
  overrides: ControlledVocabularyOverride[],
  added: ControlledVocabularyUsage[],
): boolean {
  const effectiveQualifiers: Qualifier[] = [
    ...inherited.map(u => {
      const override = overrides.find(o => o.vocabularyId === u.vocabulary.id);
      return override ? override.qualifier : u.qualifier;
    }),
    ...added.map(u => u.qualifier),
  ];

  const totalCount = effectiveQualifiers.length;
  const mustCount = effectiveQualifiers.filter(q => q === "MUST").length;
  return mustCount > 0 && totalCount > 1;
}

export function SelectControlledVocabularies(props: {
  inherited: ControlledVocabularyUsage[];
  overrides: ControlledVocabularyOverride[];
  added: ControlledVocabularyUsage[];
  availableVocabularies: ControlledVocabulary[];
  onOverridesChange: (overrides: ControlledVocabularyOverride[]) => void;
  onAddedChange: (added: ControlledVocabularyUsage[]) => void;
  onValidityChange: (isValid: boolean) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);

  const hasConflict = useMemo(
    () => hasMustConflict(props.inherited, props.overrides, props.added),
    [props.inherited, props.overrides, props.added],
  );

  useEffect(() => {
    props.onValidityChange(!hasConflict);
  }, [hasConflict, props.onValidityChange]);

  const onOverrideToggle = (vocabularyId: string, currentlyEnabled: boolean) => {
    if (currentlyEnabled) {
      // disable the override -> remove from the overrides list
      props.onOverridesChange(props.overrides.filter(o => o.vocabularyId !== vocabularyId));
    } else {
      // enable override -> add a new override with the inherited value of qualifier
      const inherited = props.inherited.find(u => u.vocabulary.id === vocabularyId);
      if (inherited === undefined) {
        return;
      }
      props.onOverridesChange([
        ...props.overrides,
        { vocabularyId, qualifier: inherited.qualifier },
      ]);
    }
  };

  const onOverrideQualifierChange = (vocabularyId: string, qualifier: Qualifier) => {
    props.onOverridesChange(
      props.overrides.map(o => o.vocabularyId === vocabularyId ? { ...o, qualifier } : o),
    );
  };

  const onAddedQualifierChange = (index: number, qualifier: Qualifier) => {
    props.onAddedChange(
      props.added.map((u, i) => i === index ? { ...u, qualifier } : u),
    );
  };

  const onRemoveAdded = (index: number) => {
    props.onAddedChange(props.added.filter((_, i) => i !== index));
  };

  const onAdd = (usage: ControlledVocabularyUsage) => {
    props.onAddedChange([...props.added, usage]);
    setIsAdding(false);
  };

  const showAddButton = !isAdding && !hasConflict;

  return (
    <div className="flex flex-col gap-3">

      {props.inherited.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">From profiled</p>
          {props.inherited.map(usage => {
            const override = props.overrides.find(o => o.vocabularyId === usage.vocabulary.id);
            const overrideEnabled = override !== undefined;
            return (
              <VocabularyItem
                key={usage.vocabulary.id}
                vocabulary={usage.vocabulary}
                qualifier={override?.qualifier ?? usage.qualifier}
                inherited={usage.qualifier}
                overrideEnabled={overrideEnabled}
                onQualifierChange={q => onOverrideQualifierChange(usage.vocabulary.id, q)}
                onOverrideToggle={() => onOverrideToggle(usage.vocabulary.id, overrideEnabled)}
              />
            );
          })}
        </div>
      )}

      {props.added.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">In this profile</p>
          {props.added.map((usage, index) => (
            <VocabularyItem
              key={index}
              vocabulary={usage.vocabulary}
              qualifier={usage.qualifier}
              onQualifierChange={q => onAddedQualifierChange(index, q)}
              onRemove={() => onRemoveAdded(index)}
            />
          ))}
        </div>
      )}

      {hasConflict && (
        <p className="text-sm text-red-600">
          A profile cannot contain more than one controlled vocabulary when one has a MUST qualifier.
          Remove the others or change the MUST qualifier to continue.
        </p>
      )}

      {isAdding && (
        <AddVocabularyForm
          availableVocabularies={props.availableVocabularies}
          onAdd={onAdd}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {showAddButton && (
        <button
          className="self-start rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
          onClick={() => setIsAdding(true)}
        >
          + Add controlled vocabulary
        </button>
      )}
    </div>
  );
}
