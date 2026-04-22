import { useTranslation } from "react-i18next";

type BooleanRadioButtonsProps = {
  trueText: string;
  isTrueDisabled: boolean;
  falseText: string;
  isFalseDisabled: boolean;
  value: boolean;
  setValue: (value: boolean) => void
}

export function BooleanRadioButtons({ value, setValue, falseText, trueText, isFalseDisabled, isTrueDisabled }: BooleanRadioButtonsProps) {
  const { t } = useTranslation();

  return <div className="-mt-2 mb-8 flex items-center space-x-6 grid grid-col-2">
    <label className="flex items-center space-x-2">
      <input
        type="radio"
        disabled={isTrueDisabled}
        checked={value === true}
        onChange={() => setValue(true)}
        className="w-5 h-5 border-gray-400 text-blue-600 focus:ring-blue-500 form-radio"
      />
      <span>{t(trueText)}</span>
    </label>

    <label className="flex items-center space-x-2">
      <input
        type="radio"
        disabled={isFalseDisabled}
        checked={value === false}
        onChange={() => setValue(false)}
        className="w-5 h-5 border-gray-400 text-blue-600 focus:ring-blue-500 form-radio"
      />
      <span>{t(falseText)}</span>
    </label>
  </div>;
}
