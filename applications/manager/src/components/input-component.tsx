import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"
import { RefObject } from "react";
import { PopOverGitGeneralComponent } from "./popover-git-general";

type SetStringState = (value: string) => void;

/**
   * requiredRefObject should be provided if we expect the input field to be required (non-empty)
   */
export type InputComponentProps = {
  idPrefix: string;
  idSuffix: number;
  setInput: SetStringState;
  /**
   * If provided then the input field is expected to be required (non-empty)
   */
  requiredRefObject?: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  input?: string;
  label?: string;
  tooltip?: string;
  TooltipComponent?: React.ReactNode;
};

export function createIdentifierForHTMLElement(idPrefix: string, idSuffix: number, htmlElementType: string) {
  return `${idPrefix}-${idSuffix}-${htmlElementType}`;
}

export const InputComponent = ({ idPrefix, idSuffix, input, label, tooltip, TooltipComponent, setInput, disabled, requiredRefObject }: InputComponentProps) => {
  const divId = createIdentifierForHTMLElement(idPrefix, idSuffix, "div");
  const inputId = createIdentifierForHTMLElement(idPrefix, idSuffix, "input");

  return <div className="grid gap-4 my-4">
    <div title={tooltip} key={divId}>
      <div className="flex flex-row">
        <Label htmlFor={inputId} className="flex grow-3 items-baseline gap-2 mb-2">
          <div>
            {label } {requiredRefObject === undefined ? null : <span className="text-red-500">*</span>}
          </div>
          <div className="grow"></div>
        </Label>
        {TooltipComponent === undefined ? null : <PopOverGitGeneralComponent>{TooltipComponent}</PopOverGitGeneralComponent>}
      </div>
      <Input ref={requiredRefObject} id={inputId} value={input} className="grow my-1" onChange={target => setInput(target.target.value)} disabled={disabled ?? false} required={requiredRefObject !== undefined}/>
    </div>
  </div>;
};
