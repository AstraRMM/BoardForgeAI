import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..', 'fixtures', 'kicad-roundtrip', 'm3')
const uuid = index => `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`
const project = (name, extra = '') => JSON.stringify({ board: {}, boards: [], cvpcb: {}, erc: {}, libraries: {}, meta: { filename: `${name}.kicad_pro`, version: 1 }, net_settings: { classes: [{ name: 'Default', clearance: 0.2, track_width: 0.25 }] }, pcbnew: {}, schematic: {}, text_variables: { BOARD_NAME: name }, ...(extra ? { boardforge_unknown_project_field: extra } : {}) }, null, 2) + '\n'
const schematic = (name, extra = '') => `(kicad_sch (version 20231120) (generator boardforge) (uuid ${uuid(1)}) (paper "A4") (lib_symbols)
  (symbol (lib_id "Device:R") (at 80 80 0) (unit 1) (in_bom yes) (on_board yes) (uuid ${uuid(2)}) (property "Reference" "R1" (at 82 78 0) (effects (font (size 1.27 1.27)))) (property "Value" "10k" (at 82 82 0) (effects (font (size 1.27 1.27)))))
  (wire (pts (xy 60 80) (xy 100 80)) (stroke (width 0) (type default)) (uuid ${uuid(3)}))
  (junction (at 80 80) (diameter 0) (color 0 0 0 0) (uuid ${uuid(4)}))
  (label "${name.toUpperCase()}_NET" (at 100 80 0) (effects (font (size 1.27 1.27))) (uuid ${uuid(5)}))
  ${extra}
  (sheet_instances (path "/" (page "1"))))\n`
const pcb = (name, extra = '', layers = '(0 "F.Cu" signal) (31 "B.Cu" signal)') => `(kicad_pcb (version 20240108) (generator boardforge)
  (general (thickness 1.6)) (paper "A4") (layers ${layers} (36 "B.SilkS" user "b.silkscreen") (37 "F.SilkS" user "f.silkscreen") (44 "Edge.Cuts" user))
  (setup (pad_to_mask_clearance 0)) (net 0 "") (net 1 "${name.toUpperCase()}_NET")
  (footprint "BoardForge:TEST" (layer "F.Cu") (at 30 30 0) (uuid ${uuid(10)}) (property "Reference" "U1" (at 0 -3 0) (layer "F.SilkS")) (pad "1" thru_hole circle (at 0 0) (size 2 2) (drill 1) (layers "*.Cu" "*.Mask") (net 1 "${name.toUpperCase()}_NET")))
  (segment (start 30 30) (end 40 30) (width 0.25) (layer "F.Cu") (net 1) (uuid ${uuid(11)}))
  (via (at 40 30) (size 0.8) (drill 0.4) (layers "F.Cu" "B.Cu") (net 1) (uuid ${uuid(12)}))
  (gr_rect (start 20 20) (end 60 45) (stroke (width 0.05) (type default)) (fill none) (layer "Edge.Cuts"))
  ${extra})\n`

