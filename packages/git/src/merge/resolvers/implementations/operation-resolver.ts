import { MergeResolverStrategy } from "../merge-resolver-strategy.ts";

export class OperationMergeResolverStrategy implements MergeResolverStrategy {
  private label: string = "Operation merge strategy";
  getLabel(): string {
    return this.label;
  }
  private key: string = "operation-resolver";
  getKey(): string {
    return this.key;
  }

  resolve(otherInput: string, editableInput: string, type: string | null, format: string): string {
    return editableInput;
  }
}