import React from "react"

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
