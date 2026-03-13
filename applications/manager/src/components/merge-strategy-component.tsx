import { mergeResolverStrategies, MergeResolverStrategy } from "@dataspecer/git";
import { Button } from "./ui/button";
import { useState } from "react";


// Improve the styling (margins and size) using Microsoft Copilot, that is why it is set in a "weird" way using join
export const MergeStrategyComponent = (props: {
  handleMergeStateResolving: (mergeStrategy: MergeResolverStrategy) => void;
}) => {
  const [mergeStrategy, setMergeStrategy] = useState<MergeResolverStrategy>(
    mergeResolverStrategies[0]
  );

  return (
    <div className="flex flex-row items-center gap-x-3 pt-0.75 pb-1.5">
      <select
        id="merge-strategy-select"
        className={[
          // compact height + predictable box model
          "h-9 box-border px-4 py-1.5",
          // typography: keep enough line-height for descenders
          "text-sm leading-5 text-gray-900",
          // visuals
          "bg-gray-50 border border-gray-300 rounded",
          "shadow-[inset_1px_1px_0_#fff]",
          // focus
          "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500",
          // native arrow retained (safer cross-browser)
          "appearance-auto"
        ].join(" ")}
        value={mergeStrategy.key}
        onChange={(event) =>
          setMergeStrategy(
            mergeResolverStrategies.find(
              (strategy) => strategy.key === event.target.value
            )!
          )
        }
      >
        {mergeResolverStrategies.map((strategy) => (
          <option key={strategy.key} value={strategy.key}>
            {strategy.label}
          </option>
        ))}
      </select>

      <Button
        onClick={() => props.handleMergeStateResolving(mergeStrategy)}
        className="h-9 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded"
      >
        Resolve using merge strategy
      </Button>
    </div>
  );
};
