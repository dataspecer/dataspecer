import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Marks the confirming action as one that destroys data. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{props.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button type="button" onClick={props.onCancel}>
          {props.cancelLabel ?? 'Cancel'}
        </Button>
        <Button
          type="button"
          variant="contained"
          color={props.destructive ? 'error' : 'primary'}
          onClick={props.onConfirm}
        >
          {props.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
