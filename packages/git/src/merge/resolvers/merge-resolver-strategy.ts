/**
 * This interface contains methods, which are used in case of merge conflict resolving.
 */
export interface MergeResolverStrategy {
  getLabel(): string;
  getKey(): string;

  /**
   * The inputs should probably have projectIris instead of iris and not be stripped.
   * @param otherInput is the input which is not supposed to be modified.
   * @param editableInput is the input which is supposed to be modified (edited).
   * @returns How should the {@link editableInput} look after performing the implemented merge resolver strategy.
   */
  resolve(otherInput: string, editableInput: string, type: string | null, format: string): string;
}