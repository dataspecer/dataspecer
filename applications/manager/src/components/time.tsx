import React from "react"

/** Formats a date relative to a reference time using the requested locale. */
export function formatRelativeTime(date: Date, locale: string, now = new Date()): string {
    const seconds = (date.getTime() - now.getTime()) / 1000;
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ["year", 365 * 24 * 60 * 60],
        ["month", 30 * 24 * 60 * 60],
        ["week", 7 * 24 * 60 * 60],
        ["day", 24 * 60 * 60],
        ["hour", 60 * 60],
        ["minute", 60],
        ["second", 1],
    ];
    const [unit, duration] = units.find(([, duration]) => Math.abs(seconds) >= duration) ?? units[units.length - 1]!;
    return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(Math.round(seconds / duration), unit);
}

export interface TimeProps
  extends React.InputHTMLAttributes<HTMLSpanElement> {
    time: Date | string | undefined | null;
}

export const getValidTime = (time: Date | string | undefined | null) => {
    let date = time ? new Date(time) : null;
    if (date?.getTime() === 0) {
        date = null;
    }
    return date;
}

export const Time = React.forwardRef<HTMLSpanElement, TimeProps>(
    ({ className, type, time, ...props }, ref) => {
        const date = getValidTime(time);

        return (
            <span
                ref={ref}
                {...props}
            >
                {date ? new Intl.DateTimeFormat("cs-CZ", {
                    dateStyle: 'short',
                    timeStyle: 'short',
                }).format(date) : "---"}
            </span>
        )
    }
  )
