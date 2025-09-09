import { MergeResolverStrategy } from "../merge-resolver-strategy.ts";

export class UseOtherMergeResolverStrategy implements MergeResolverStrategy {
  label: string = "Use other merge resolver";
  key: string = "use-other-resolver";

  resolve(otherInput: string, editableInput: string): string {
    return otherInput;
  }
}