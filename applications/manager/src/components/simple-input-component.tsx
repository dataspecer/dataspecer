import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"

type SetStringState = (value: string) => void;

export type InputComponentProps = {
  idPrefix: string;
  idSuffix: number;
  setInput: SetStringState;
  disabled?: boolean;
  input?: string;
  label?: string;
};

export function createIdentifierForHTMLElement(idPrefix: string, idSuffix: number, htmlElementType: string) {
  return `${idPrefix}-${idSuffix}-${htmlElementType}`;
}

export const InputComponent = ({ idPrefix, idSuffix, input, label, setInput, disabled }: InputComponentProps) => {
  const divId = createIdentifierForHTMLElement(idPrefix, idSuffix, "div");
  const inputId = createIdentifierForHTMLElement(idPrefix, idSuffix, "input");

  return <div className="grid gap-4">
    <div key={divId}>
      <Label htmlFor={inputId} className="flex grow-3 items-baseline gap-2 mb-2">
        <div>
          {label}
        </div>
        <div className="grow"></div>
      </Label>
      <Input id={inputId} value={input} className="grow" onChange={target => setInput(target.target.value)} disabled={disabled ?? false} />
    </div>
  </div>;
};