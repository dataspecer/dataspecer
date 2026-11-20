import { Ref, useEffect, useRef } from "react";
import { LanguageStringInputState } from "./language-string-input-state";
import { LanguageBar } from "./language-bar";
import { LanguageStringInputPresenter } from "./language-string-input-presenter";

export function LanguageStringInput(props: {
  /**
   * Component state.
   */
  state: LanguageStringInputState,
  presenter: LanguageStringInputPresenter,
  /**
   * Placeholder to show when there is no input.
   */
  placeholder: string,
  /**
   * True to support multiline input.
   */
  multiline?: boolean,
  /**
   * True to disable all inputs and render in read-only mode.
   */
  disabled?: boolean,
  /**
   * True to autofocus on mount.
   */
  autoFocus?: boolean,
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const { state, presenter } = props;
  const value = state.active === null ? "" : state.values[state.active].value;

  // Focus the input when autoFocus is true.
  useEffect(() => {
    if (props.autoFocus) {
      const timeoutId = setTimeout(() => ref.current?.focus(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [props.autoFocus]);

  return (
    <div>
      <LanguageBar
        state={state}
        disabled={props.disabled}
        onSelect={presenter.onSelect}
        onAddLanguage={presenter.onAddLanguage}
        onRemoveLanguage={presenter.onRemoveLanguage}
      />
      {props.multiline ?
        <textarea
          ref={ref as Ref<HTMLTextAreaElement>}
          placeholder={props.placeholder}
          disabled={props.disabled}
          value={value}
          rows={3}
          className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          onChange={event => presenter.onChange(event.target.value)}
        />
        :
        <input
          ref={ref as Ref<HTMLInputElement>}
          placeholder={props.placeholder}
          disabled={props.disabled}
          type="text"
          value={value}
          className="w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          onChange={event => presenter.onChange(event.target.value)}
        />
      }
    </div>
  )
}
