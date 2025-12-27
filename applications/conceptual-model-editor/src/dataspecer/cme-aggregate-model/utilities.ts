import {
  EntityDsIdentifier,
  LanguageString,
  ModelDsIdentifier,
} from "../entity-model";

/**
 * Resolve values for given properties from sources.
 */
export function resolveSources<
  Type extends { identifier: EntityDsIdentifier },
  SemanticType extends Type,
  ProfileType extends Type,
>(
  semanticMap: { [identifier: EntityDsIdentifier]: SemanticType },
  profileMap: { [identifier: EntityDsIdentifier]: ProfileType },
  sourceGetter: (item: ProfileType) => EntityDsIdentifier | null,
  semanticValueGetter: (item: SemanticType) => LanguageString | null,
  profileValueGetter: (item: ProfileType) => LanguageString | null,
  aggregateSetter: (item: ProfileType, value: LanguageString | null) => ProfileType,
): void {
  const cache: { [identifier: ModelDsIdentifier]: (LanguageString | null) } = {};
  let resolved = true;
  while (resolved) {
    resolved = false;
    // We just iterate over again and again resolving all we need.
    // Performance can be improved later on.
    Object.values(profileMap).forEach(item => {
      // If the value is in cache, it has already been resolved.
      if (cache[item.identifier] !== undefined) {
        return;
      }
      // If the source is null we can just set the value.
      const source = sourceGetter(item);
      if (source === null) {
        const value = profileValueGetter(item);
        profileMap[item.identifier] = aggregateSetter(item, value);
        cache[item.identifier] = value;
        resolved = true;
        return;
      }
      // Try to read value from the cache.
      const cachedValue = cache[source];
      if (cachedValue !== undefined) {
        profileMap[item.identifier] = aggregateSetter(item, cachedValue);
        cache[item.identifier] = cachedValue;
        resolved = true;
      }
      // Value may be in the semanticMap.
      const semanticItem = semanticMap[source];
      if (semanticItem !== undefined) {
        const semanticValue = semanticValueGetter(semanticItem);
        profileMap[item.identifier] = aggregateSetter(item, semanticValue);
        cache[item.identifier] = semanticValue;
        resolved = true;
      }
      // We try next time again.
    });
  }
}
