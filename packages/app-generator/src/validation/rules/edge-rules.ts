import { Operation } from '../../graph/types.ts';

export function isValidRedirectOperation(source: Operation, target: Operation): boolean {
  if (source === Operation.Create) {
    return target === Operation.ReadList || target === Operation.ReadDetail;
  }

  if (source === Operation.Update) {
    return target === Operation.ReadList || target === Operation.ReadDetail;
  }

  if (source === Operation.Delete) {
    return target === Operation.ReadList;
  }

  return false;
}

export function isValidTransitionOperation(source: Operation, target: Operation): boolean {
  if (source === Operation.ReadList) {
    return (
      target === Operation.Create ||
      target === Operation.ReadDetail ||
      target === Operation.Update ||
      target === Operation.Delete
    );
  }

  if (source === Operation.ReadDetail) {
    return (
      target === Operation.ReadList ||
      target === Operation.ReadDetail ||
      target === Operation.Update ||
      target === Operation.Delete
    );
  }

  return false;
}

export function requiresSameClassTransition(source: Operation, target: Operation): boolean {
  return (
    (source === Operation.ReadList &&
      (target === Operation.Create ||
        target === Operation.Update ||
        target === Operation.Delete)) ||
    (source === Operation.ReadDetail &&
      (target === Operation.Update || target === Operation.Delete))
  );
}

export function requiresSameClassOrAssociationTransition(
  source: Operation,
  target: Operation,
): boolean {
  return (
    (source === Operation.ReadList && target === Operation.ReadDetail) ||
    (source === Operation.ReadDetail && target === Operation.ReadDetail)
  );
}
