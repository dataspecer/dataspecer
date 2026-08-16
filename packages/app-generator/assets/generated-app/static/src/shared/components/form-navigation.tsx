import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import {
  breadcrumbEntries,
  countIssues,
  samePath,
  type NavigablePane,
} from '../forms/composition-tree.ts';
import type { EntityTarget } from '../forms/entity-target.ts';
import type { EntityPathSegment } from '../forms/form-draft.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import type { AggregateDescriptorMap, EntityRecord } from '../types/aggregate.ts';

interface FormBreadcrumbsProps {
  root: EntityRecord;
  rootTarget: EntityTarget;
  path: EntityPathSegment[];
  aggregateRegistry: AggregateDescriptorMap;
  issues: ValidationIssue[];
  onSelect: (path: EntityPathSegment[]) => void;
}

export function FormBreadcrumbs(props: FormBreadcrumbsProps) {
  const entries = breadcrumbEntries(
    props.root,
    props.rootTarget,
    props.path,
    props.aggregateRegistry
  );

  return (
    <Breadcrumbs sx={{ minWidth: 0 }}>
      {entries.map((entry, index) => {
        const last = index === entries.length - 1;
        const issues = countIssues(props.issues, entry.validationPath);
        const label = (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <span>{entry.label}</span>
            {!last && issues > 0 ? <Chip label={issues} color="error" /> : null}
          </Stack>
        );
        return last ? (
          <Typography key={index} variant="body2" color="text.primary" component="div">
            {label}
          </Typography>
        ) : (
          <Link
            key={index}
            component="button"
            type="button"
            variant="body2"
            underline="hover"
            onClick={() => props.onSelect(entry.path)}
          >
            {label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

interface StructureDrawerProps {
  open: boolean;
  panes: NavigablePane[];
  selection: EntityPathSegment[];
  issues: ValidationIssue[];
  rootTarget: EntityTarget;
  onClose: () => void;
  onSelect: (path: EntityPathSegment[]) => void;
}

/** The whole composition as a list. */
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
          </ListItemButton>
          {props.panes.map((pane) => {
            const issues = countIssues(props.issues, pane.validationPath);
            return (
              <ListItemButton
                key={pane.key}
                selected={samePath(pane.path, props.selection)}
                sx={{ pl: 2 + pane.path.length * 2 }}
                onClick={() => props.onSelect(pane.path)}
              >
                <ListItemText primary={pane.label} secondary={pane.fieldLabel} />
                {issues > 0 ? <Chip label={issues} color="error" /> : null}
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}
