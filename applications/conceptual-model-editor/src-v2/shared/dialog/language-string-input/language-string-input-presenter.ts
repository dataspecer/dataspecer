import { LanguageStringInputState } from "./language-string-input-state";

export function createLanguageStringInputPresenter(
  setState: (next: (state: LanguageStringInputState)
    => LanguageStringInputState) => void,
): LanguageStringInputPresenter {
  return {
    onChange(value) {
      setState(state => onChange(state, value))
    },
    onSelect(language) {
      setState(state => onSelect(state, language))
    },
    onAddLanguage(language) {
      setState(state => onAddLanguage(state, language))
    },
    onRemoveLanguage(language) {
      setState(state => onRemoveLanguage(state, language))
    },
  }
}

export interface LanguageStringInputPresenter {

  onChange(value: string): void;

  onSelect(language: string): void;

  onAddLanguage(language: string): void;

  onRemoveLanguage(language: string): void;

}

function onChange(
  state: LanguageStringInputState, value: string,
): LanguageStringInputState {
  if (state.active === null) {
    return {
      ...state,
      active: 0,
      values: [{
        language: state.defaultLanguage,
        value
      }],
    }
  }
  return {
    ...state, values: [
      ...state.values.slice(0, state.active),
      { language: state.values[state.active].language, value },
      ...state.values.slice(state.active + 1, state.values.length),
    ]
  };
}

function onSelect(
  state: LanguageStringInputState, language: string,
): LanguageStringInputState {
  const index = state.values.findIndex(item => item.language === language);
  if (index === -1) {
    return state;
  }
  return {
    ...state,
    active: index,
  }
}

function onAddLanguage(
  state: LanguageStringInputState, language: string,
): LanguageStringInputState {
  const index = state.values.findIndex(item => item.language === language);
  if (index === -1) {
    return {
      ...state,
      active: state.values.length,
      values: [
        ...state.values,
        { language, value: "" },
      ]
    };
  } else {
    return {
      ...state,
      active: index,
    }
  }
}

function onRemoveLanguage(
  state: LanguageStringInputState, language: string,
): LanguageStringInputState {
  const values = state.values.filter(item => item.language !== language);
  if (values.length === 0) {
    return {
      ...state,
      active: null,
      values,
    }
  } else {
    return {
      ...state,
      active: Math.min(state.active ?? 0, values.length - 1),
      values,
    }
  }
}

