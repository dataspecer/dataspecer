import { useEffect, useRef } from "react";
import { useReactFlow, type Viewport, useOnViewportChange } from "@xyflow/react";
import { useLocalStorage } from "./use-local-storage";

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  zoom: 1,
};

/**
 * Validates that a viewport state has valid numeric values
 */
function isValidViewport(viewport: ViewportState): boolean {
  return (
    typeof viewport.x === "number" &&
    typeof viewport.y === "number" &&
    typeof viewport.zoom === "number" &&
    isFinite(viewport.x) &&
    isFinite(viewport.y) &&
    isFinite(viewport.zoom) &&
    viewport.zoom > 0
  );
}

/**
 * Hook for persisting and restoring viewport position and zoom for a visual model.
 * The viewport state is stored in browser localStorage per visual model.
 * 
 * @param visualModelId - The identifier of the visual model
 * @param enabled - Whether viewport persistence is enabled (default: true)
 */
export function useViewportPersistence(visualModelId: string | null, enabled = true) {
  const reactFlow = useReactFlow();
  const storageKey = visualModelId ? `viewport-state-${visualModelId}` : null;
  const [savedViewport, setSavedViewport] = useLocalStorage<ViewportState>(
    storageKey ?? "viewport-state-default",
    DEFAULT_VIEWPORT
  );

  // Track if viewport has been restored
  const restoredRef = useRef(false);
  // Track timeout for throttling saves - using number for browser compatibility
  const timeoutRef = useRef<number | null>(null);

  // Restore viewport on mount or when visual model changes
  useEffect(() => {
    if (!enabled || !storageKey || restoredRef.current) {
      return;
    }

    // Restore the saved viewport with validation
    if (savedViewport && reactFlow && isValidViewport(savedViewport)) {
      try {
        reactFlow.setViewport(savedViewport);
        restoredRef.current = true;
      } catch (error) {
        console.error("Failed to restore viewport:", error);
      }
    }
  }, [enabled, storageKey, savedViewport, reactFlow]);

  // Reset restored flag when visual model changes
  useEffect(() => {
    restoredRef.current = false;
  }, [visualModelId]);

  // Save viewport whenever it changes (with throttling)
  useOnViewportChange({
    onChange: (viewport: Viewport) => {
      if (!enabled || !storageKey) {
        return;
      }

      // Clear existing timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to save viewport after 500ms of inactivity
      timeoutRef.current = window.setTimeout(() => {
        const viewportState: ViewportState = {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        };
        setSavedViewport(viewportState);
      }, 500); // Save 500ms after the last viewport change
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    savedViewport,
    setSavedViewport,
  };
}
