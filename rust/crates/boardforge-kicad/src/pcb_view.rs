use crate::{
    pcb::{Footprint, Layer, PcbDocument, PcbNode},
    raw::RawSExpression,
};
use serde::Serialize;
use sha2::{Digest, Sha256};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbBrowserViewV1 {
    pub schema: &'static str,
    pub document_id: String,
    pub revision: u64,
    pub source_sha256: String,
    pub units: &'static str,
    pub title: String,
    pub bounds: PcbBounds,
    pub layers: Vec<PcbViewLayer>,
    pub footprints: Vec<PcbViewFootprint>,
    pub tracks: Vec<PcbViewTrack>,
    pub vias: Vec<PcbViewVia>,
    pub graphics: Vec<PcbViewGraphic>,
    pub ratsnest: Vec<PcbViewRatsnest>,
    pub violations: Vec<PcbViewViolation>,
    pub unsupported_count: usize,
}

#[derive(Clone, Copy, Debug, Default, Serialize)]
pub struct PcbPoint {
    pub x: f64,
    pub y: f64,
}
#[derive(Clone, Debug, Serialize)]
pub struct PcbBounds {
    pub min: PcbPoint,
    pub max: PcbPoint,
}
#[derive(Clone, Debug, Serialize)]
pub struct PcbViewLayer {
    pub id: String,
    pub name: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub side: Option<String>,
    pub color: String,
}
#[derive(Clone, Debug, Serialize)]
pub struct PcbViewPad {
    pub id: String,
    pub at: PcbPoint,
    pub size: PcbPoint,
    pub shape: String,
    pub layers: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub net: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub number: Option<String>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbViewFootprint {
    pub id: String,
    pub at: PcbPoint,
    pub rotation: f64,
    pub layer: String,
    pub reference: String,
    pub value: String,
    pub pads: Vec<PcbViewPad>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub courtyard: Option<Vec<PcbPoint>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_status: Option<String>,
}
#[derive(Clone, Debug, Serialize)]
pub struct PcbViewTrack {
    pub id: String,
    pub start: PcbPoint,
    pub end: PcbPoint,
    pub width: f64,
    pub layer: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub net: Option<String>,
}
#[derive(Clone, Debug, Serialize)]
pub struct PcbViewVia {
    pub id: String,
    pub at: PcbPoint,
    pub diameter: f64,
    pub drill: f64,
    pub layers: [String; 2],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub net: Option<String>,
}
#[derive(Clone, Debug, Serialize)]
pub struct PcbViewGraphic {
    pub id: String,
    pub kind: String,
    pub layer: String,
    pub points: Vec<PcbPoint>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}
#[derive(Clone, Debug, Serialize)]
pub struct PcbViewRatsnest {
    pub id: String,
    pub start: PcbPoint,
    pub end: PcbPoint,
    pub net: String,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbViewViolation {
    pub id: String,
    pub at: PcbPoint,
    pub severity: String,
    pub rule: String,
    pub message: String,
    pub object_ids: Vec<String>,
}

impl PcbBrowserViewV1 {
    pub fn from_document(board: &PcbDocument, revision: u64, title: impl Into<String>) -> Self {
        let layers = board.layers.iter().map(layer).collect();
        let footprints = board.footprints.iter().map(footprint).collect::<Vec<_>>();
        let tracks = board
            .segments
            .iter()
            .map(|x| track(&x.0))
            .collect::<Vec<_>>();
        let vias = board.vias.iter().map(|x| via(&x.0)).collect::<Vec<_>>();
        let graphics = board
            .graphics
            .iter()
            .map(|x| graphic(&x.0))
            .collect::<Vec<_>>();
        let mut points = Vec::new();
        for f in &footprints {
            points.push(f.at);
            for p in &f.pads {
                points.push(PcbPoint {
                    x: f.at.x + p.at.x,
                    y: f.at.y + p.at.y,
                });
            }
        }
        for t in &tracks {
            points.extend([t.start, t.end]);
        }
        for v in &vias {
            points.push(v.at);
        }
        for g in &graphics {
            points.extend(g.points.iter().copied());
        }
        let bounds = bounds(&points);
        Self {
            schema: "boardforge.pcb-view/v1",
            document_id: format!("pcb:{}", &board.parsed.source_sha256[..16]),
            revision,
            source_sha256: board.parsed.source_sha256.clone(),
            units: "mm",
            title: title.into(),
            bounds,
            layers,
            footprints,
            tracks,
            vias,
            graphics,
            ratsnest: vec![],
            violations: vec![],
            unsupported_count: board.unsupported().len(),
        }
    }
}

fn layer(v: &Layer) -> PcbViewLayer {
    let name = v.name.clone();
    let lower = name.to_ascii_lowercase();
    let kind = if lower.ends_with(".cu") {
        "copper"
    } else if lower.contains("silk") {
        "silkscreen"
    } else if lower.contains("mask") {
        "mask"
    } else if lower.contains("paste") {
        "paste"
    } else if name == "Edge.Cuts" {
        "edge"
    } else if lower.contains("dwgs") || lower.contains("comments") {
        "drawing"
    } else {
        "other"
    };
    let side = if name.starts_with("F.") {
        Some("front")
    } else if name.starts_with("B.") {
        Some("back")
    } else if kind == "copper" {
        Some("inner")
    } else {
        None
    };
    let color = match name.as_str() {
        "F.Cu" => "#ef4444",
        "B.Cu" => "#3b82f6",
        "Edge.Cuts" => "#fbbf24",
        "F.SilkS" => "#f8fafc",
        "B.SilkS" => "#cbd5e1",
        _ => "#94a3b8",
    };
    PcbViewLayer {
        id: name.clone(),
        name,
        kind: kind.into(),
        side: side.map(Into::into),
        color: color.into(),
    }
}
fn footprint(v: &Footprint) -> PcbViewFootprint {
    let (at, rotation) = at_rotation(&v.node.raw);
    PcbViewFootprint {
        id: id(&v.node),
        at,
        rotation,
        layer: v.node.layer.clone().unwrap_or_else(|| "F.Cu".into()),
        reference: property(&v.node.raw, "Reference")
            .unwrap_or_else(|| v.library_link.clone().unwrap_or_default()),
        value: property(&v.node.raw, "Value").unwrap_or_default(),
        pads: v.pads.iter().map(|p| pad(&p.0)).collect(),
        courtyard: None,
        model_status: Some(
            if v.models.is_empty() {
                "missing"
            } else {
                "available"
            }
            .into(),
        ),
    }
}
fn pad(v: &PcbNode) -> PcbViewPad {
    let raw = &v.raw;
    PcbViewPad {
        id: id(v),
        at: point(raw, "at").unwrap_or_default(),
        size: point(raw, "size").unwrap_or_default(),
        shape: raw.atom(3).map(unquote).unwrap_or_else(|| "custom".into()),
        layers: raw
            .children("layers")
            .next()
            .and_then(RawSExpression::as_list)
            .map(|x| x.iter().skip(1).filter_map(atom_value).collect())
            .unwrap_or_default(),
        net: raw
            .children("net")
            .next()
            .and_then(|n| n.atom(2).or_else(|| n.atom(1)))
            .map(unquote),
        number: raw.atom(1).map(unquote),
    }
}
fn track(v: &PcbNode) -> PcbViewTrack {
    PcbViewTrack {
        id: id(v),
        start: point(&v.raw, "start").unwrap_or_default(),
        end: point(&v.raw, "end").unwrap_or_default(),
        width: number(&v.raw, "width").unwrap_or(0.25),
        layer: v.layer.clone().unwrap_or_else(|| "F.Cu".into()),
        net: v
            .raw
            .children("net")
            .next()
            .and_then(|n| n.atom(1))
            .map(unquote),
    }
}
fn via(v: &PcbNode) -> PcbViewVia {
    let values = v
        .raw
        .children("layers")
        .next()
        .and_then(RawSExpression::as_list)
        .map(|x| x.iter().skip(1).filter_map(atom_value).collect::<Vec<_>>())
        .unwrap_or_default();
    PcbViewVia {
        id: id(v),
        at: point(&v.raw, "at").unwrap_or_default(),
        diameter: number(&v.raw, "size").unwrap_or(0.8),
        drill: number(&v.raw, "drill").unwrap_or(0.4),
        layers: [
            values.first().cloned().unwrap_or_else(|| "F.Cu".into()),
            values.get(1).cloned().unwrap_or_else(|| "B.Cu".into()),
        ],
        net: v
            .raw
            .children("net")
            .next()
            .and_then(|n| n.atom(1))
            .map(unquote),
    }
}
fn graphic(v: &PcbNode) -> PcbViewGraphic {
    let kind = match v.kind.as_str() {
        "gr_arc" => "arc",
        "gr_poly" | "gr_rect" | "gr_circle" => "polygon",
        "gr_text" | "gr_text_box" => "text",
        _ => "line",
    };
    let mut points = Vec::new();
    for h in ["start", "mid", "end", "center", "at"] {
        if let Some(p) = point(&v.raw, h) {
            points.push(p)
        }
    }
    PcbViewGraphic {
        id: id(v),
        kind: kind.into(),
        layer: v.layer.clone().unwrap_or_else(|| "Dwgs.User".into()),
        points,
        width: number(&v.raw, "width").or_else(|| {
            v.raw
                .children("stroke")
                .next()
                .and_then(|s| number(s, "width"))
        }),
        text: if kind == "text" {
            v.raw.atom(1).map(unquote)
        } else {
            None
        },
    }
}
fn id(v: &PcbNode) -> String {
    v.uuid.clone().unwrap_or_else(|| {
        format!(
            "raw-{}",
            &format!("{:x}", Sha256::digest(v.raw.canonical().as_bytes()))[..24]
        )
    })
}
fn at_rotation(v: &RawSExpression) -> (PcbPoint, f64) {
    let Some(n) = v.children("at").next() else {
        return (Default::default(), 0.);
    };
    (
        PcbPoint {
            x: parse(n.atom(1)),
            y: parse(n.atom(2)),
        },
        parse(n.atom(3)),
    )
}
fn point(v: &RawSExpression, h: &str) -> Option<PcbPoint> {
    let n = v.children(h).next()?;
    Some(PcbPoint {
        x: parse(n.atom(1)),
        y: parse(n.atom(2)),
    })
}
fn number(v: &RawSExpression, h: &str) -> Option<f64> {
    v.children(h).next().map(|n| parse(n.atom(1)))
}
fn parse(v: Option<&str>) -> f64 {
    v.and_then(|x| x.parse().ok()).unwrap_or(0.)
}
fn property(v: &RawSExpression, name: &str) -> Option<String> {
    v.children("property")
        .find(|p| p.atom(1).map(unquote).as_deref() == Some(name))
        .and_then(|p| p.atom(2))
        .map(unquote)
}
fn atom_value(v: &RawSExpression) -> Option<String> {
    match v {
        RawSExpression::Atom(x) => Some(unquote(x)),
        _ => None,
    }
}
fn unquote(v: &str) -> String {
    v.strip_prefix('"')
        .and_then(|x| x.strip_suffix('"'))
        .unwrap_or(v)
        .to_owned()
}
fn bounds(points: &[PcbPoint]) -> PcbBounds {
    if points.is_empty() {
        return PcbBounds {
            min: PcbPoint { x: 0., y: 0. },
            max: PcbPoint { x: 100., y: 100. },
        };
    }
    let mut min = PcbPoint {
        x: f64::INFINITY,
        y: f64::INFINITY,
    };
    let mut max = PcbPoint {
        x: f64::NEG_INFINITY,
        y: f64::NEG_INFINITY,
    };
    for p in points {
        min.x = min.x.min(p.x);
        min.y = min.y.min(p.y);
        max.x = max.x.max(p.x);
        max.y = max.y.max(p.y);
    }
    PcbBounds { min, max }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn emits_exact_browser_schema_and_stable_ids() {
        let pcb=PcbDocument::parse(r#"(kicad_pcb (version 1) (layers (0 "F.Cu" signal)) (footprint "R" (layer "F.Cu") (at 10 20 90) (uuid "f1") (property "Reference" "R1") (pad "1" thru_hole circle (at 1 2) (size 2 2) (layers "F.Cu") (uuid "p1"))) (segment (start 0 0) (end 5 5) (width 0.2) (layer "F.Cu") (net 1) (uuid "t1")))"#).unwrap();
        let v = PcbBrowserViewV1::from_document(&pcb, 3, "proof");
        let json = serde_json::to_value(v).unwrap();
        assert_eq!(json["schema"], "boardforge.pcb-view/v1");
        assert_eq!(json["revision"], 3);
        assert_eq!(json["footprints"][0]["id"], "f1");
        assert_eq!(json["tracks"][0]["id"], "t1");
        assert!(json.get("unsupportedCount").is_some());
    }
}
