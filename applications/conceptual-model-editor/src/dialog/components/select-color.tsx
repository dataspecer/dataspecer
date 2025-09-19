import { HexColor } from "@dataspecer/visual-model"
import { useState } from "react";

/**
 * We use this to remember whether by default the colors' list should be
 * opened or closed.
 */
let defaultOpenState = false;

export function SelectColor(props: {
  value: HexColor,
  onChange: (value: HexColor) => void,
}) {
  const [open, setOpen] = useState(defaultOpenState);
  return (
    <div className="flex gap-1 items-center">
      <input
        type="color"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <button
        className="border-2 border-white"
        onClick={() => setOpen(state => {
          defaultOpenState = !state;
          return !state;
        })}
      >
        {open ? "<" : ">"}
      </button>
      {open ?
        <ColorList onChange={props.onChange} />
        : null}
    </div>
  )
}

/**
 * Predefined list of colors to select from.
 */
const COLORS: HexColor[] = [
  "#fc440f",
  "#8da266",
  "#1effbc",
  "#4dc9ab",
  "#e63462",
  "#d4f2d2",
  "#8fab5c",
  "#b4e33d",
  "#b8a3d3",
  "#ff70a6",
  "#ff9770",
  "#ffb770",
  "#70d6ff",
  "#b8d6b8",
  "#ffd670",
  "#ff848b",
  "#92bcea",
];

function ColorList(props: {
  onChange: (value: HexColor) => void,
}) {
  return (
    <div className="flex flex-wrap">
      {COLORS.map(color => (
        <div
          key={color}
          className="h-6 w-6 border-2 border-white hover:border-black"
          style={{ backgroundColor: color }}
          onClick={() => props.onChange(color)}
        >
        </div>
      ))}
    </div>
  )
}
