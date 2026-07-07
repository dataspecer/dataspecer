import { ChangeEvent } from "react";
import { t } from "../../../application";
import { SelectEntityPresenter } from "./select-entity-presenter";
import { SelectEntityState } from "./select-entity-state";

const NOT_SELECTED = "n/a";

export function SelectEntity(props: {
  state: SelectEntityState,
  presenter: SelectEntityPresenter,
  /**
   * Placeholder to show when there is no selected item.
   */
  placeholder: string,
  /**
   * When true render in read only mode.
   */
  disabled?: boolean,
}) {
  const value = props.state.value?.id ?? NOT_SELECTED;

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    props.presenter.onChange(event.target.value);
  };

  return (
    <select
      className="w-full"
      onChange={onChange}
      value={value}
    >
      {value === NOT_SELECTED ?
        <option disabled value={NOT_SELECTED}>
          {props.placeholder}
        </option>
        : null}
      {props.state.items.map(item => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  )
}
