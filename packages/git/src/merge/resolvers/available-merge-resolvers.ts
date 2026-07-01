import { DoNothingMergeResolverStrategy } from "./implementations/do-nothing-resolver.ts";
import { OperationMergeResolverStrategy } from "./implementations/operation-resolver.ts";
import { UseOtherMergeResolverStrategy } from "./implementations/use-other-resolver.ts";
import { MergeResolverStrategy } from "./merge-resolver-strategy.ts";

/**
 * List of available merge state resolver strategies. The items defined here will be shown in the diff editor as the combobox options.
 */
export const mergeResolverStrategies: MergeResolverStrategy[] = [
  new UseOtherMergeResolverStrategy(),
  // new OperationMergeResolverStrategy(),
  // new DoNothingMergeResolverStrategy(),
];