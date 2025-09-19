/**
 * Add item, using given identifier, to respective bucket.
 * The bucket is an array in a map.
 *
 * @example
 * const buckets : Map<string, any> = new Map();
 * addToRecordArray("bucket", {}, buckets);
 */
export function addToMapArray<IdentifierType extends string, ValueType>(
  identifier: IdentifierType,
  value: ValueType,
  map: Map<IdentifierType, ValueType[]>,
): void {
  let array = map.get(identifier);
  if (array === undefined) {
    array = [];
    map.set(identifier, array);
  }
  array.push(value);
}

/**
 * Remove {@link valueToRemove}, using given {@link identifier},
 * from respective bucket.
 *
 * If the bucket becomes or was empty, then it is deleted.
 *
 * If the given {@link valueToRemove} is not present in the bucket,
 * nothing happens.
 */
export function removeFromMapArray<IdentifierType extends string, ValueType>(
  map: Map<IdentifierType, ValueType[]>,
  identifier: IdentifierType,
  valueToRemove: ValueType
) {
  const result = map.get(identifier)?.filter(value => value !== valueToRemove);
  if(result === undefined) {
    return;
  }
  if(result?.length === 0) {
    map.delete(identifier);
  }
  else {
    map.set(identifier, result);
  }
}
