import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type ResponsiveSelectOption = {
  value: string;
  label: string;
  description?: string;
};

interface ResponsiveSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: ResponsiveSelectOption[];
  placeholder?: string;
  /** Sheet heading on mobile */
  title?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/**
 * A Select on desktop; a bottom sheet with 52px rows on mobile.
 */
export function ResponsiveSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  title,
  className,
  disabled,
  ...rest
}: ResponsiveSelectProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  useBackButtonClose(isMobile && open, () => setOpen(false));

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className} aria-label={rest["aria-label"]}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={rest["aria-label"]}
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-[52px] w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-left text-base disabled:opacity-50",
          className,
        )}
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>{title ?? placeholder}</SheetTitle>
          </SheetHeader>
          <div className="pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onValueChange(o.value);
                  setOpen(false);
                }}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-border/60 px-1 text-left text-base last:border-0"
              >
                <span>
                  {o.label}
                  {o.description && (
                    <span className="block text-xs text-muted-foreground">{o.description}</span>
                  )}
                </span>
                {o.value === value && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default ResponsiveSelect;
