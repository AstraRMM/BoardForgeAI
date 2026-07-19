//! Versioned PCB routing and real-time DRC API shared by native and WASM clients.
//! Coordinates and rule values are millimetres. The browser should treat these
//! DTOs as the only geometry contract and must not reimplement these algorithms.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

pub const PCB_GEOMETRY_SCHEMA: u32 = 1;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct PcbPoint {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct CopperSegment {
    pub id: String,
    pub start: PcbPoint,
    pub end: PcbPoint,
    pub width: f64,
    pub layer: String,
    pub net: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct CopperVia {
    pub id: String,
    pub at: PcbPoint,
    pub diameter: f64,
    pub drill: f64,
    pub net: Option<String>,
    pub layers: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct CopperPad {
    pub id: String,
    pub at: PcbPoint,
    pub size: PcbPoint,
    pub layer: String,
    pub net: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PcbRect {
    pub min: PcbPoint,
    pub max: PcbPoint,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PcbRules {
    pub clearance: f64,
    pub min_track_width: f64,
    pub edge_clearance: f64,
    pub via_clearance: f64,
    pub grid: f64,
}

impl Default for PcbRules {
    fn default() -> Self {
        Self {
            clearance: 0.2,
            min_track_width: 0.2,
            edge_clearance: 0.25,
            via_clearance: 0.2,
            grid: 0.05,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PcbGeometryRequest {
    pub schema: u32,
    pub outline: Vec<PcbPoint>,
    pub segments: Vec<CopperSegment>,
    pub vias: Vec<CopperVia>,
    pub pads: Vec<CopperPad>,
    pub keepouts: Vec<PcbRect>,
    pub rules: PcbRules,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RouteAngle {
    FortyFive,
    Ninety,
    Free,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct RouteRequest {
    pub schema: u32,
    pub id_prefix: String,
    pub start: PcbPoint,
    pub cursor: PcbPoint,
    pub layer: String,
    pub net: Option<String>,
    pub width: f64,
    pub angle: RouteAngle,
    pub insert_via: bool,
    pub target_layer: Option<String>,
    pub via_diameter: f64,
    pub via_drill: f64,
    pub rules: PcbRules,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct RoutePreview {
    pub schema: u32,
    pub snapped_cursor: PcbPoint,
    pub segments: Vec<CopperSegment>,
    pub via: Option<CopperVia>,
    pub length: f64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ViolationKind {
    Clearance,
    TrackWidth,
    WrongNet,
    DanglingTrack,
    TrackOverlap,
    Keepout,
    EdgeClearance,
    ViaDrill,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Violation {
    pub id: String,
    pub kind: ViolationKind,
    pub severity: String,
    pub at: PcbPoint,
    pub object_ids: Vec<String>,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ValidationResponse {
    pub schema: u32,
    pub violations: Vec<Violation>,
    pub checked_objects: usize,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct NetMetrics {
    pub schema: u32,
    pub net: String,
    pub object_ids: Vec<String>,
    pub routed_length: f64,
    pub dangling_ends: usize,
}

fn snap(v: f64, grid: f64) -> f64 {
    if grid > 0.0 {
        (v / grid).round() * grid
    } else {
        v
    }
}
fn snapped(p: PcbPoint, grid: f64) -> PcbPoint {
    PcbPoint {
        x: snap(p.x, grid),
        y: snap(p.y, grid),
    }
}
fn dist(a: PcbPoint, b: PcbPoint) -> f64 {
    ((a.x - b.x).powi(2) + (a.y - b.y).powi(2)).sqrt()
}

/// KiCad-like dogleg route preview. 45 degree mode uses a diagonal then axis leg;
/// 90 degree mode uses orthogonal legs; free mode preserves the direct vector.
pub fn plan_route(r: &RouteRequest) -> RoutePreview {
    let end = snapped(r.cursor, r.rules.grid);
    let mut points = vec![r.start];
    let dx = end.x - r.start.x;
    let dy = end.y - r.start.y;
    match r.angle {
        RouteAngle::Free => {}
        RouteAngle::Ninety if dx.abs() > 1e-9 && dy.abs() > 1e-9 => points.push(PcbPoint {
            x: end.x,
            y: r.start.y,
        }),
        RouteAngle::FortyFive if dx.abs() > 1e-9 && dy.abs() > 1e-9 => {
            let d = dx.abs().min(dy.abs());
            points.push(PcbPoint {
                x: r.start.x + d * dx.signum(),
                y: r.start.y + d * dy.signum(),
            });
        }
        _ => {}
    }
    points.push(end);
    let segments = points
        .windows(2)
        .enumerate()
        .filter(|(_, p)| dist(p[0], p[1]) > 1e-9)
        .map(|(i, p)| CopperSegment {
            id: format!("{}-{}", r.id_prefix, i),
            start: p[0],
            end: p[1],
            width: r.width,
            layer: r.layer.clone(),
            net: r.net.clone(),
        })
        .collect::<Vec<_>>();
    let length = segments.iter().map(|s| dist(s.start, s.end)).sum();
    let via = r.insert_via.then(|| CopperVia {
        id: format!("{}-via", r.id_prefix),
        at: end,
        diameter: r.via_diameter,
        drill: r.via_drill,
        net: r.net.clone(),
        layers: vec![
            r.layer.clone(),
            r.target_layer.clone().unwrap_or_else(|| "B.Cu".into()),
        ],
    });
    RoutePreview {
        schema: PCB_GEOMETRY_SCHEMA,
        snapped_cursor: end,
        segments,
        via,
        length,
    }
}

fn point_segment_distance(p: PcbPoint, s: &CopperSegment) -> f64 {
    let vx = s.end.x - s.start.x;
    let vy = s.end.y - s.start.y;
    let l2 = vx * vx + vy * vy;
    if l2 == 0.0 {
        return dist(p, s.start);
    }
    let t = (((p.x - s.start.x) * vx + (p.y - s.start.y) * vy) / l2).clamp(0.0, 1.0);
    dist(
        p,
        PcbPoint {
            x: s.start.x + t * vx,
            y: s.start.y + t * vy,
        },
    )
}
fn segment_distance(a: &CopperSegment, b: &CopperSegment) -> f64 {
    point_segment_distance(a.start, b)
        .min(point_segment_distance(a.end, b))
        .min(point_segment_distance(b.start, a))
        .min(point_segment_distance(b.end, a))
}
fn midpoint(s: &CopperSegment) -> PcbPoint {
    PcbPoint {
        x: (s.start.x + s.end.x) / 2.0,
        y: (s.start.y + s.end.y) / 2.0,
    }
}
fn in_rect(p: PcbPoint, r: &PcbRect) -> bool {
    p.x >= r.min.x && p.x <= r.max.x && p.y >= r.min.y && p.y <= r.max.y
}
fn in_polygon(p: PcbPoint, poly: &[PcbPoint]) -> bool {
    let mut inside = false;
    for i in 0..poly.len() {
        let a = poly[i];
        let b = poly[(i + 1) % poly.len()];
        if ((a.y > p.y) != (b.y > p.y)) && (p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) {
            inside = !inside
        }
    }
    inside
}
fn edge_distance(p: PcbPoint, poly: &[PcbPoint]) -> f64 {
    if poly.len() < 2 {
        return 0.0;
    }
    (0..poly.len())
        .map(|i| CopperSegment {
            id: String::new(),
            start: poly[i],
            end: poly[(i + 1) % poly.len()],
            width: 0.0,
            layer: String::new(),
            net: None,
        })
        .map(|edge| point_segment_distance(p, &edge))
        .fold(f64::INFINITY, f64::min)
}
fn key(p: PcbPoint, cell: f64) -> (i64, i64) {
    ((p.x / cell).floor() as i64, (p.y / cell).floor() as i64)
}

/// Real-time DRC using a uniform spatial index. The broad phase is near-linear
/// for normally distributed board copper and avoids an O(n²) browser scan.
pub fn validate_board(r: &PcbGeometryRequest) -> ValidationResponse {
    let mut out = Vec::new();
    let cell = (r.rules.clearance.max(0.1) * 4.0).max(1.0);
    let mut index: HashMap<(i64, i64), Vec<usize>> = HashMap::new();
    for (i, s) in r.segments.iter().enumerate() {
        let minx = s.start.x.min(s.end.x) - s.width;
        let maxx = s.start.x.max(s.end.x) + s.width;
        let miny = s.start.y.min(s.end.y) - s.width;
        let maxy = s.start.y.max(s.end.y) + s.width;
        for x in (minx / cell).floor() as i64..=(maxx / cell).floor() as i64 {
            for y in (miny / cell).floor() as i64..=(maxy / cell).floor() as i64 {
                index.entry((x, y)).or_default().push(i)
            }
        }
        if s.width < r.rules.min_track_width {
            out.push(v(
                "width",
                ViolationKind::TrackWidth,
                midpoint(s),
                vec![s.id.clone()],
                "Track is narrower than the active rule",
            ));
        }
        if !in_polygon(s.start, &r.outline)
            || !in_polygon(s.end, &r.outline)
            || edge_distance(s.start, &r.outline) < r.rules.edge_clearance + s.width / 2.0
            || edge_distance(s.end, &r.outline) < r.rules.edge_clearance + s.width / 2.0
        {
            out.push(v(
                "edge",
                ViolationKind::EdgeClearance,
                midpoint(s),
                vec![s.id.clone()],
                "Track reaches or crosses the board edge",
            ));
        }
        if r.keepouts
            .iter()
            .any(|k| in_rect(s.start, k) || in_rect(s.end, k) || in_rect(midpoint(s), k))
        {
            out.push(v(
                "keepout",
                ViolationKind::Keepout,
                midpoint(s),
                vec![s.id.clone()],
                "Copper intersects a keepout",
            ));
        }
    }
    let mut compared = HashSet::new();
    for ids in index.values() {
        for &i in ids {
            for &j in ids {
                if i >= j || !compared.insert((i, j)) {
                    continue;
                }
                let a = &r.segments[i];
                let b = &r.segments[j];
                if a.layer != b.layer {
                    continue;
                }
                let gap = segment_distance(a, b) - (a.width + b.width) / 2.0;
                if gap < r.rules.clearance {
                    let kind = if a.net != b.net {
                        ViolationKind::WrongNet
                    } else {
                        ViolationKind::TrackOverlap
                    };
                    out.push(v(
                        "copper",
                        kind,
                        midpoint(a),
                        vec![a.id.clone(), b.id.clone()],
                        if a.net != b.net {
                            "Copper from different nets violates clearance"
                        } else {
                            "Same-net tracks overlap"
                        },
                    ));
                }
            }
        }
    }
    for via in &r.vias {
        if via.drill <= 0.0 || via.drill >= via.diameter {
            out.push(v(
                "drill",
                ViolationKind::ViaDrill,
                via.at,
                vec![via.id.clone()],
                "Via drill must be smaller than its diameter",
            ));
        }
        if r.keepouts.iter().any(|k| in_rect(via.at, k)) {
            out.push(v(
                "via_keepout",
                ViolationKind::Keepout,
                via.at,
                vec![via.id.clone()],
                "Via is inside a keepout",
            ));
        }
    }
    let mut endpoints: HashMap<(i64, i64, Option<String>), usize> = HashMap::new();
    let tol = r.rules.grid.max(0.01);
    for s in &r.segments {
        *endpoints
            .entry((key(s.start, tol).0, key(s.start, tol).1, s.net.clone()))
            .or_default() += 1;
        *endpoints
            .entry((key(s.end, tol).0, key(s.end, tol).1, s.net.clone()))
            .or_default() += 1;
    }
    for s in &r.segments {
        for p in [s.start, s.end] {
            if endpoints
                .get(&(key(p, tol).0, key(p, tol).1, s.net.clone()))
                .copied()
                .unwrap_or(0)
                == 1
                && !r.pads.iter().any(|pad| {
                    pad.net == s.net && dist(p, pad.at) <= pad.size.x.max(pad.size.y) / 2.0
                })
            {
                out.push(v(
                    "dangling",
                    ViolationKind::DanglingTrack,
                    p,
                    vec![s.id.clone()],
                    "Track endpoint is not connected",
                ));
            }
        }
    }
    ValidationResponse {
        schema: PCB_GEOMETRY_SCHEMA,
        violations: out,
        checked_objects: r.segments.len() + r.vias.len() + r.pads.len(),
    }
}

fn v(
    prefix: &str,
    kind: ViolationKind,
    at: PcbPoint,
    object_ids: Vec<String>,
    message: &str,
) -> Violation {
    Violation {
        id: format!("{}:{}", prefix, object_ids.join(":")),
        kind,
        severity: "error".into(),
        at,
        object_ids,
        message: message.into(),
    }
}

pub fn net_metrics(r: &PcbGeometryRequest, net: &str) -> NetMetrics {
    let object_ids = r
        .segments
        .iter()
        .filter(|s| s.net.as_deref() == Some(net))
        .map(|s| s.id.clone())
        .chain(
            r.vias
                .iter()
                .filter(|v| v.net.as_deref() == Some(net))
                .map(|v| v.id.clone()),
        )
        .collect();
    let routed_length = r
        .segments
        .iter()
        .filter(|s| s.net.as_deref() == Some(net))
        .map(|s| dist(s.start, s.end))
        .sum();
    let dangling_ends = validate_board(r)
        .violations
        .iter()
        .filter(|v| {
            v.kind == ViolationKind::DanglingTrack
                && v.object_ids.iter().any(|id| {
                    r.segments
                        .iter()
                        .any(|s| &s.id == id && s.net.as_deref() == Some(net))
                })
        })
        .count();
    NetMetrics {
        schema: PCB_GEOMETRY_SCHEMA,
        net: net.into(),
        object_ids,
        routed_length,
        dangling_ends,
    }
}

pub fn placement_violations(
    rect: &PcbRect,
    keepouts: &[PcbRect],
    occupied: &[PcbRect],
) -> Vec<Violation> {
    let overlaps = |a: &PcbRect, b: &PcbRect| {
        a.min.x < b.max.x && a.max.x > b.min.x && a.min.y < b.max.y && a.max.y > b.min.y
    };
    let at = PcbPoint {
        x: (rect.min.x + rect.max.x) / 2.0,
        y: (rect.min.y + rect.max.y) / 2.0,
    };
    let mut out = Vec::new();
    if keepouts.iter().any(|x| overlaps(rect, x)) {
        out.push(v(
            "placement_keepout",
            ViolationKind::Keepout,
            at,
            vec![],
            "Footprint courtyard intersects a keepout",
        ));
    }
    if occupied.iter().any(|x| overlaps(rect, x)) {
        out.push(v(
            "placement_collision",
            ViolationKind::Clearance,
            at,
            vec![],
            "Footprint courtyards collide",
        ));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    fn p(x: f64, y: f64) -> PcbPoint {
        PcbPoint { x, y }
    }
    #[test]
    fn route_modes_and_via_are_deterministic() {
        let mut r = RouteRequest {
            schema: 1,
            id_prefix: "route".into(),
            start: p(0., 0.),
            cursor: p(5., 3.),
            layer: "F.Cu".into(),
            net: Some("GND".into()),
            width: 0.25,
            angle: RouteAngle::FortyFive,
            insert_via: true,
            target_layer: Some("B.Cu".into()),
            via_diameter: 0.8,
            via_drill: 0.4,
            rules: PcbRules::default(),
        };
        let a = plan_route(&r);
        assert_eq!(a.segments.len(), 2);
        assert_eq!(a.via.unwrap().layers, vec!["F.Cu", "B.Cu"]);
        r.angle = RouteAngle::Ninety;
        assert_eq!(plan_route(&r).segments[0].end, p(5., 0.));
        r.angle = RouteAngle::Free;
        assert_eq!(plan_route(&r).segments.len(), 1);
    }
    #[test]
    fn drc_finds_width_wrong_net_keepout_and_dangling() {
        let req = PcbGeometryRequest {
            schema: 1,
            outline: vec![p(0., 0.), p(10., 0.), p(10., 10.), p(0., 10.)],
            segments: vec![
                CopperSegment {
                    id: "a".into(),
                    start: p(1., 1.),
                    end: p(8., 1.),
                    width: 0.1,
                    layer: "F.Cu".into(),
                    net: Some("A".into()),
                },
                CopperSegment {
                    id: "b".into(),
                    start: p(4., 0.9),
                    end: p(4., 4.),
                    width: 0.25,
                    layer: "F.Cu".into(),
                    net: Some("B".into()),
                },
            ],
            vias: vec![],
            pads: vec![],
            keepouts: vec![PcbRect {
                min: p(7., 0.5),
                max: p(9., 2.),
            }],
            rules: PcbRules::default(),
        };
        let result = validate_board(&req);
        for kind in [
            ViolationKind::TrackWidth,
            ViolationKind::WrongNet,
            ViolationKind::Keepout,
            ViolationKind::DanglingTrack,
        ] {
            assert!(
                result.violations.iter().any(|v| v.kind == kind),
                "missing {kind:?}"
            )
        }
    }
    #[test]
    fn spatial_index_checks_one_hundred_thousand_primitives() {
        let segments = (0..100_000)
            .map(|i| {
                let x = (i % 1000) as f64 * 2.;
                let y = (i / 1000) as f64 * 2.;
                CopperSegment {
                    id: i.to_string(),
                    start: p(x, y),
                    end: p(x + 0.5, y),
                    width: 0.2,
                    layer: "F.Cu".into(),
                    net: Some("N".into()),
                }
            })
            .collect();
        let req = PcbGeometryRequest {
            schema: 1,
            outline: vec![p(-1., -1.), p(2001., -1.), p(2001., 201.), p(-1., 201.)],
            segments,
            vias: vec![],
            pads: vec![],
            keepouts: vec![],
            rules: PcbRules::default(),
        };
        let started = std::time::Instant::now();
        let result = validate_board(&req);
        assert_eq!(result.checked_objects, 100_000);
        assert!(
            started.elapsed().as_secs() < 10,
            "100k DRC took {:?}",
            started.elapsed()
        );
    }
}
