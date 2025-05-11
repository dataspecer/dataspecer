import { useCallback, useMemo } from "react";
import { useExploration } from "../../context/highlighting-exploration-mode";

export const getDefaultClassNamesForEntityCatalogRow = () => {
  return "flex flex-row justify-between flex-wrap whitespace-nowrap hover:shadow highlight-catalog-transition-default";
};

/**
 * @returns Returns the class names to use for entity based on which higlighting it has.
 */
const getClassNamesBasedOnHighlighting = (
  highlightLevels: Record<string, number>,
  semanticEntityId: string
): string => {
  let classNamesSuffix = "";
  let classNames = getDefaultClassNamesForEntityCatalogRow();

  if(Object.values(highlightLevels).length === 0) {
    classNamesSuffix = "";
  }
  else {
    if(highlightLevels[semanticEntityId] === 0) {
      classNamesSuffix = " catalog-highlight-main";
    }
    else if(highlightLevels[semanticEntityId] === 1) {
      classNamesSuffix = " catalog-highlight-secondary";
    }
    else {
      classNamesSuffix = " highlight-opposite";
    }
  }

  classNames = classNames + classNamesSuffix;
  return classNames;
};

export const useCatalogHighlightingController = () => {
  const {
    highlightLevels,
    resetHighlight,
    semanticToVisualIdentifierMap,
    shouldShrinkCatalog,
    isHighlightingChangeAllowed,
  } = useExploration();

  /**
   * Returns the classname this entity should have for current highlighting
   */
  const getClassNames = useCallback((semanticEntityId: string) => {
    semanticEntityId = semanticToVisualIdentifierMap[semanticEntityId];
    return getClassNamesBasedOnHighlighting(highlightLevels, semanticEntityId);
  }, [highlightLevels]);

  const isEntityHighlighted = useCallback((semanticEntityId: string) => {
    return semanticToVisualIdentifierMap[semanticEntityId] !== undefined;
  }, [highlightLevels]);

  const isAnyEntityHighlighted = useMemo(() => Object.values(highlightLevels).length, [highlightLevels]);

  return {
    resetHighlight,
    getClassNames,
    shouldShrinkCatalog,
    isEntityHighlighted,
    isAnyEntityHighlighted,
    isHighlightingChangeAllowed,
  };
};