import { AlertTriangle, XCircle } from 'lucide-react';
import { ViolationSeverity, type Violation } from '@dataspecer/app-generator/graph';

export function ViolationItem({ violation, heading }: { violation: Violation; heading?: string }) {
  const isError = violation.severity === ViolationSeverity.Error;

  return (
    <>
      {heading && (
        <span
          className={`inline-flex items-center gap-1 font-medium ${
            isError ? 'text-red-700' : 'text-amber-700'
          }`}
        >
          {isError ? <XCircle size={12} /> : <AlertTriangle size={12} />}
          {heading}
        </span>
      )}
      <span className="block text-slate-700">{violation.message}</span>
      <span className="text-xs text-slate-400">
        {violation.code}
        {violation.sourceCode && ` · ${violation.sourceCode}`}
        {violation.path && violation.path !== '/' && ` · ${violation.path}`}
      </span>
    </>
  );
}
