
export interface StringInputState {

  value: string | null;

}

/**
 * @returns null for null or an empty string.
 */
export function stringInputStateToString(
  state: StringInputState,
) : string | null {
  if (state.value === null || state.value.trim().length === 0) {
    return null;
  }
  return state.value;
}
