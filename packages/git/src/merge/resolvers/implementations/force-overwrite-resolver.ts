import { MergeResolverStrategy } from "../merge-resolver-strategy.ts";

export class ForceOverwriteMergeResolverStrategy implements MergeResolverStrategy {
  resolve(otherInput: string, editableInput: string): string {
    return editableInput;
  }
}
