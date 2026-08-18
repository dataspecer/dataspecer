import { useEffect, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';

import { useDataSource } from '../data-source/data-source-context.tsx';
import {
  entityIdFromValue,
  hrefForAction,
  partitionPageActions,
  type AssociationNavigationActionDescriptor,
  type OperationNavigationDescriptor,
} from '../navigation/navigation.ts';
import { errorMessage } from '../operations/operation-result.ts';
import { invokeOperation, type OperationStrategy } from '../operations/operation-strategy.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityModel,
  FieldDescriptor,
} from '../types/aggregate.ts';
import { ActionLinks } from './action-links.tsx';
import { formatPrimitiveValue } from '../forms/field-value.ts';

// Nested sections deeper than this start collapsed so deep structures do not overwhelm the page.
const OPEN_DEPTH = 2;

export interface DetailViewProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  aggregateRegistry: AggregateDescriptorMap;
  strategy: OperationStrategy<TModel, TModel>;
  navigation: OperationNavigationDescriptor;
  id: string;
}

/** Reads one entity through its operation and shows its fields. */
export function DetailView<TModel extends EntityModel>(props: DetailViewProps<TModel>) {
  const dataSource = useDataSource();
  const { title, aggregate, aggregateRegistry, strategy, navigation, id } = props;
  const [item, setItem] = useState<TModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setError('Missing required entity id.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    invokeOperation(strategy, {
      aggregate,
      aggregateRegistry,
      datasource: dataSource,
      params: { id },
    })
      .then((result) => {
        if (!active) {
          return;
        }
        if (result.ok) {
          setItem(result.data);
        } else {
          setError(result.issues.map((issue) => issue.message).join(', '));
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        console.error(caught);
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [aggregate, aggregateRegistry, dataSource, id, strategy]);

  const { list: listAction, rest: pageActions } = partitionPageActions(navigation.pageActions);
  const listHref = hrefForAction(listAction);

  return (
    <Stack spacing={2}>
      {listAction && listHref ? (
        <Breadcrumbs>
          <Link component={RouterLink} to={listHref} underline="hover" variant="body2">
            {listAction.targetTitle}
          </Link>
          <Typography variant="body2" color="text.primary">
            {title}
          </Typography>
        </Breadcrumbs>
      ) : null}
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="h5" component="h2" noWrap>
          {title}
        </Typography>
        {item ? <ActionLinks actions={pageActions} entityId={item.id} /> : null}
      </Stack>

      {error !== null ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={32} />
          <Skeleton variant="rounded" height={32} />
          <Skeleton variant="rounded" height={32} />
        </Stack>
      ) : null}

      {item !== null && error === null ? (
        <Card>
          <CardContent>
            <FieldList
              fields={aggregate.fields}
              item={item as Record<string, unknown>}
              associationActions={navigation.associationActions}
              depth={0}
            />
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}

interface FieldListProps {
  fields: FieldDescriptor[];
  item: Record<string, unknown>;
  associationActions: readonly AssociationNavigationActionDescriptor[];
  depth: number;
  pathPrefix?: string;
}

function FieldList(props: FieldListProps) {
  return (
    <Stack divider={<Divider flexItem />}>
      {props.fields.map((field) => {
        const fieldPath = props.pathPrefix ? `${props.pathPrefix}.${field.path}` : field.path;
        return (
          <Field
            key={fieldPath}
            field={field}
            fieldPath={fieldPath}
            value={props.item[field.propertyName]}
            associationActions={props.associationActions}
            depth={props.depth}
          />
        );
      })}
    </Stack>
  );
}

interface FieldProps {
  field: FieldDescriptor;
  fieldPath: string;
  value: unknown;
  associationActions: readonly AssociationNavigationActionDescriptor[];
  depth: number;
}

/**
 * A field with a nested entity value renders as a collapsible section, so nesting reads as a tree
 * without squeezing the value column at each level. Everything else is a label and value row.
 */
function Field(props: FieldProps) {
  const { field, value } = props;
  const action = props.associationActions.find(
    (candidate) => candidate.fieldPath === props.fieldPath
  );
  const isNested = field.kind === 'association' && Boolean(field.fields?.length);

  if (isNested && hasEntityValue(value)) {
    return (
      <Accordion
        defaultExpanded={props.depth < OPEN_DEPTH}
        disableGutters
        elevation={0}
        sx={{ bgcolor: 'transparent', '&::before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 40 }}>
          <Typography variant="subtitle2">{field.label}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, pt: 0, pb: 1 }}>
          <NestedEntities
            fields={field.fields ?? []}
            fieldPath={props.fieldPath}
            value={value}
            associationActions={props.associationActions}
            depth={props.depth + 1}
            action={action}
          />
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.25, sm: 2 }}
      sx={{ py: 1, alignItems: { sm: 'baseline' } }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200, flexShrink: 0 }}>
        {field.label}
      </Typography>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <LeafValue field={field} value={value} action={action} />
      </Box>
    </Stack>
  );
}

interface NestedEntitiesProps {
  fields: FieldDescriptor[];
  fieldPath: string;
  value: unknown;
  associationActions: readonly AssociationNavigationActionDescriptor[];
  depth: number;
  action?: AssociationNavigationActionDescriptor;
}

function NestedEntities(props: NestedEntitiesProps) {
  const entities: unknown[] = Array.isArray(props.value) ? props.value : [props.value];
  // Only the first level of nesting is framed. Deeper levels would stack a card inside a card
  // inside an accordion, so they are set off by an indent rule instead.
  const framed = props.depth <= 1;

  const body = (entity: unknown) => (
    <>
      {props.action ? <EntityLink value={entity} action={props.action} /> : null}
      {entity !== null && typeof entity === 'object' ? (
        <FieldList
          fields={props.fields}
          item={entity as Record<string, unknown>}
          associationActions={props.associationActions}
          depth={props.depth}
          pathPrefix={props.fieldPath}
        />
      ) : (
        <Typography variant="body2">{formatPrimitiveValue(entity)}</Typography>
      )}
    </>
  );

  if (!framed) {
    return (
      <Stack divider={<Divider flexItem />} sx={{ pl: 2, borderLeft: 2, borderColor: 'divider' }}>
        {entities.map((entity, index) => (
          <Box key={index} sx={{ position: 'relative' }}>
            {body(entity)}
          </Box>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {entities.map((entity, index) => (
        <Card key={index} sx={{ bgcolor: 'action.hover', position: 'relative' }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>{body(entity)}</CardContent>
        </Card>
      ))}
    </Stack>
  );
}

interface LeafValueProps {
  field: FieldDescriptor;
  value: unknown;
  action?: AssociationNavigationActionDescriptor;
}

function LeafValue(props: LeafValueProps) {
  const { field, value, action } = props;

  if (value === null || value === undefined || value === '') {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }

  if (Array.isArray(value)) {
    return (
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
        {(value as unknown[]).map((entry, index) => (
          <LeafValue key={index} field={field} value={entry} action={action} />
        ))}
      </Stack>
    );
  }

  if (typeof value === 'boolean') {
    return <Chip label={value ? 'Yes' : 'No'} color={value ? 'success' : 'default'} />;
  }

  const text = formatPrimitiveValue(value, field);
  const entityId = action ? entityIdFromValue(value) : undefined;
  const href = entityId ? hrefForAction(action, entityId) : undefined;
  if (href) {
    return (
      <Link component={RouterLink} to={href} underline="hover" variant="body2">
        {text || entityId}
      </Link>
    );
  }
  return (
    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
      {text}
    </Typography>
  );
}

interface EntityLinkProps {
  value: unknown;
  action: AssociationNavigationActionDescriptor;
}

function EntityLink(props: EntityLinkProps) {
  const entityId = entityIdFromValue(props.value);
  const href = entityId ? hrefForAction(props.action, entityId) : undefined;
  if (!href) {
    return null;
  }
  return (
    <Tooltip title="Open">
      <IconButton
        component={RouterLink}
        to={href}
        aria-label="Open"
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          opacity: 0.55,
          '&:hover, &:focus-visible': { opacity: 1 },
        }}
      >
        <OpenInNewIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

function hasEntityValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => entry !== null && typeof entry === 'object');
  }
  return value !== null && typeof value === 'object';
}
