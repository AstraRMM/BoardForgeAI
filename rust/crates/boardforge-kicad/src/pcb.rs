use crate::model::{ParsedKiCadDocument, UnsupportedConstruct, WriteMode};
use crate::raw::RawSExpression;
use boardforge_core::{BoardForgeError, Result};
use serde::{Deserialize, Serialize};

const TYPED_HEADS: &[&str] = &[
    "version",
    "generator",
    "generator_version",
    "general",
    "paper",
    "layers",
    "setup",
    "property",
    "net",
    "footprint",
    "segment",
    "arc",
    "via",
    "zone",
    "gr_line",
    "gr_arc",
    "gr_rect",
    "gr_circle",
    "gr_poly",
    "gr_curve",
    "gr_text",
    "gr_text_box",
    "dimension",
    "target",
    "image",
    "group",
    "embedded_fonts",
];

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PcbNode {
    pub ordinal: usize,
    pub kind: String,
    pub uuid: Option<String>,
    pub layer: Option<String>,
    /// Exact KiCad numeric atom lexemes. These are deliberately not round-tripped through f64.
    pub coordinates: Vec<String>,
    pub raw: RawSExpression,
}

macro_rules! node_type {
    ($name:ident) => {
        #[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
        pub struct $name(pub PcbNode);
    };
}

