import { normalizePoints } from './outline-validator.mjs'

export function edgeCutsSegments(points) {
  const normalized = normalizePoints(points)
  return normalized.map((point, index) => ({
    start: point,
    end: normalized[(index + 1) % normalized.length],
    layer: 'Edge.Cuts',
  }))
}

export function outlineSummary(points) {
  const normalized = normalizePoints(points)
  return {
    segments: edgeCutsSegments(normalized).length,
    closed: normalized.length >= 3,
  }
}

export function writeKiCadPcbText({ projectName = 'boardforge-custom-outline', points = [], holes = [], layerCount = 2 }) {
  const normalized = normalizePoints(points)
  const copperLayers = layerCount >= 4
    ? '  (layers\n    (0 "F.Cu" signal)\n    (1 "In1.Cu" signal)\n    (2 "In2.Cu" signal)\n    (31 "B.Cu" signal)\n    (44 "Edge.Cuts" user)\n  )'
    : '  (layers\n    (0 "F.Cu" signal)\n    (31 "B.Cu" signal)\n    (44 "Edge.Cuts" user)\n  )'
  const edgeLines = normalized.map((point, index) => {
    const next = normalized[(index + 1) % normalized.length]
    return `  (gr_line (start ${mm(point.x)} ${mm(point.y)}) (end ${mm(next.x)} ${mm(next.y)}) (stroke (width 0.1) (type default)) (layer "Edge.Cuts") (uuid "${uuid('edge', index)}"))`
  }).join('\n')
  const holeFootprints = holes.map((hole, index) => mountingHoleFootprint(hole, index)).join('\n')
  return `(kicad_pcb
  (version 20240108)
  (generator "BoardForge")
  (generator_version "0.1.0-alpha.1")
  (general)
  (paper "A4")
${copperLayers}
  (setup
    (pad_to_mask_clearance 0)
    (pcbplotparams
      (layerselection 0x00010fc_ffffffff)
      (plot_on_all_layers_selection 0x0000000_00000000)
      (disableapertmacros false)
      (usegerberextensions false)
      (usegerberattributes true)
      (usegerberadvancedattributes true)
      (creategerberjobfile true)
      (dashed_line_dash_ratio 12.000000)
      (dashed_line_gap_ratio 3.000000)
      (svguseinch false)
      (svgprecision 4)
      (excludeedgelayer true)
      (plotframeref false)
      (viasonmask false)
      (mode 1)
      (useauxorigin false)
      (hpglpennumber 1)
      (hpglpenspeed 20)
      (hpglpendiameter 15.000000)
      (pdf_front_fp_property_popups true)
      (pdf_back_fp_property_popups true)
      (pdf_metadata true)
      (pdf_single_document false)
      (dxfpolygonmode true)
      (dxfimperialunits true)
      (dxfusepcbnewfont true)
      (psnegative false)
      (psa4output false)
      (plot_black_and_white false)
      (plotinvisibletext false)
      (sketchpadsonfab false)
      (plotpadnumbers false)
      (hidednponfab false)
      (sketchdnponfab true)
      (crossoutdnponfab true)
      (plotfptext true)
      (subtractmaskfromsilk false)
      (outputformat 1)
      (mirror false)
      (drillshape 1)
      (scaleselection 1)
      (outputdirectory "")
    )
  )
  (property "BoardForgeProject" "${escape(projectName)}")
${edgeLines}
${holeFootprints}
)
`
}

export function writeKiCadSchematicText({ projectName = 'boardforge-custom-outline' }) {
  return `(kicad_sch
  (version 20250114)
  (generator "BoardForge")
  (generator_version "0.1.0-alpha.1")
  (uuid "${uuid('sch', 0)}")
  (paper "A4")
  (title_block
    (title "${escape(projectName)}")
    (comment 1 "Outline-only BoardForge seed. Add schematic in Codex plugin workflow.")
  )
)
`
}

export function writeKiCadProjectText({ projectName = 'boardforge-custom-outline' }) {
  return JSON.stringify({
    meta: { filename: `${projectName}.kicad_pro`, version: 1 },
    board: { design_settings: { defaults: { board_outline_line_width: 0.1 } } },
    cvpcb: { equivalence_files: [] },
    libraries: { pinned_footprint_libs: [], pinned_symbol_libs: [] },
    net_settings: { classes: [{ bus_width: 12, clearance: 0.2, diff_pair_gap: 0.25, diff_pair_via_gap: 0.25, diff_pair_width: 0.2, line_style: 0, microvia_diameter: 0.3, microvia_drill: 0.1, name: 'Default', pcb_color: 'rgba(0, 0, 0, 0.000)', schematic_color: 'rgba(0, 0, 0, 0.000)', track_width: 0.2, via_diameter: 0.6, via_drill: 0.3, wire_width: 6 }] },
    pcbnew: { last_paths: { gencad: '', idf: '', netlist: '', specctra_dsn: '', step: '', vrml: '' }, page_layout_descr_file: '' },
    schematic: { drawing: { default_line_thickness: 6, default_text_size: 50 }, legacy_lib_dir: '', legacy_lib_list: [] },
  }, null, 2)
}

function mountingHoleFootprint(hole, index) {
  const ref = hole.ref || `H${index + 1}`
  const drill = Number(hole.diameterMm || 2.2)
  const pad = drill + 1.4
  return `  (footprint "MountingHole_${mm(drill)}mm_M${Math.round(drill)}" (layer "F.Cu")
    (uuid "${uuid('hole', index)}")
    (at ${mm(hole.x)} ${mm(hole.y)})
    (descr "BoardForge generated mounting hole")
    (tags "mounting hole")
    (property "Reference" "${escape(ref)}" (at 0 -${mm(pad)}) (layer "F.SilkS") hide (uuid "${uuid('hole-ref', index)}") (effects (font (size 1 1) (thickness 0.15))))
    (property "Value" "MountingHole" (at 0 ${mm(pad)}) (layer "F.Fab") hide (uuid "${uuid('hole-val', index)}") (effects (font (size 1 1) (thickness 0.15))))
    (attr exclude_from_pos_files exclude_from_bom)
    (pad "" np_thru_hole circle (at 0 0) (size ${mm(pad)} ${mm(pad)}) (drill ${mm(drill)}) (layers "*.Cu" "*.Mask") (uuid "${uuid('hole-pad', index)}"))
  )`
}

function mm(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, '')
}

function escape(value) {
  return String(value).replace(/"/g, '\\"')
}

function uuid(prefix, index) {
  const base = `${prefix}-${index}`.replace(/[^a-zA-Z0-9]/g, '').padEnd(24, '0').slice(0, 24)
  return `${base.slice(0, 8)}-${base.slice(8, 12)}-${base.slice(12, 16)}-${base.slice(16, 20)}-${base.slice(20, 32).padEnd(12, '0')}`
}
