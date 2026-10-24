import { SelectOptionPresenter } from "./select-option-presenter";
import { SelectOptionState } from "./select-option-state";
import { clsx } from "clsx"

export function SelectOption(props: {
  state: SelectOptionState,
  presenter: SelectOptionPresenter,
  /**
   * When true render in read only mode.
   */
  disabled?: boolean,
}) {

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {props.state.options.map((option) => {
        const active = props.state.value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={props.disabled}
            onClick={() => props.presenter.onChange(option.value)}
            className={clsx(
              "flex items-center rounded-md border px-3 py-1 font-mono text-xs transition-colors",
              {
                "border-ring bg-accent text-accent-foreground font-semibold shadow-xs": active,
                "border-input bg-background/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground": !active,
                "cursor-not-allowed opacity-50": props.disabled
              }
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
