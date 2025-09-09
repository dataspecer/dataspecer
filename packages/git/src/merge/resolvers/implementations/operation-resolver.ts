import { MergeResolverStrategy } from "../merge-resolver-strategy.ts";

export class OperationMergeResolverStrategy implements MergeResolverStrategy {
  resolve(otherInput: string, editableInput: string): string {
    return editableInput;
  }
}