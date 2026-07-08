import type { Operation } from '../../graph/types.ts';
import { Operation as OperationValue } from '../../graph/types.ts';

export function isValidRedirectOperation(source: Operation, target: Operation): boolean {
  if (source === OperationValue.Create) {
    return target === OperationValue.ReadList || target === OperationValue.ReadDetail;
  }

  if (source === OperationValue.Update) {
    return target === OperationValue.ReadList || target === OperationValue.ReadDetail;
  }

  if (source === OperationValue.Delete) {
    return target === OperationValue.ReadList;
  }

  return false;
}

export function isValidTransitionOperation(source: Operation, target: Operation): boolean {
  if (source === OperationValue.ReadList) {
    return (
      target === OperationValue.Create ||
      target === OperationValue.ReadDetail ||
      target === OperationValue.Update ||
      target === OperationValue.Delete
    );
  }

  if (source === OperationValue.ReadDetail) {
    return (
      target === OperationValue.ReadList ||
      target === OperationValue.ReadDetail ||
      target === OperationValue.Update ||
      target === OperationValue.Delete
    );
  }

  return false;
}

export function requiresSameClassTransition(source: Operation, target: Operation): boolean {
  return (
    (source === OperationValue.ReadList &&
      (target === OperationValue.Create ||
        target === OperationValue.Update ||
        target === OperationValue.Delete)) ||
    (source === OperationValue.ReadDetail &&
      (target === OperationValue.Update || target === OperationValue.Delete))
  );
}

export function requiresSameClassOrAssociationTransition(
  source: Operation,
  target: Operation
): boolean {
  return (
    (source === OperationValue.ReadList && target === OperationValue.ReadDetail) ||
    (source === OperationValue.ReadDetail && target === OperationValue.ReadDetail)
  );
}