const fixtures = [
  ['01-minimal-project','pro',''], ['02-project-netclasses','pro','netclasses'], ['03-project-text-variables','pro','variables'], ['04-project-unknown-json','pro','preserve-me'],
  ['05-simple-mcu','sch',''], ['06-usb-c','sch','(global_label "USB_D+" (shape input) (at 60 80 180) (effects (font (size 1.27 1.27))) (uuid 20000000-0000-4000-8000-000000000001))'],
  ['07-can-node','sch','(hierarchical_label "CAN_H" (shape input) (at 60 80 180) (effects (font (size 1.27 1.27))) (uuid 20000000-0000-4000-8000-000000000002))'],
  ['08-regulator','sch','(no_connect (at 90 90) (uuid 20000000-0000-4000-8000-000000000003))'],
  ['09-hierarchical-sheet','sch','(sheet (at 120 60) (size 40 30) (fields_autoplaced) (stroke (width 0) (type default)) (fill (color 0 0 0 0.0000)) (uuid 20000000-0000-4000-8000-000000000004))'],
  ['10-global-power','sch','(global_label "+3V3" (shape input) (at 80 70 0) (effects (font (size 1.27 1.27))) (uuid 20000000-0000-4000-8000-000000000005))'],
  ['11-bus-entry','sch','(bus (pts (xy 40 40) (xy 100 40)) (stroke (width 0) (type default)) (uuid 20000000-0000-4000-8000-000000000006)) (bus_entry (at 60 40) (size 2.54 2.54) (stroke (width 0) (type default)) (uuid 20000000-0000-4000-8000-000000000007))'],
  ['12-no-connect-junction','sch','(no_connect (at 110 80) (uuid 20000000-0000-4000-8000-000000000008))'],
  ['13-unknown-schematic-node','sch','(future_schematic_construct (payload "preserve exactly") (uuid 20000000-0000-4000-8000-000000000009))'],
  ['14-simple-2layer','pcb',''], ['15-four-layer','pcb','', '(0 "F.Cu" signal) (2 "In1.Cu" power) (30 "In2.Cu" power) (31 "B.Cu" signal)'],
  ['16-custom-edge-cuts','pcb','(gr_poly (pts (xy 25 25) (xy 55 25) (xy 50 40) (xy 30 42)) (stroke (width 0.05) (type default)) (fill none) (layer "Edge.Cuts"))'],
  ['17-arcs-fillets-notches','pcb','(gr_arc (start 20 25) (mid 22 21) (end 26 20) (stroke (width 0.05) (type default)) (fill none) (layer "Edge.Cuts"))'],
  ['18-zones-keepouts','pcb','(zone (net 1) (net_name "ZONE_NET") (layer "F.Cu") (hatch edge 0.5) (connect_pads (clearance 0.2)) (min_thickness 0.25) (polygon (pts (xy 22 22) (xy 58 22) (xy 58 43) (xy 22 43))))'],
  ['19-3d-models','pcb','(footprint "BoardForge:MODEL" (layer "F.Cu") (at 45 35) (uuid 30000000-0000-4000-8000-000000000001) (model "${KICAD9_3DMODEL_DIR}/Connector.step" (offset (xyz 0 0 0)) (scale (xyz 1 1 1)) (rotate (xyz 0 0 0))))'],
  ['20-dimensions-graphics','pcb','(dimension (type aligned) (layer "Dwgs.User") (uuid 30000000-0000-4000-8000-000000000002) (pts (xy 20 20) (xy 60 20)) (height -5) (gr_text "40.00 mm" (at 40 13.85 0) (layer "Dwgs.User") (effects (font (size 1.27 1.27) (thickness 0.15)))))'],
  ['21-diffpair-netclass','pcb','(property "diff_pair" "USB_D+/USB_D-")'],
  ['22-imported-complex','pcb','(group "imported" (uuid 30000000-0000-4000-8000-000000000003) (members 10000000-0000-4000-8000-000000000010))'],
  ['23-unknown-pcb-node','pcb','(future_pcb_construct (payload "preserve exactly") (uuid 30000000-0000-4000-8000-000000000004))'],
  ['24-mixed-generated-imported','pcb','(property "origin" "mixed") (future_import_metadata "retain")'],
]

// A fixture refresh is an exact, deterministic corpus replacement. Removing the
// old tree prevents renamed/deleted cases from silently inflating parity counts.
rmSync(root, { recursive: true, force: true })
for (const [directory, type, extra, layers] of fixtures) {
  const path = resolve(root, directory); mkdirSync(path, { recursive: true }); const name = directory.slice(3)
  const extension = type === 'pro' ? 'kicad_pro' : type === 'sch' ? 'kicad_sch' : 'kicad_pcb'
  const content = type === 'pro' ? project(name, extra) : type === 'sch' ? schematic(name, extra) : pcb(name, extra, layers)
  writeFileSync(resolve(path, `${name}.${extension}`), content)
}
writeFileSync(resolve(root, 'manifest.json'), JSON.stringify({ schemaVersion: 1, fixtureCount: fixtures.length, fixtures: fixtures.map(([directory, type]) => ({ directory, type })) }, null, 2) + '\n')
console.log(`Generated ${fixtures.length} synthetic KiCad M3 fixtures in ${root}`)
