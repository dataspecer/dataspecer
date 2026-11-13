import { SelectCardinalityPresenter } from "./select-cardinality-presenter";
import { SelectCardinalityState } from "./select-cardinality-state";

export function SelectCardinality(props: {
  state: SelectCardinalityState,
  presenter: SelectCardinalityPresenter,
  /**
   * When true render in read only mode.
   */
  disabled?: boolean,
}) {
  const options = [
    { value: "0x", label: "0..*" },
    { value: "01", label: "0..1" },
    { value: "1x", label: "1..*" },
    { value: "11", label: "1..1" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((option) => {
        const active = props.state.value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={props.disabled}
            onClick={() => props.presenter.onChange(option.value)}
            className={[
              "flex items-center rounded-md border px-3 py-1 font-mono text-xs transition-colors",
              active
                ? "border-ring bg-accent text-accent-foreground font-semibold shadow-xs"
                : "border-input bg-background/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              props.disabled ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
