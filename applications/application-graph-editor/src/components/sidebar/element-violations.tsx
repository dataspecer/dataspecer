import { ViolationSeverity } from '@dataspecer/app-generator/graph';
import { useValidation } from '@/hooks/use-validation.ts';
import { violationsFor } from '@/validation/violations.ts';
import { ViolationItem } from './violation-item.tsx';

/**
 * Problems of one node or edge.
 */
export function ElementViolations({ kind, id }: { kind: 'node' | 'edge'; id: string }) {
  const validation = useValidation();
  const violations = validation
    ? violationsFor(validation.graph, validation.violations, kind, id)
    : [];
  if (violations.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-1 border-t border-slate-100 pt-3">
      {violations.map((violation, index) => (
        <li
          key={index}
          className={`rounded border px-2 py-1 text-sm ${
            violation.severity === ViolationSeverity.Error
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <ViolationItem violation={violation} />
        </li>
      ))}
    </ul>
  );
}
