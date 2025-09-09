import { MergeResolverStrategy } from "../merge-resolver-strategy.ts";

export class OperationMergeResolverStrategy implements MergeResolverStrategy {
  label: string = "Operation merge strategy";
  key = "operation-resolver";

  resolve(otherInput: string, editableInput: string): string {
    return editableInput;
  }
}