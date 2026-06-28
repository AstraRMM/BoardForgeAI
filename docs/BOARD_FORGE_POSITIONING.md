# BoardForge Positioning

BoardForge should feel like an AI PCB engineer that can build, route, verify, and package boards with very little babysitting.

## Product Promise

Give BoardForge a board goal. It creates a KiCad project, chooses parts and footprints, places components, routes with the best available backend, repairs the result, validates it, and exports manufacturing files only when the board is honestly ready.

## What REV_F Taught

REV_F proved true outline-aware placement and connector edge intent, but also showed that a mechanically nicer outline can be less routeable than a compact verified topology. BoardForge must therefore score routeability and promote the board that is manufacturable, not merely the one that looks more product-like.

## Default Dense-Board Strategy

FreeRouting and other external routers handle bulk copper. BoardForge supervises, scores, repairs, finishes exact leftovers, and escalates to regional reroute or design-relaxation reports when physics says no.
