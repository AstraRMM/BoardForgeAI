# KiCad edit transactions

M3 defines version 1 schematic edit transactions in `boardforge-kicad::edit`. Supported operations move or rotate a symbol, edit a symbol property, add or delete a wire, and add, move, edit, or delete a label. Operations address stable UUIDs and may carry expected old values.

Application is atomic: edits are applied to a cloned raw AST, and any unsupported version, missing UUID, duplicate UUID, invalid structure, or stale expected value rejects the entire transaction. The source document is not mutated. Successful results contain canonical candidate text, per-operation diffs, and a preserved-unsupported count.

Alpha limits: transactions do not yet cover every schematic construct, connectivity is not recalculated, and numeric atoms changed by an edit are newly serialized. Successful AST application is not electrical validation and is not permission to overwrite a source file.