node_type!(Segment);
node_type!(Arc);
node_type!(Via);
node_type!(Pad);
node_type!(Zone);
node_type!(Keepout);
node_type!(Graphic);
node_type!(Dimension);
node_type!(Text);
node_type!(Model3d);
node_type!(Group);
node_type!(EdgeCut);

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Layer {
    pub ordinal: usize,
    pub number: String,
    pub name: String,
    pub kind: Option<String>,
    pub raw: RawSExpression,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Net {
    pub ordinal: usize,
    pub code: String,
    pub name: String,
    pub raw: RawSExpression,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Footprint {
    pub node: PcbNode,
    pub library_link: Option<String>,
    pub pads: Vec<Pad>,
    pub graphics: Vec<Graphic>,
    pub texts: Vec<Text>,
    pub models: Vec<Model3d>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PcbDocument {
    pub parsed: ParsedKiCadDocument,
    pub version: Option<String>,
    pub generator: Option<String>,
    pub generator_version: Option<String>,
    pub layers: Vec<Layer>,
    pub nets: Vec<Net>,
    pub footprints: Vec<Footprint>,
    pub pads: Vec<Pad>,
    pub segments: Vec<Segment>,
    pub arcs: Vec<Arc>,
    pub vias: Vec<Via>,
    pub zones: Vec<Zone>,
    pub keepouts: Vec<Keepout>,
    pub graphics: Vec<Graphic>,
    pub dimensions: Vec<Dimension>,
    pub texts: Vec<Text>,
    pub edge_cuts: Vec<EdgeCut>,
    pub models: Vec<Model3d>,
    pub groups: Vec<Group>,
}

impl PcbDocument {
    pub fn parse(source: impl Into<String>) -> Result<Self> {
        let parsed = ParsedKiCadDocument::parse(source, "kicad_pcb", TYPED_HEADS)?;
        let root = parsed
            .root
            .as_list()
            .ok_or_else(|| BoardForgeError::InvalidInput("PCB root must be a list".into()))?
            .to_vec();
        let mut board = Self {
            parsed,
            version: None,
            generator: None,
            generator_version: None,
            layers: vec![],
            nets: vec![],
            footprints: vec![],
            pads: vec![],
            segments: vec![],
            arcs: vec![],
            vias: vec![],
            zones: vec![],
            keepouts: vec![],
            graphics: vec![],
            dimensions: vec![],
            texts: vec![],
            edge_cuts: vec![],
            models: vec![],
            groups: vec![],
        };
        for (ordinal, raw) in root.iter().enumerate().skip(1) {
            match raw.head() {
                Some("version") => board.version = raw.atom(1).map(str::to_owned),
                Some("generator") => board.generator = raw.atom(1).map(unquote),
                Some("generator_version") => board.generator_version = raw.atom(1).map(unquote),
                Some("layers") => board.layers = parse_layers(raw),
                Some("net") => {
                    if let (Some(code), Some(name)) = (raw.atom(1), raw.atom(2)) {
                        board.nets.push(Net {
                            ordinal,
                            code: code.into(),
                            name: unquote(name),
                            raw: raw.clone(),
                        });
                    }
                }
                Some("footprint") => {
                    let footprint = parse_footprint(raw, ordinal);
                    board.pads.extend(footprint.pads.clone());
                    board.models.extend(footprint.models.clone());
                    board.footprints.push(footprint);
                }
                Some("segment") => board.segments.push(Segment(node(raw, ordinal))),
                Some("arc") => board.arcs.push(Arc(node(raw, ordinal))),
                Some("via") => board.vias.push(Via(node(raw, ordinal))),
                Some("zone") => {
                    let n = node(raw, ordinal);
                    if raw.children("keepout").next().is_some() {
                        board.keepouts.push(Keepout(n.clone()));
                    }
                    board.zones.push(Zone(n));
                }
                Some("dimension") => board.dimensions.push(Dimension(node(raw, ordinal))),
                Some("gr_text") | Some("gr_text_box") => board.texts.push(Text(node(raw, ordinal))),
                Some("group") => board.groups.push(Group(node(raw, ordinal))),
                Some(head) if head.starts_with("gr_") => {
                    let n = node(raw, ordinal);
                    if n.layer.as_deref() == Some("Edge.Cuts") {
                        board.edge_cuts.push(EdgeCut(n.clone()));
                    }
                    board.graphics.push(Graphic(n));
                }
                _ => {}
            }
        }
        Ok(board)
    }

    pub fn write(&self, mode: WriteMode) -> Result<String> {
        self.parsed.write(mode)
    }
    pub fn unsupported(&self) -> &[UnsupportedConstruct] {
        &self.parsed.unsupported
    }
}

fn parse_layers(raw: &RawSExpression) -> Vec<Layer> {
    raw.as_list()
        .into_iter()
        .flatten()
        .enumerate()
        .skip(1)
        .filter_map(|(ordinal, child)| {
            Some(Layer {
                ordinal,
                number: child.atom(0)?.into(),
                name: unquote(child.atom(1)?),
                kind: child.atom(2).map(unquote),
                raw: child.clone(),
            })
        })
        .collect()
}

fn parse_footprint(raw: &RawSExpression, ordinal: usize) -> Footprint {
    let mut pads = Vec::new();
    let mut graphics = Vec::new();
    let mut texts = Vec::new();
    let mut models = Vec::new();
    if let Some(children) = raw.as_list() {
        for (nested_ordinal, child) in children.iter().enumerate().skip(1) {
            match child.head() {
                Some("pad") => pads.push(Pad(node(child, nested_ordinal))),
                Some("model") => models.push(Model3d(node(child, nested_ordinal))),
                Some("fp_text") | Some("fp_text_box") => {
                    texts.push(Text(node(child, nested_ordinal)))
                }
                Some(head) if head.starts_with("fp_") => {
                    graphics.push(Graphic(node(child, nested_ordinal)))
                }
                _ => {}
            }
        }
    }
    Footprint {
        node: node(raw, ordinal),
        library_link: raw.atom(1).map(unquote),
        pads,
        graphics,
        texts,
        models,
    }
}

fn node(raw: &RawSExpression, ordinal: usize) -> PcbNode {
    PcbNode {
        ordinal,
        kind: raw.head().unwrap_or_default().into(),
        uuid: first_child_atom(raw, &["uuid", "tstamp"]),
        layer: first_child_atom(raw, &["layer"]),
        coordinates: coordinate_atoms(raw),
        raw: raw.clone(),
    }
}

fn first_child_atom(raw: &RawSExpression, heads: &[&str]) -> Option<String> {
    heads
        .iter()
        .find_map(|head| raw.children(head).next()?.atom(1).map(unquote))
}

fn coordinate_atoms(raw: &RawSExpression) -> Vec<String> {
    const COORDINATE_HEADS: &[&str] = &[
        "at", "start", "mid", "end", "center", "xy", "xyz", "size", "drill",
    ];
    let mut output = Vec::new();
    collect_coordinates(raw, &mut output, COORDINATE_HEADS);
    output
}

fn collect_coordinates(raw: &RawSExpression, output: &mut Vec<String>, heads: &[&str]) {
    let Some(values) = raw.as_list() else { return };
    if raw.head().is_some_and(|head| heads.contains(&head)) {
        output.extend(values.iter().skip(1).filter_map(|v| match v {
            RawSExpression::Atom(atom) => Some(atom.clone()),
            _ => None,
        }));
    }
    for child in values.iter().skip(1) {
        collect_coordinates(child, output, heads);
    }
}

fn unquote(value: &str) -> String {
    value
        .strip_prefix('"')
        .and_then(|v| v.strip_suffix('"'))
        .unwrap_or(value)
        .replace("\\\"", "\"")
        .replace("\\\\", "\\")
}

#[cfg(test)]
mod tests {
    use super::*;

    const SYNTHETIC: &str = r#"(kicad_pcb
  (version 20240108)
  (generator "pcbnew")
  (generator_version "8.0")
  (layers (0 "F.Cu" signal) (31 "B.Cu" signal) (44 "Edge.Cuts" user ""))
  (net 0 "") (net 1 "GND")
  (footprint "Connector:USB" (layer "F.Cu") (at 10.000000 20.5000 90)
    (uuid "fp-uuid") (fp_text reference "J1" (at 0 0) (layer "F.SilkS"))
    (fp_line (start -1.25 0) (end 1.25 0) (stroke (width 0.12) (type default)) (layer "F.SilkS"))
    (pad "1" thru_hole circle (at -2.5400 0) (size 1.7 1.7) (drill 0.9) (layers "*.Cu" "*.Mask") (net 1 "GND") (uuid "pad-uuid"))
    (model "${KICAD8_3DMODEL_DIR}/usb.wrl" (offset (xyz 0 0 0))))
  (segment (start 1.000000 2.50) (end 3 4) (width 0.25) (layer "F.Cu") (net 1) (uuid "seg-uuid"))
  (arc (start 3 4) (mid 4 5) (end 5 4) (width 0.25) (layer "F.Cu") (net 1) (uuid "arc-uuid"))
  (via (at 5 4) (size 0.8) (drill 0.4) (layers "F.Cu" "B.Cu") (net 1) (uuid "via-uuid"))
  (zone (net 0) (net_name "") (layer "F.Cu") (uuid "zone-uuid") (keepout (tracks not_allowed) (vias not_allowed)))
  (gr_line (start 0.000 0) (end 30.000 0) (stroke (width 0.05) (type default)) (layer "Edge.Cuts") (uuid "edge-uuid"))
  (gr_text "hello" (at 2 2) (layer "F.SilkS") (uuid "text-uuid"))
  (dimension (type aligned) (layer "Dwgs.User") (uuid "dim-uuid") (pts (xy 0 0) (xy 30 0)))
  (group "mechanical" (uuid "group-uuid") (members "edge-uuid"))
  (future_board_node (precise 1.230000000000) (uuid "unknown-uuid")))"#;

    #[test]
    fn indexes_full_pcb_surface_without_losing_raw_nodes() {
        let pcb = PcbDocument::parse(SYNTHETIC).unwrap();
        assert_eq!(pcb.version.as_deref(), Some("20240108"));
        assert_eq!(pcb.generator.as_deref(), Some("pcbnew"));
        assert_eq!(pcb.layers.len(), 3);
        assert_eq!(pcb.nets.len(), 2);
        assert_eq!(pcb.footprints.len(), 1);
        assert_eq!(pcb.pads.len(), 1);
        assert_eq!(pcb.models.len(), 1);
        assert_eq!(pcb.segments.len(), 1);
        assert_eq!(pcb.arcs.len(), 1);
        assert_eq!(pcb.vias.len(), 1);
        assert_eq!(pcb.zones.len(), 1);
        assert_eq!(pcb.keepouts.len(), 1);
        assert_eq!(pcb.edge_cuts.len(), 1);
        assert_eq!(pcb.dimensions.len(), 1);
        assert_eq!(pcb.texts.len(), 1);
        assert_eq!(pcb.groups.len(), 1);
        assert_eq!(pcb.segments[0].0.uuid.as_deref(), Some("seg-uuid"));
        assert!(pcb.segments[0].0.coordinates.contains(&"1.000000".into()));
        assert!(pcb
            .unsupported()
            .iter()
            .any(|item| item.kind == "future_board_node" && item.preserved));
    }

    #[test]
    fn preserve_mode_is_byte_exact_and_canonical_keeps_unknown_precision_and_uuid() {
        let pcb = PcbDocument::parse(SYNTHETIC).unwrap();
        assert_eq!(pcb.write(WriteMode::PreserveMode).unwrap(), SYNTHETIC);
        let canonical = pcb.write(WriteMode::CanonicalMode).unwrap();
        assert!(canonical
            .contains("(future_board_node (precise 1.230000000000) (uuid \"unknown-uuid\"))"));
        assert!(canonical.contains("(start 1.000000 2.50)"));
        assert!(
            canonical.find("(segment ").unwrap() < canonical.find("(future_board_node ").unwrap()
        );
    }

    #[test]
    fn rejects_non_pcb_roots() {
        assert!(PcbDocument::parse("(kicad_sch (version 1))").is_err());
    }
}
