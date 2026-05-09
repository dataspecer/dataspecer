import { useEffect, useRef, useState } from "react";
import { ColorPalette, tailwindColorToHex } from "../../util/color-utils";

const GRID_COLS = "grid-cols-5";

export const ColorPicker = (props: { currentColor: string; saveColor: (color: string) => void }) => {
  const { currentColor, saveColor } = props;
  const [isOpen, setIsOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement | null>(null);

  const colors = Object.keys(ColorPalette);

  useEffect(() => {
    if (isOpen && colorPickerRef.current) {
      colorPickerRef.current.focus();
    }
  }, [colorPickerRef, isOpen]);

  if (!isOpen) {
    return (
      <button
        title="choose new color"
        className="h-6 w-6 border-2 border-white"
        style={{ backgroundColor: tailwindColorToHex(currentColor) }}
        onClick={() => setIsOpen(true)}
      ></button>
    );
  }

  return (
    <div
      tabIndex={-1}
      autoFocus
      ref={colorPickerRef}
      className={"relative z-10 min-w-fit border-2 border-white p-1"}
      onBlur={(e) => {
        if (e.relatedTarget?.id.startsWith("button-color-picker-")) {
          return;
        }
        console.log("color picker on blr", e);
        setIsOpen(false);
      }}
    >
      <div className={`grid min-w-fit ${GRID_COLS} absolute -left-32 border-2 border-white p-1`}>
        {colors.map((tailwindColor) => {
          const color = tailwindColorToHex(tailwindColor);
          return (
            <ColorField
              key={color + "color-field"}
              color={color}
              tailwindColor={tailwindColor}
              isSelected={currentColor === color}
              onClick={(e) => {
                e.preventDefault();
                saveColor(color);
                setIsOpen(false);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const ColorField = (props: {
  tailwindColor: string;
  color: string;
  isSelected?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) => {
  const { tailwindColor, color, isSelected, onClick } = props;
  return (
    <button
      id={`button-color-picker-${tailwindColor}`}
      key={`color-${tailwindColor}`}
      className={"h-6 w-6"}
      style={{
        backgroundColor: color,
        border: isSelected ? "solid white 2px" : undefined,
      }}
      onClick={onClick}
    ></button>
  );
};
