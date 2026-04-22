import { MergeResolverStrategy } from "../merge-resolver-strategy.ts";

export class UseOtherMergeResolverStrategy implements MergeResolverStrategy {
  label: string = "Copy left to right";
  key: string = "use-other-resolver";

  resolve(otherInput: string, editableInput: string, type: string | null, format: string): string {
    return otherInput;
  }
}