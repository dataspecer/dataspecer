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
      className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none disabled:cursor-not-allowed disabled:opacity-50"
      onChange={event => props.presenter.onChange(event.target.value)}
    />
  )
}
