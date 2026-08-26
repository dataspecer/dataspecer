import { Operation } from '@dataspecer/app-generator/graph';

export const OPERATION_LABELS: Record<Operation, string> = {
  [Operation.Create]: 'Create',
  [Operation.ReadList]: 'Read (list)',
  [Operation.ReadDetail]: 'Read (detail)',
  [Operation.Update]: 'Update',
  [Operation.Delete]: 'Delete',
};

/** Badge classes on the node card. */
export const OPERATION_BADGE: Record<Operation, string> = {
  [Operation.Create]: 'bg-green-100 text-green-800',
  [Operation.ReadList]: 'bg-sky-100 text-sky-800',
  [Operation.ReadDetail]: 'bg-sky-100 text-sky-800',
  [Operation.Update]: 'bg-amber-100 text-amber-800',
  [Operation.Delete]: 'bg-red-100 text-red-800',
};

/** Minimap fill, so the graph keeps its shape at minimap size. */
export const OPERATION_FILL: Record<Operation, string> = {
  [Operation.Create]: '#86efac',
  [Operation.ReadList]: '#7dd3fc',
  [Operation.ReadDetail]: '#7dd3fc',
  [Operation.Update]: '#fcd34d',
  [Operation.Delete]: '#fca5a5',
};
