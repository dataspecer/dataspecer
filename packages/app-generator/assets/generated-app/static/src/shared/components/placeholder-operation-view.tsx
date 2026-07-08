export interface PlaceholderOperationViewProps {
  title: string;
  operation: string;
}

export function PlaceholderOperationView(props: PlaceholderOperationViewProps) {
  return (
    <section>
      <h2>{props.title}</h2>
      <p>
        {props.operation} is present in the Application graph but remains a first-prototype
        placeholder.
      </p>
    </section>
  );
}
