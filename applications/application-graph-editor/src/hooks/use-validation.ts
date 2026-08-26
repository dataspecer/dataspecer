import { useEffect, useMemo } from 'react';
import { debounce } from 'es-toolkit';
import type { Violation } from '@dataspecer/app-generator/graph';
import { useEditorStore } from '@/store.ts';
import {
  bySeverity,
  combinedViolations,
  type ValidationSnapshot,
  type ViolationsBySeverity,
} from '@/validation/violations.ts';

const VALIDATION_DELAY_MS = 250;

const EMPTY: Violation[] = [];

/**
 * Keeps the store's validation snapshot up to date. Mounted once, so the graph is validated one
 * time per change instead of once per component that shows violations.
 */
export function useValidationSync(): void {
  useEffect(() => {
    const validate = () => {
      const { graph, metadata, generationViolations, setValidation } = useEditorStore.getState();
      if (graph === null) {
        return;
      }
      setValidation({
        graph,
        violations: combinedViolations(graph, metadata, generationViolations),
      });
    };

    const validateSoon = debounce(validate, VALIDATION_DELAY_MS);
    validate();

    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (
        state.graph !== previous.graph ||
        state.metadata !== previous.metadata ||
        state.generationViolations !== previous.generationViolations
      ) {
        validateSoon();
      }
    });

    return () => {
      validateSoon.cancel();
      unsubscribe();
    };
  }, []);
}

/**
 * Violations together with the graph they were computed from. Paths resolve against that graph, so
 * a snapshot that lags a keystroke behind still points at the right nodes and edges.
 */
export function useValidation(): ValidationSnapshot | null {
  return useEditorStore((state) => state.validation);
}

export function useViolationsBySeverity(): ViolationsBySeverity {
  const violations = useEditorStore((state) => state.validation?.violations ?? EMPTY);
  return useMemo(() => bySeverity(violations), [violations]);
}
