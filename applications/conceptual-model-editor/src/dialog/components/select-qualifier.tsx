import { useId } from "react";
import { cn } from "./style";

export enum Qualifier {
  Must = "MUST",
  AtLeastOne = "AT_LEAST_1",
  Recommended = "RECOMMENDED",
  May = "MAY",
}

const QUALIFIERS = [
  Qualifier.Must,
  Qualifier.AtLeastOne,
  Qualifier.Recommended,
  Qualifier.May,
];

const QUALIFIER_LABELS: Record<Qualifier, string> = {
  [Qualifier.Must]: "MUST",
  [Qualifier.AtLeastOne]: "AT LEAST 1",
  [Qualifier.Recommended]: "RECOMMENDED",
  [Qualifier.May]: "MAY",
};

// Stricter qualifiers come first - a qualifier is disabled if it is less strict than inherited.
const QUALIFIER_STRICTNESS: Record<Qualifier, number> = {
  [Qualifier.Must]: 0,
  [Qualifier.AtLeastOne]: 1,
  [Qualifier.Recommended]: 2,
  [Qualifier.May]: 3,
};

function isDisabledByInherited(option: Qualifier, inherited: Qualifier): boolean {
  return QUALIFIER_STRICTNESS[option] > QUALIFIER_STRICTNESS[inherited];
}

// Select usage qualifier for controlled vocabulary
// If the inherited value is specified, the user can select only the options that are stricter than the inherited option 
// - so if recommended is selected, the may option is disabled, the other 3 are enabled. 
// If the value is different from inherited, the inherited option is highlighted visually.

export function SelectQualifier(props: {
  value: Qualifier | null,
  inherited?: Qualifier | null,
  disabled?: boolean,
  name?: string,
  onChange: (value: Qualifier) => void,
}) {
  const groupName = props.name ?? useId();
  return (
    <fieldset className="flex flex-row flex-wrap gap-x-3">
      {QUALIFIERS.map(qualifier => {
        const effectiveValue = props.value ?? props.inherited ?? null;
        const disabledByInherited =
          props.inherited != null && isDisabledByInherited(qualifier, props.inherited);
        const isDisabled = props.disabled || disabledByInherited;
        const isInherited = props.inherited != null && qualifier === props.inherited;

        return (
          <div className="flex items-center" key={qualifier}>
            <input
              type="radio"
              id={`${groupName}-${qualifier}`}
              name={groupName}
              value={qualifier}
              checked={effectiveValue === qualifier}
              disabled={isDisabled}
              onChange={() => props.onChange(qualifier)}
            />
            <label
              htmlFor={`${groupName}-${qualifier}`}
              className={cn(
                "ml-1 font-mono text-sm cursor-pointer",
                isDisabled && "opacity-40 cursor-default",
                isInherited && "underline decoration-dotted",
                effectiveValue === qualifier && "font-bold",
              )}
              title={isInherited ? `Inherited: ${QUALIFIER_LABELS[qualifier]}` : undefined}
            >
              {QUALIFIER_LABELS[qualifier]}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
