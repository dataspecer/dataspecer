import { useEffect, useRef } from "react";
import { useReactFlow, type Viewport } from "@xyflow/react";
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

  // Restore viewport on mount or when visual model changes
  useEffect(() => {
    if (!enabled || !storageKey || restoredRef.current) {
      return;
    }

    // Restore the saved viewport
    if (savedViewport && reactFlow) {
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
  useEffect(() => {
    if (!enabled || !storageKey) {
      return;
    }

    // Throttle the save operation to avoid excessive localStorage writes
    let timeoutId: NodeJS.Timeout | null = null;
    
    const handleViewportChange = (viewport: Viewport) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const viewportState: ViewportState = {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        };
        setSavedViewport(viewportState);
      }, 500); // Save 500ms after the last viewport change
    };

    // Subscribe to viewport changes
    const unsubscribe = reactFlow.onViewportChange(handleViewportChange);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
    };
  }, [enabled, storageKey, reactFlow, setSavedViewport]);

  return {
    savedViewport,
    setSavedViewport,
  };
}
