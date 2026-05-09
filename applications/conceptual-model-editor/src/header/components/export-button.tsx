import { ManagementButton, type ManagementButtonPropsType } from "./management-button";

export const ExportButton = (props: ManagementButtonPropsType) => {
  return (
    <ManagementButton color="bg-[#c7556f]" {...props}>
      {props.children}
    </ManagementButton>
  );
};
