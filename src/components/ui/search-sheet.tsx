import * as React from "react";
import { Check, Search } from "lucide-react";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type SearchSheetOption = {
  value: string;
  label: string;
  description?: string;
};

interface SearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: SearchSheetOption[];
  value?: string;
  onSelect: (value: string) => void;
  searchPlaceholder?: string;
}

/** Bottom sheet with a search field and 52px selectable rows. */
export function SearchSheet({
  open,
  onOpenChange,
  title,
  options,
  value,
  onSelect,
  searchPlaceholder = "Search…",
}: SearchSheetProps) {
  const [query, setQuery] = React.useState("");
  useBackButtonClose(open, () => onOpenChange(false));

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.description ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="relative pt-3">
          <Search className="absolute left-3 top-1/2 mt-1.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-[52px] pl-9 text-base"
          />
        </div>
        <div className="flex-1 overflow-y-auto pt-2 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>
          )}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onSelect(o.value);
                onOpenChange(false);
              }}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-border/60 px-1 text-left text-base last:border-0"
            >
              <span>
                {o.label}
                {o.description && (
                  <span className="block text-xs text-muted-foreground">{o.description}</span>
                )}
              </span>
              {o.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SearchSheet;
