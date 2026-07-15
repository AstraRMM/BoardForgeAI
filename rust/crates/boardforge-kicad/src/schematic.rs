//! Typed, non-destructive views over KiCad schematic S-expressions.
//!
//! The shared raw tree remains authoritative: unknown nodes and original ordering
//! survive, while preserve-mode writing returns the exact source bytes.

use crate::{
    model::{ParsedKiCadDocument, WriteMode},
    raw::RawSExpression,
};
use boardforge_core::Result;

const TYPED_HEADS: &[&str] = &[
    "version",
    "generator",
    "generator_version",
    "uuid",
    "paper",
    "lib_symbols",
    "symbol",
    "wire",
    "bus",
    "bus_entry",
    "label",
    "global_label",
    "hierarchical_label",
    "junction",
    "no_connect",
    "sheet",
    "sheet_instances",
    "symbol_instances",
    "text",
    "text_box",
    "polyline",
    "rectangle",
    "circle",
    "arc",
    "bezier",
];

#[derive(Clone, Debug, PartialEq)]
pub struct Schematic {
    pub document: ParsedKiCadDocument,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Position {
    pub x: f64,
    pub y: f64,
    pub angle: Option<f64>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ItemKind {
    Symbol,
    Wire,
    Bus,
    BusEntry,
    Label,
    GlobalLabel,
    HierarchicalLabel,
    Junction,
    NoConnect,
    Sheet,
    Text,
    TextBox,
    Graphic,
    Unknown,
}

#[derive(Clone, Copy, Debug)]
pub struct Item<'a> {
    pub kind: ItemKind,
    pub raw: &'a RawSExpression,
}

#[derive(Clone, Copy, Debug)]
pub struct Property<'a> {
    pub name: &'a str,
    pub value: &'a str,
    pub raw: &'a RawSExpression,
}

#[derive(Clone, Copy, Debug)]
pub struct Pin<'a> {
    pub number: Option<&'a str>,
    pub uuid: Option<&'a str>,
    pub position: Option<Position>,
    pub raw: &'a RawSExpression,
}

#[derive(Clone, Debug)]
pub struct Symbol<'a> {
    pub lib_id: Option<&'a str>,
    pub uuid: Option<&'a str>,
    pub position: Option<Position>,
    pub properties: Vec<Property<'a>>,
    pub pins: Vec<Pin<'a>>,
    pub power: bool,
    pub raw: &'a RawSExpression,
}

impl Schematic {
    pub fn parse(source: impl Into<String>) -> Result<Self> {
        Ok(Self {
            document: ParsedKiCadDocument::parse(source, "kicad_sch", TYPED_HEADS)?,
        })
    }
    pub fn write(&self, mode: WriteMode) -> Result<String> {
        self.document.write(mode)
    }
    pub fn root(&self) -> &RawSExpression {
        &self.document.root
    }
    pub fn version(&self) -> Option<u32> {
        child_value(self.root(), "version").and_then(|v| v.parse().ok())
    }
    pub fn generator(&self) -> Option<&str> {
        child_value(self.root(), "generator").map(unquote)
    }
    pub fn uuid(&self) -> Option<&str> {
        child_value(self.root(), "uuid").map(unquote)
    }
    pub fn items(&self) -> impl Iterator<Item = Item<'_>> {
        self.root()
            .as_list()
            .unwrap_or(&[])
            .iter()
            .skip(1)
            .map(|raw| Item {
                kind: match raw.head() {
                    Some("symbol") => ItemKind::Symbol,
                    Some("wire") => ItemKind::Wire,
                    Some("bus") => ItemKind::Bus,
                    Some("bus_entry") => ItemKind::BusEntry,
                    Some("label") => ItemKind::Label,
                    Some("global_label") => ItemKind::GlobalLabel,
                    Some("hierarchical_label") => ItemKind::HierarchicalLabel,
                    Some("junction") => ItemKind::Junction,
                    Some("no_connect") => ItemKind::NoConnect,
                    Some("sheet") => ItemKind::Sheet,
                    Some("text") => ItemKind::Text,
                    Some("text_box") => ItemKind::TextBox,
                    Some("polyline" | "rectangle" | "circle" | "arc" | "bezier") => {
                        ItemKind::Graphic
                    }
                    _ => ItemKind::Unknown,
                },
                raw,
            })
    }
    pub fn symbols(&self) -> impl Iterator<Item = Symbol<'_>> {
        self.items()
            .filter(|i| i.kind == ItemKind::Symbol)
            .map(|i| symbol(i.raw))
    }
}

