import type { ConfigurationChain, Configuration } from "./model.ts";

export function resolveConfigurationHelper<Input, Result>(
  configurations: ConfigurationChain,
  read: (configuration: Configuration) => Input | undefined,
  createDefault: () => Result,
  merge: (current: Result, input: Input) => Result
): Result {
  let result = createDefault();
  for (const configuration of configurations) {
    const input = read(configuration);
    if (input !== undefined) {
      result = merge(result, input);
    }
  }
  return result;
}

export function mergeShallowConfigurationHelper<T extends object>(
  current: T,
  input: Partial<T>,
  undefinedValues: "assign" | "skip" = "assign",
): T {
  if (undefinedValues === "assign") {
    return { ...current, ...input };
  }
  return {
    ...current,
    ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)),
  };
}

/** Legacy deep patch semantics: undefined deletes a property; arrays replace. */
export function mergeConfigurationPatch(target: any, patch: any): any {
  if (
    typeof target === "object" && !Array.isArray(target) &&
    typeof patch === "object" && !Array.isArray(patch)
  ) {
    const result = { ...target };
    for (const key in patch) {
      if (patch[key] === undefined) {
        delete result[key];
      } else {
        result[key] = mergeConfigurationPatch(result[key], patch[key]);
      }
    }
    return result;
  }
  return patch;
}

