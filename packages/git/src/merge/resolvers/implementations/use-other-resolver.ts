import { MergeResolverStrategy } from "../merge-resolver-strategy.ts";

export class UseOtherMergeResolverStrategy implements MergeResolverStrategy {
  private label: string = "Copy left to right";
  getLabel(): string {
    return this.label;
  }
  private key: string = "use-other-resolver";
  getKey(): string {
    return this.key;
  }

  resolve(otherInput: string, editableInput: string, type: string | null, format: string): string {
    return otherInput;
  }
}