fn child_value<'a>(node: &'a RawSExpression, head: &'a str) -> Option<&'a str> {
    node.children(head).next()?.atom(1)
}
fn unquote(value: &str) -> &str {
    value
        .strip_prefix('"')
        .and_then(|v| v.strip_suffix('"'))
        .unwrap_or(value)
}
fn position(node: &RawSExpression) -> Option<Position> {
    let at = node.children("at").next()?;
    Some(Position {
        x: at.atom(1)?.parse().ok()?,
        y: at.atom(2)?.parse().ok()?,
        angle: at.atom(3).and_then(|v| v.parse().ok()),
    })
}
fn symbol(raw: &RawSExpression) -> Symbol<'_> {
    let properties = raw
        .children("property")
        .filter_map(|n| {
            Some(Property {
                name: unquote(n.atom(1)?),
                value: unquote(n.atom(2)?),
                raw: n,
            })
        })
        .collect();
    let pins = raw
        .children("pin")
        .map(|n| Pin {
            number: n.atom(1).map(unquote),
            uuid: child_value(n, "uuid").map(unquote),
            position: position(n),
            raw: n,
        })
        .collect();
    let lib_id = child_value(raw, "lib_id").map(unquote);
    Symbol {
        lib_id,
        uuid: child_value(raw, "uuid").map(unquote),
        position: position(raw),
        properties,
        pins,
        power: lib_id.is_some_and(|id| id.starts_with("power:")),
        raw,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const SCH: &str = r#"(kicad_sch (version 20231120) (generator "BoardForge") (uuid root) (lib_symbols) (symbol (lib_id "Device:R") (at 10 20 90) (uuid s1) (property "Reference" "R1") (pin "1" (uuid p1))) (symbol (lib_id "power:GND") (at 0 0 0) (uuid gnd)) (wire (pts (xy 0 0) (xy 10 0)) (uuid w1)) (label "NET") (global_label "VCC") (hierarchical_label "BUS") (junction (at 1 1)) (no_connect (at 2 2)) (sheet (at 3 3)) (text "note") (rectangle (start 0 0) (end 1 1)) (future_node (opaque "kept")))"#;
    #[test]
    fn parses_header_symbols_properties_pins_and_power() {
        let s = Schematic::parse(SCH).unwrap();
        assert_eq!(s.version(), Some(20231120));
        assert_eq!(s.generator(), Some("BoardForge"));
        assert_eq!(s.uuid(), Some("root"));
        let v: Vec<_> = s.symbols().collect();
        assert_eq!(
            v[0].position,
            Some(Position {
                x: 10.,
                y: 20.,
                angle: Some(90.)
            })
        );
        assert_eq!(v[0].properties[0].value, "R1");
        assert_eq!(v[0].pins[0].uuid, Some("p1"));
        assert!(v[1].power);
    }
    #[test]
    fn classifies_items_and_reports_unknown_raw_nodes() {
        let s = Schematic::parse(SCH).unwrap();
        let kinds: Vec<_> = s.items().map(|i| i.kind).collect();
        assert!(kinds.contains(&ItemKind::Wire));
        assert!(kinds.contains(&ItemKind::GlobalLabel));
        assert!(kinds.contains(&ItemKind::HierarchicalLabel));
        assert!(kinds.contains(&ItemKind::Graphic));
        assert!(s
            .document
            .unsupported
            .iter()
            .any(|u| u.kind == "future_node" && u.preserved));
    }
    #[test]
    fn preserve_is_byte_exact_and_canonical_is_structurally_equal() {
        let s = Schematic::parse(SCH).unwrap();
        assert_eq!(s.write(WriteMode::PreserveMode).unwrap(), SCH);
        let canonical = s.write(WriteMode::CanonicalMode).unwrap();
        assert_eq!(Schematic::parse(canonical).unwrap().root(), s.root());
    }
    #[test]
    fn rejects_invalid_documents() {
        assert!(Schematic::parse("(not_a_schematic)").is_err());
        assert!(Schematic::parse("(kicad_sch (version 1)").is_err());
    }
}
