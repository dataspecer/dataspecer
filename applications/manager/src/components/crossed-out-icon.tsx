import { DIFF_EDITOR_EDIT_ICON_TAILWIND_HEIGHT, DIFF_EDITOR_EDIT_ICON_TAILWIND_WIDTH } from "@/dialog/diff-editor-dialog";
import { Edit2 } from "lucide-react";
import { ReactNode } from "react";

type ComponentProps = {
  tailwindWidth: string;
  children: ReactNode;
  isFullCrossOut: boolean;
};

/**
 * Crosses out given children components
 */
export const CrossedOutComponent = ({children, tailwindWidth, isFullCrossOut} : ComponentProps) => {
  return <div className="relative">
      {children}
      <div className={`absolute top-1/2 left-0 ${tailwindWidth} h-[4px] bg-red-500 rotate-[50deg]`} />
      {isFullCrossOut && <div className={`absolute top-1/2 left-0 ${tailwindWidth} h-[4px] bg-red-500 rotate-[-50deg]`} />}
    </div>;
};

export const DiffEditorCrossedOutEditIcon = () => {
  return <CrossedOutComponent tailwindWidth={DIFF_EDITOR_EDIT_ICON_TAILWIND_WIDTH} isFullCrossOut={false}>
    <Edit2 className={`${DIFF_EDITOR_EDIT_ICON_TAILWIND_WIDTH} ${DIFF_EDITOR_EDIT_ICON_TAILWIND_HEIGHT} text-gray-700`} />
  </CrossedOutComponent>;
};

export const DiffEditorEditIcon = () => {
  return <Edit2 className={`${DIFF_EDITOR_EDIT_ICON_TAILWIND_WIDTH} ${DIFF_EDITOR_EDIT_ICON_TAILWIND_HEIGHT} text-gray-700`} />;
}
