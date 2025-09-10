import { mergeResolverStrategies, MergeResolverStrategy } from "@dataspecer/git"
import { Button } from "./ui/button"
import { useState } from "react";

export const MergeStrategyComponent = (props: {handleMergeStateResolving: (mergeStrategy: MergeResolverStrategy) => void}) => {
  const [mergeStrategy, setMergeStrategy] = useState<MergeResolverStrategy>(mergeResolverStrategies[0]);

  return <div className="flex flex-row">
    <label htmlFor="merge-strategy" className="font-black text-base py-1 px-2">
      Merge strategy:
    </label>
    <select id="merge-strategy-select"
      className="text-base text-gray-900 bg-gray-100 border
        border-gray-300 shadow-[inset_1px_1px_0_#fff] focus:outline-none focus:ring-0 "
      value={mergeStrategy.key}
      onChange={(event) => setMergeStrategy(mergeResolverStrategies.find(strategy => strategy.key === event.target.value)!)}>
      {
        mergeResolverStrategies.map(strategy => {
          return <option value={strategy.key}>
              {strategy.label}
            </option>;
        })
      }
    </select>
    <Button onClick={() => props.handleMergeStateResolving(mergeStrategy)} className="p-2 bg-blue-500 text-white rounded">Resolve using merge strategy</Button>
  </div>
}