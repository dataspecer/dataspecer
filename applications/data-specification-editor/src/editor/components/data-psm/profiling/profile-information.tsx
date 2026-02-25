import type { DataPsmResource } from "@dataspecer/core/data-psm/model/data-psm-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";
import { useMemo } from "react";

interface ProfileInformationProps {
  /**
   * ID of the structural entity that may be profile of another entity.
   */
  id: string;
}

/**
 * Adds information about profiling to each structure entity.
 * It requires context whether this is normal structure or a profiled one.
 * Normally, it shows nothing and only the entities that are changed by profiling are marked.
 */
export const ProfileInformation: React.FC<ProfileInformationProps> = (props) => {
  const store = useFederatedObservableStore();

  const schemaIri = useMemo(() => store.getSchemaForResource(props.id), [store, props.id]);

  const { resource: entity } = useResource<DataPsmResource>(props.id);
  //const { resource: profiledEntity } = useResource<DataPsmResource>(entity?.profiling?.[0] ?? null);
  const { resource: schema } = useResource<DataPsmResource>(schemaIri);

  const isSchemaProfile = schema?.profiling?.length > 0;
  const isProfile = entity?.profiling?.length > 0;

  if (DataPsmSchema.is(entity) && isSchemaProfile) {
    return <>
      {" "}
      <span title="This schema is a structure profile of another schema." className="text-pink-600 font-bold text-[.75em]">
        [Structure profile]
      </span>
    </>
  }
  return isSchemaProfile && !isProfile && (
    <>
      {" "}
      <span title="This entity is new in this profile and does not belong to the profiled schema." className="text-pink-600 font-bold">
        [New in profile]
      </span>
    </>
  );
};
