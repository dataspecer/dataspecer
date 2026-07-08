import { hrefForAction, type NavigationActionDescriptor } from '../navigation/navigation.ts';

interface ActionLinksProps {
  actions: readonly NavigationActionDescriptor[];
  entityId?: string;
}

/** Renders navigation actions as a row of links, skipping any that resolve to no href. */
export function ActionLinks(props: ActionLinksProps) {
  if (props.actions.length === 0) {
    return null;
  }

  return (
    <nav className="actions">
      {props.actions.map((action) => {
        const href = hrefForAction(action, props.entityId);
        return href ? (
          <a key={action.id} href={href}>
            {action.label}
          </a>
        ) : null;
      })}
    </nav>
  );
}
