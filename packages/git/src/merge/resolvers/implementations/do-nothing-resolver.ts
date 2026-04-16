import { MergeResolverStrategy } from "../merge-resolver-strategy.ts";


export class DoNothingMergeResolverStrategy implements MergeResolverStrategy {
  label: string = "Do nothing merge strategy";
  getLabel(): string {
    return this.label;
  }
  key = "do-nothing-resolver";
  getKey(): string {
    return this.key;
  }

  resolve(otherInput: string, editableInput: string, type: string | null, format: string): string {
    return editableInput;
  }
}
