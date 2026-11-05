import { ChangeEvent } from "react";

import { SelectModelState } from "./select-model-state";
import { SelectModelPresenter } from "./select-model-presenter";

/**
 * Let user select a model from given list.
 */
export const SelectModel = (props: {
  state: SelectModelState,
  presenter: SelectModelPresenter,
  /**
   * Placeholder to show when value is null.
   */
  placeholder: string,
  /**
   * When true render in read only mode.
   */
  disabled?: boolean,
}) => {

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const identifier = event.target.value;
    for (const item of props.state.items) {
      if (item.identifier !== identifier) {
        continue
      }
      // Report a change.
      props.presenter.onChange(item);
      break;
    }
  };

  return (
    <div className="relative">
      <select
        className="w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-xs transition-colors focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        name="semantic-model"
        id="semantic-model"
        onChange={onChange}
        value={props.state.value?.identifier ?? ""}
        disabled={props.disabled}
      >
        {props.state.value === null ? (
          <option value="" disabled>{props.placeholder}</option>
        ) : null}
        {props.state.items.map(item => (
          <option key={item.identifier} value={item.identifier}>
            {item.displayLabel}
          </option>
        ))}
      </select>
    </div>
  );
};
