# Unsupported KiCad construct preservation

Unknown KiCad syntax is data, not noise. The raw S-expression tree retains unknown nodes and their order; `.kicad_pro` models retain unknown JSON keys at typed boundaries. Unsupported constructs are surfaced with a path, support status, preservation flag, modification flag, and risk statement.

An untouched imported file uses preserve mode. A canonical write retains unknown raw subtrees. If a future mutation cannot preserve an unsupported subtree, it must be marked `LOSS_RISK` or `BLOCKED`, and the writer must refuse the operation. The UI must name the construct and location rather than silently dropping it.

Alpha limitation: nested unknown syntax is retained by the raw parent even where it is not yet individually listed in the unsupported inventory. Loss analysis for fine-grained edits is not complete.
