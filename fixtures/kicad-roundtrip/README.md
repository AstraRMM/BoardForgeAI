# KiCad round-trip fixtures

`minimal/` is the first deliberately small, reviewable KiCad project fixture. It contains a rectangular Edge.Cuts board, preserved silkscreen text, and a schematic wire/label. Files are plain KiCad-native `.kicad_pro`, `.kicad_pcb`, and `.kicad_sch`, not BoardForge intermediates.

Planned corpus expansion: footprints/pads/nets; tracks/vias/zones; arcs and concave outlines; hierarchical sheets; custom fields; legacy supported versions; and deliberately unsupported constructs. Each parser/writer test must compare normalized structure, report intentional formatting differences, and byte-preserve unknown S-expressions. Both KiCad → BoardForge → KiCad and BoardForge → KiCad → BoardForge paths are required before parser promotion.
