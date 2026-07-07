import { ChangeEvent } from "react";
import { t } from "../../../application";
import { SelectPresenter } from "./select-presenter";
import { SelectState } from "./select-state";

const NOT_SELECTED = "n/a";

export function Select(props: {
  state: SelectState,
  presenter: SelectPresenter,
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
          {t(item.label)}
        </option>
      ))}
    </select>
  )
}
