import type { ReactNode } from "react";

export type ManagementButtonPropsType = {
    children?: ReactNode;
    disabled?: boolean;
    color?: string;
    title?: string;
    onClick?: () => void;
    withDisabledHelpCursor?: boolean;
};

export const ManagementButton = (props: ManagementButtonPropsType) => {
  const { children, title, color, disabled, onClick, withDisabledHelpCursor } = props;

  return (
    <button
      className={`mx-0.5 ${color ?? "bg-green-600"} px-1 disabled:opacity-50 ${
        (withDisabledHelpCursor && "disabled:hover:cursor-help") || ""
      }`}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
