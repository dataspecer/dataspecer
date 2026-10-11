import { type DialogProps } from "../../dialog-api";
import { StringInput } from "../../components/string-input";
import { SimpleDialogState } from "./simple-dialog-state";
import { useSimpleDialogPresenter } from "./simple-dialog-presenter";

/**
 * SimpleDialog component composed of reusable dialog-components.
 * Follows the composition pattern where inputs from dialog-components can be added as needed.
 */
export const SimpleDialog = (props: DialogProps<SimpleDialogState>) => {
  const { state } = props;
  const presenter = useSimpleDialogPresenter(props);
  const nameState = state?.name ?? { value: (state as any)?.value ?? "" };
  const surnameState = state?.surname ?? { value: (state as any)?.value ?? "" };

  return (
    <div className="space-y-4 text-sm text-foreground">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Enter name
        </label>
        <div className="rounded-md border border-input bg-background/50 px-3 py-2 shadow-xs transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
          <StringInput
            state={nameState}
            presenter={presenter.name}
            placeholder="Jan"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Enter a value
        </label>
        <div className="rounded-md border border-input bg-background/50 px-3 py-2 shadow-xs transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
          <StringInput
            state={surnameState}
            presenter={presenter.surname}
            placeholder="Novák"
          />
        </div>
      </div>
    </div>
  );
};

export default SimpleDialog;
