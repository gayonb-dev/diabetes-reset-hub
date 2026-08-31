import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PreviewItem } from "./previewManifest";

interface PreviewLightboxProps {
  item: PreviewItem | null;
  onClose: () => void;
}

/**
 * Enlargement dialog for a single product preview. The full-resolution file is
 * only requested once the dialog opens, so the gallery stays light.
 */
const PreviewLightbox = ({ item, onClose }: PreviewLightboxProps) => (
  <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-3xl p-0 overflow-hidden">
      {item && (
        <>
          <div className="px-6 pt-6">
            <DialogTitle className="font-heading text-xl">{item.label}</DialogTitle>
            <DialogDescription className="mt-1">{item.caption}</DialogDescription>
            <p className="text-xs text-muted-foreground mt-2">
              Actual app screen · illustrative example entries
            </p>
          </div>
          <div className="p-6 pt-4 max-h-[70vh] overflow-auto">
            <img
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              className="w-full h-auto rounded-lg border border-border"
            />
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);

export default PreviewLightbox;
