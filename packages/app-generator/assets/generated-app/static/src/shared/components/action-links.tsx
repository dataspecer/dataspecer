import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Link } from 'react-router-dom';

import { hrefForAction, type NavigationActionDescriptor } from '../navigation/navigation.ts';
import type { OperationKind } from '../operations/operation-kind.ts';

const ICONS: Record<OperationKind, typeof AddIcon> = {
  Create: AddIcon,
  ReadList: FormatListBulletedIcon,
  ReadDetail: VisibilityIcon,
  Update: EditIcon,
  Delete: DeleteIcon,
};

export function actionIcon(operation: OperationKind) {
  const Icon = ICONS[operation];
  return <Icon fontSize="small" />;
}

function emphasis(operation: OperationKind): { color: 'primary' | 'error'; primary: boolean } {
  return {
    color: operation === 'Delete' ? 'error' : 'primary',
    primary: operation === 'Create',
  };
}

interface ActionLinksProps {
  actions: readonly NavigationActionDescriptor[];
  entityId?: string;
  /** Icon only, for actions that repeat once per row or per card. */
  compact?: boolean;
  tabIndex?: number;
}

/** Renders navigation actions as buttons, skipping any that resolve to no target. */
export function ActionLinks(props: ActionLinksProps) {
  const resolved = props.actions.flatMap((action) => {
    const href = hrefForAction(action, props.entityId);
    return href ? [{ action, href }] : [];
  });
  if (resolved.length === 0) {
    return null;
  }

  return (
    <Stack direction="row" spacing={props.compact ? 0.5 : 1} sx={{ alignItems: 'center' }}>
      {resolved.map(({ action, href }) => {
        const { color, primary } = emphasis(action.operation);
        return props.compact ? (
          <Tooltip key={action.id} title={action.label}>
            <IconButton
              component={Link}
              to={href}
              color={color}
              aria-label={action.label}
              tabIndex={props.tabIndex}
            >
              {actionIcon(action.operation)}
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            key={action.id}
            component={Link}
            to={href}
            color={color}
            variant={primary ? 'contained' : 'outlined'}
            startIcon={actionIcon(action.operation)}
            tabIndex={props.tabIndex}
          >
            {action.label}
          </Button>
        );
      })}
    </Stack>
  );
}
