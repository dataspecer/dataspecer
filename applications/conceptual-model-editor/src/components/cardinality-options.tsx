import type { SemanticModelRelationshipEnd } from "@dataspecer/core-v2/semantic-model/concepts";
import { OverrideFieldCheckbox } from "./input/override-field-checkbox";

const cardinalityOptionToCardinalityMap: {
    [K in CardinalityOptionType]: [number, number | null] | undefined;
} = {
  unset: undefined,
  "0x": [0, null],
  "01": [0, 1],
  "11": [1, 1],
  "1x": [1, null],
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore this really happens, cardinalities like this come from sgov
  "xx": [null, null],
};

const cardinalityOptionToStringMap: {
    [K in CardinalityOptionType]: string;
} = {
  unset: "unset",
  "0x": "0..*",
  "01": "0..1",
  "11": "1..1",
  "1x": "1..*",
  xx: "*..*",
};

const CardinalityOptionElement = (props: {
    group: string;
    value: CardinalityOptionType;
    checked?: boolean;
    disabled?: boolean;
    onSelected: () => void;
}) => {
  const { group, value, checked, disabled, onSelected } = props;
  const optionId = group + value;
  const displayName = cardinalityOptionToStringMap[value];
  return (
    <div className="mr-3">
      <input
        id={optionId}
        disabled={disabled}
        type="radio"
        value={value}
        name={props.group}
        onChange={onSelected}
        checked={checked}
      />
      <label className="ml-1 font-mono" htmlFor={props.group + value}>
        {displayName}
      </label>
    </div>
  );
};

type CardinalityOptionType = "unset" | "0x" | "01" | "11" | "1x" | "xx";

export const CardinalityOptions = (props: {
    group: "source" | "target";
    defaultCard?: [number, number | null] | null;
    setCardinality: (setter: <T = SemanticModelRelationshipEnd>(prev: T) => T) => void;
    disabled: boolean;
    onChange?: () => void;
    withOverride?: {
      callback: () => void;
      defaultValue: boolean;
    };
}) => {
  const { group, defaultCard, disabled, onChange, withOverride } = props;
  const defaultCardinality = semanticCardinalityToOption(defaultCard ?? null);

  const cardinalitySelected = (value: CardinalityOptionType) => {
    props.setCardinality((prev) => ({ ...prev, cardinality: cardinalityOptionToCardinalityMap[value] as any }));
  };

  return (
    <div className="flex flex-row">
      <fieldset id={props.group} className="flex flex-grow flex-row">
        {(["unset", "0x", "01", "11", "1x"] as CardinalityOptionType[]).map((k) => (
          <CardinalityOptionElement
            key={k + group}
            group={group}
            checked={defaultCardinality === k}
            disabled={disabled}
            value={k}
            onSelected={() => {
              cardinalitySelected(k);
              onChange?.();
            }}
          />
        ))}
      </fieldset>
      {withOverride && (
        <OverrideFieldCheckbox
          forElement={group + "override"}
          onChecked={withOverride.callback}
          defaultChecked={withOverride.defaultValue}
        />
      )}
    </div>
  );
};

const semanticCardinalityToOption = (value: null | [number, number | null]): CardinalityOptionType => {
  if (value === null) {
    return "unset";
  } else if (value[0] === 0 && value[1] === null) {
    return "0x";
  } else if (value[0] === 1 && value[1] === null) {
    return "1x";
  } else if (value[0] === 0 && value[1] === 1) {
    return "01";
  } else if (value[0] === 1 && value[1] === 1) {
    return "11";
  } else if (value[0] === null && value[1] === null) {
    return "xx";
  } else {
    console.error("unknown cardinality option for [" + value[0].toString() + "," + (value[1]?.toString() ?? ""));
    return "unset";
  }
};
