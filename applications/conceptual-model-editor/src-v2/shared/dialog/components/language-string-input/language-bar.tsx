import { useState } from "react";
import { LanguageStringInputState } from "./language-string-input-state";

export function LanguageBar(props: {
  state: LanguageStringInputState,
  onSelect: (language: string) => void,
  onAddLanguage: (language: string) => void,
  onRemoveLanguage: (language: string) => void,
  disabled?: boolean,
}) {
  const { state } = props;
  return (
    <ul className="flex items-center gap-1 mb-2 text-xs">
      {state.values.map((value, index) => (
        <LanguageItem
          key={value.language}
          value={value.language}
          onSelect={props.onSelect}
          onRemoveLanguage={props.onRemoveLanguage}
          selected={state.active === index}
          disabled={props.disabled}
        />
      ))}
      {props.disabled ? null : <NewLanguageItem
        value={state.defaultLanguage}
        onAddLanguage={props.onAddLanguage}
      />}
    </ul>
  )
}

function LanguageItem(props: {
  value: string,
  selected: boolean,
  onSelect: (language: string) => void,
  onRemoveLanguage: (language: string) => void,
  disabled?: boolean,
}) {
  const label = props.value === "" ? "default" : props.value;
  return (
    <li
      className={[
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors border",
        props.selected
          ? "border-ring bg-accent text-accent-foreground font-semibold shadow-xs"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
      onClick={() => props.onSelect(props.value)}
    >
      <span>{label}</span>
      {props.selected && !props.disabled ? (
        <button
          className="text-muted-foreground hover:text-destructive text-[11px] leading-none ml-0.5 cursor-pointer"
          onClick={(event) => {
            props.onRemoveLanguage(props.value);
            event.stopPropagation();
          }}
          title="Remove language"
        >
          ✕
        </button>
      ) : null}
    </li>
  );
}

function NewLanguageItem(props: {
  value: string,
  onAddLanguage: (language: string) => void,
}) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState(props.value);

  const onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "Enter":
        onSubmit();
        event.stopPropagation();
        return;
      case "Escape":
        setActive(false);
        event.stopPropagation();
        return;
      default:
        return;
    }
  };

  const onSubmit = () => {
    if (value.trim() === "") {
      return;
    }
    setActive(false);
    setValue(props.value);
    props.onAddLanguage(value);
  };

  if (active) {
    return (
      <li>
        ➕ &nbsp;
        <input
          autoFocus
          value={value}
          size={4}
          onFocus={(event) => event.target.select()}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setActive(false)}
          onKeyUp={(event) => onKeyUp(event)}
        />
      </li>
    )
  } else {
    return (
      <li onClick={() => setActive(true)} >
        ➕
      </li>
    );
  }

}
