/**
 * This interface contains methods, which are used in case of merge conflict resolving.
 */
export interface MergeResolverStrategy {
  label: string;
  key: string;

  /**
   * @param otherInput is the input which is not supposed to be modified.
   * @param editableInput is the input which is supposed to be modified (edited).
   * @returns How should the editableInput look after performing the implemented merge resolver strategy.
   */
  resolve(otherInput: string, editableInput: string): string;
}