# KiCad source protection

All source, sandbox, candidate, and promotion decisions use canonical paths. Existing paths resolve through native realpath; non-existing candidate paths resolve their real parent before comparison. Case-insensitive containment checks prevent lexical prefix escapes on Windows.

Imported sources may only produce candidates below `.boardforge/candidates`. A candidate cannot resolve to the source. Protected project aliases (`ESC`, `FC`, flight-controller, `FN-ESC`, and `FN-FC`) are refused, including the protected hardware root. Candidate creation requires an exact base hash and verifies that the source stayed unchanged during generation. Promotion repeats the base-hash check and writes only into `.boardforge/local`.

These guards protect the candidate service; they are not a general authorization to mutate arbitrary local projects. Explicit promotion remains required.
