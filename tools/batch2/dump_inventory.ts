// Emits the canonical manifest as machine-readable JSON, loaded from the real
// module rather than parsed out of the source text.
import { DELETABLE, EXPORTABLE, INVENTORY, PROHIBITED_EXPORT_COLUMNS, REFERENCE_TABLES } from "../../supabase/functions/_shared/inventory.ts";

console.log(JSON.stringify({
  inventory: INVENTORY,
  reference_tables: REFERENCE_TABLES,
  exportable: EXPORTABLE.map((e) => e.table),
  deletable: DELETABLE.map((e) => e.table),
  prohibited_export_columns: PROHIBITED_EXPORT_COLUMNS,
}, null, 2));
