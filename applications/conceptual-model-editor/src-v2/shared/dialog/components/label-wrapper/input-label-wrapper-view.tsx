export function InputLabelWrapper({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {label}
            </label>
            {children}
        </div>
    );
}