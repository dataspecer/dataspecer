import { MergeResolverStrategy } from "../merge-resolver-strategy.ts";


export class DoNothingMergeResolverStrategy implements MergeResolverStrategy {
  label: string = "Do nothing merge strategy";
  key = "do-nothing-resolver";

  resolve(otherInput: string, editableInput: string, type: string | null, format: string): string {
    return editableInput;
  }
}
