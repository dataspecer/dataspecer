import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

import { breadcrumbEntries, samePath, type NavigablePane } from '../forms/composition-tree.ts';
import { formatEntityPath } from '../forms/entity-path.ts';
import type { EntityTarget } from '../forms/entity-target.ts';
import type { EntityPathSegment } from '../forms/form-draft.ts';
import type { AggregateDescriptorMap, EntityRecord } from '../types/aggregate.ts';

interface FormBreadcrumbsProps {
  root: EntityRecord;
  rootTarget: EntityTarget;
  path: EntityPathSegment[];
  aggregateRegistry: AggregateDescriptorMap;
  onSelect: (path: EntityPathSegment[]) => void;
}

export function FormBreadcrumbs(props: FormBreadcrumbsProps) {
  const entries = breadcrumbEntries(
    props.root,
    props.rootTarget,
    props.path,
    props.aggregateRegistry,
  );

  const crumbLimit = { maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

  return (
    <Breadcrumbs
      maxItems={3}
      sx={{
        minWidth: 0,
        flex: '1 1 auto',
        '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
        '& .MuiBreadcrumbs-li': { minWidth: 0 },
      }}
    >
      {entries.map((entry, index) =>
        index === entries.length - 1 ? (
          <Typography
            key={index}
            variant="body2"
            color="text.primary"
            noWrap
            title={entry.label}
            sx={crumbLimit}
          >
            {entry.label}
          </Typography>
        ) : (
          <Link
            key={index}
            component="button"
            type="button"
            variant="body2"
            underline="hover"
            title={entry.label}
            sx={{ ...crumbLimit, whiteSpace: 'nowrap' }}
            onClick={() => props.onSelect(entry.path)}
          >
            {entry.label}
          </Link>
        ),
      )}
    </Breadcrumbs>
  );
}

interface StructureDrawerProps {
  open: boolean;
  panes: NavigablePane[];
  selection: EntityPathSegment[];
  /** Issue counts keyed by pane path. The root uses an empty key. */
  issueCounts: ReadonlyMap<string, number>;
  rootTarget: EntityTarget;
  onClose: () => void;
  onSelect: (path: EntityPathSegment[]) => void;
}

/** Lists the root and nested composition panes. */
export function StructureDrawer(props: StructureDrawerProps) {
  return (
    <Drawer anchor="right" open={props.open} onClose={props.onClose}>
      <Box sx={{ width: 320, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Structure
        </Typography>
        <Divider />
        <List dense>
          <ListItemButton
            selected={props.selection.length === 0}
            onClick={() => props.onSelect([])}
          >
            <ListItemText primary={props.rootTarget.name} />
            <IssueChip count={props.issueCounts.get('') ?? 0} />
          </ListItemButton>
          {props.panes.map((pane) => {
            const issues = props.issueCounts.get(formatEntityPath(pane.path)) ?? 0;
            return (
              <ListItemButton
                key={pane.key}
                selected={samePath(pane.path, props.selection)}
                sx={{ pl: 2 + pane.path.length * 2 }}
                onClick={() => props.onSelect(pane.path)}
              >
                <ListItemText primary={pane.label} secondary={pane.fieldLabel} />
                <IssueChip count={issues} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}

function IssueChip(props: { count: number }) {
  if (props.count === 0) {
    return null;
  }
  return <Chip label={props.count} color="error" />;
}
