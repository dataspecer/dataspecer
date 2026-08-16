import type { ComponentType } from 'react';

import type { OperationKind } from '../operations/operation-kind.ts';

/** One page of the application, as `routes.tsx` generates it from the application graph. */
export interface RouteDescriptor {
  id: string;
  nodeId: string;
  path: string;
  title: string;
  operation: OperationKind;
  requiresEntityId: boolean;
  component: ComponentType;
}
