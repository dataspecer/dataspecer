import { CsvConfiguration, CsvConfigurationInput } from "@dataspecer/csv/configuration"
import { FormGroup } from "@mui/material"
import { FC } from "react"
import { SwitchWithDefault } from "../ui-components/index"

/**
 * Part of the dialog where CSV is being configured.
 *
 * The component expects full configuration object.
 * @constructor
 */
export const Csv: FC<{
    input: CsvConfigurationInput,
    defaultObject?: CsvConfiguration
    onChange: (options: CsvConfigurationInput) => void,
  }> = ({input, onChange, defaultObject}) => {
    return <FormGroup>
      <SwitchWithDefault
          label="Enable multiple table schema for CSV"
          current={input ?? {}}
          itemKey="enableMultipleTableSchema"
          onChange={onChange}
          default={defaultObject}
      />
    </FormGroup>
  }