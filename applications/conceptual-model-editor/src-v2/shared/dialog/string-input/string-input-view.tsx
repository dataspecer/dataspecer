import { StringInputPresenter } from "./string-input-presenter";
import { StringInputState } from "./string-input-state";

export function StringInput(props: {
  state: StringInputState,
  presenter: StringInputPresenter,
  /**
   * Placeholder to show when there is no selected item.
   */
  placeholder: string,
  /**
   * When true render in read only mode.
   */
  disabled?: boolean,
}) {
  return (
    <input
      placeholder={props.placeholder}
      disabled={props.disabled}
      type="text"
      value={props.state.value ?? ""}
      className="w-full"
      onChange={event => props.presenter.onChange(event.target.value)}
    />
  )
}
