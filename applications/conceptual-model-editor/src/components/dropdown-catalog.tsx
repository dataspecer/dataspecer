import { useEffect, useMemo, useRef, useState } from "react";

type ExtraCatalogItemData = {
  callback: (value: string) => void;
  content: string
}

type ExtraCatalogItemDataInternal = {
  callback: () => void;
  content: string
}

export const DropDownCatalog = (props: {
  label: string;
  valueSelected: string | null;
  // [key, value]
  availableValues: readonly string[] | readonly [string, string][];
  openCatalogTitle?: string;
  onValueSelected: (value: string) => void;
  onValueEdit?: (value: string) => void;
  onValueDeleted?: (value: string) => void;
  extraCatalogItems?: ExtraCatalogItemData[];
}) => {
  const {
    label, valueSelected, availableValues, openCatalogTitle,
    onValueSelected, onValueEdit, onValueDeleted, extraCatalogItems
  } = props;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (dropdownOpen && dropdownRef.current) {
      dropdownRef.current?.focus();
    }
  }, [dropdownOpen]);

  const valueSelectedVal = useMemo(() => {
    return getValue(availableValues.find((v) => getKey(v) === valueSelected) ?? "---");
  }, [valueSelected, availableValues]);

  return (
    <div className="my-auto">
      <div className="flex flex-col text-[15px]">
        <div className="relative flex flex-row flex-wrap md:flex-nowrap">
          <div className="text-nowrap">
            {label}:
            <span className="ml-2 max-w-40 overflow-x-clip text-wrap font-mono">
              {valueSelectedVal ?? "---"}
            </span>
          </div>
          <button
            className="white ml-2 text-[15px]"
            title={openCatalogTitle}
            onClick={() => setDropdownOpen(true)}
          >
            <DropDownIcon />
          </button>
          {dropdownOpen && (
            <div
              ref={dropdownRef}
              tabIndex={-1}
              className="absolute z-10 mt-8 flex w-full flex-col bg-[#5438dc] p-2"
              onBlur={(event) => {
                if ((event.relatedTarget as any)?.dataset["menu"]) {
                  return;
                }
                setDropdownOpen(false);
                event.stopPropagation();
              }}
            >
              <ul className="w-full">
                {availableValues.map((item) => (
                  <CatalogItem
                    key={getKey(item)}
                    value={getValue(item)}
                    onClick={() => {
                      setDropdownOpen(false);
                      onValueSelected(getKey(item));
                    }}
                    onEdit={
                      onValueEdit === undefined ? undefined : () => {
                        setDropdownOpen(false);
                        onValueEdit(getKey(item));
                      }}
                    onDelete={
                      onValueDeleted === undefined ? undefined : () => {
                        setDropdownOpen(false);
                        onValueDeleted(getKey(item));
                      }}
                    extraButtonsForItem={item?.[0] === valueSelected ?
                      undefined :
                      extraCatalogItems?.map(itemData => ({
                        content: itemData.content,
                        callback: () => {
                          setDropdownOpen(false);
                          itemData.callback(getKey(item));
                        }
                      }))}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getKey = (value: string | [string, string]) => {
  if (Array.isArray(value)) {
    return value[0];
  } else {
    return value;
  }
};

const getValue = (value: string | [string, string]) => {
  if (Array.isArray(value)) {
    return value[1];
  } else {
    return value;
  }
};

const CatalogItem = (props: {
  value: string,
  onClick: () => void,
  onEdit?: () => void,
  onDelete?: () => void,
  extraButtonsForItem?: ExtraCatalogItemDataInternal[],
}) => {
  const { value, onClick, onEdit, onDelete, extraButtonsForItem } = props;
  return (
    <li key={value} className="flex w-full flex-row justify-between gap-y-2">
      <button
        className="cursor-pointer flex-grow"
        data-menu="catalog"
        onClick={onClick}>
        {value}
      </button>
      {onEdit === undefined ? null : (
        <button
          className="cursor-pointer"
          data-menu="catalog"
          onClick={onEdit}
        >
          ✏
        </button>
      )}
      {onDelete === undefined ? null : (
        <button
          className="cursor-pointer"
          data-menu="catalog"
          onClick={onDelete}
        >
          🗑
        </button>
      )}
      {extraButtonsForItem && extraButtonsForItem.map(({ content, callback }, index) =>
        (<button key={`button-dropdown-catalog-${value}-${index}-special`}
          id={`button-dropdown-catalog-${value}-${index}-special`}
          className="cursor-pointer"
          data-menu="catalog"
          onClick={callback}>
          {content}
        </button>))
      }
    </li>
  );
};

const DropDownIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
