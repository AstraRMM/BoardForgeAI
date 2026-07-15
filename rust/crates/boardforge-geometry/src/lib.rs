use boardforge_core::{BoardForgeError, Result};
use serde::{Deserialize, Serialize};

pub mod pcb;

const EPSILON: f64 = 1e-9;

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl Point {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
    pub fn distance(self, other: Self) -> f64 {
        (self.x - other.x).hypot(self.y - other.y)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Segment {
    pub start: Point,
    pub end: Point,
}

impl Segment {
    pub fn length(self) -> f64 {
        self.start.distance(self.end)
    }
    pub fn distance_to(self, point: Point) -> f64 {
        let dx = self.end.x - self.start.x;
        let dy = self.end.y - self.start.y;
        let length_squared = dx * dx + dy * dy;
        if length_squared <= EPSILON {
            return point.distance(self.start);
        }
        let t = (((point.x - self.start.x) * dx + (point.y - self.start.y) * dy) / length_squared)
            .clamp(0.0, 1.0);
        point.distance(Point::new(self.start.x + t * dx, self.start.y + t * dy))
    }
    pub fn hit_test(self, point: Point, tolerance: f64) -> bool {
        tolerance >= 0.0 && self.distance_to(point) <= tolerance
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Polygon {
    pub exterior: Vec<Point>,
    #[serde(default)]
    pub holes: Vec<Vec<Point>>,
}

impl Polygon {
    pub fn new(exterior: Vec<Point>) -> Result<Self> {
        Self::with_holes(exterior, vec![])
    }
    pub fn with_holes(exterior: Vec<Point>, holes: Vec<Vec<Point>>) -> Result<Self> {
        validate_ring(&exterior)?;
        for hole in &holes {
            validate_ring(hole)?;
        }
        Ok(Self { exterior, holes })
    }
    pub fn area(&self) -> f64 {
        ring_signed_area(&self.exterior).abs()
            - self
                .holes
                .iter()
                .map(|ring| ring_signed_area(ring).abs())
                .sum::<f64>()
    }
    pub fn perimeter(&self) -> f64 {
        ring_perimeter(&self.exterior)
            + self
                .holes
                .iter()
                .map(|ring| ring_perimeter(ring))
                .sum::<f64>()
    }
    pub fn contains(&self, point: Point) -> bool {
        point_in_ring(point, &self.exterior)
            && !self.holes.iter().any(|hole| point_in_ring(point, hole))
    }
    pub fn intersects(&self, other: &Self) -> bool {
        rings_intersect(&self.exterior, &other.exterior)
            || self
                .exterior
                .first()
                .is_some_and(|point| other.contains(*point))
            || other
                .exterior
                .first()
                .is_some_and(|point| self.contains(*point))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Transform {
    pub m11: f64,
    pub m12: f64,
    pub m21: f64,
    pub m22: f64,
    pub tx: f64,
    pub ty: f64,
}

impl Transform {
    pub const fn identity() -> Self {
        Self {
            m11: 1.0,
            m12: 0.0,
            m21: 0.0,
            m22: 1.0,
            tx: 0.0,
            ty: 0.0,
        }
    }
    pub const fn translation(x: f64, y: f64) -> Self {
        Self {
            tx: x,
            ty: y,
            ..Self::identity()
        }
    }
    pub fn rotation(radians: f64) -> Self {
        let (sin, cos) = radians.sin_cos();
        Self {
            m11: cos,
            m12: -sin,
            m21: sin,
            m22: cos,
            tx: 0.0,
            ty: 0.0,
        }
    }
    pub const fn scale(x: f64, y: f64) -> Self {
        Self {
            m11: x,
            m12: 0.0,
            m21: 0.0,
            m22: y,
            tx: 0.0,
            ty: 0.0,
        }
    }
    pub fn apply(self, point: Point) -> Point {
        Point::new(
            self.m11 * point.x + self.m12 * point.y + self.tx,
            self.m21 * point.x + self.m22 * point.y + self.ty,
        )
    }
}

pub fn segments_intersect(a: Segment, b: Segment) -> bool {
    let o1 = orientation(a.start, a.end, b.start);
    let o2 = orientation(a.start, a.end, b.end);
    let o3 = orientation(b.start, b.end, a.start);
    let o4 = orientation(b.start, b.end, a.end);
    if o1 * o2 < -EPSILON && o3 * o4 < -EPSILON {
        return true;
    }
    (o1.abs() <= EPSILON && on_segment(a.start, b.start, a.end))
        || (o2.abs() <= EPSILON && on_segment(a.start, b.end, a.end))
        || (o3.abs() <= EPSILON && on_segment(b.start, a.start, b.end))
        || (o4.abs() <= EPSILON && on_segment(b.start, a.end, b.end))
}

/// Closes an open outline using the shortest direct segment. The returned ring
/// omits a duplicated terminal point and rejects a closure that crosses the path.
pub fn fill_closure(path: &[Point]) -> Result<Polygon> {
    if path.len() < 3 {
        return Err(BoardForgeError::InvalidGeometry(
            "an outline requires at least three points".into(),
        ));
    }
    let mut ring = path.to_vec();
    if ring.first() == ring.last() {
        ring.pop();
    }
    validate_finite(&ring)?;
    let closure = Segment {
        start: *ring.last().unwrap(),
        end: ring[0],
    };
    for window in ring.windows(2).skip(1).take(ring.len().saturating_sub(3)) {
        if segments_intersect(
            closure,
            Segment {
                start: window[0],
                end: window[1],
            },
        ) {
            return Err(BoardForgeError::InvalidGeometry(
                "fill closure intersects the outline".into(),
            ));
        }
    }
    Polygon::new(ring)
}

fn validate_ring(ring: &[Point]) -> Result<()> {
    validate_finite(ring)?;
    if ring.len() < 3 {
        return Err(BoardForgeError::InvalidGeometry(
            "a polygon ring requires at least three points".into(),
        ));
    }
    if ring_signed_area(ring).abs() <= EPSILON {
        return Err(BoardForgeError::InvalidGeometry(
            "polygon ring has zero area".into(),
        ));
    }
    if ring_self_intersects(ring) {
        return Err(BoardForgeError::InvalidGeometry(
            "polygon ring intersects itself".into(),
        ));
    }
    Ok(())
}
fn validate_finite(points: &[Point]) -> Result<()> {
    if points.iter().any(|p| !p.x.is_finite() || !p.y.is_finite()) {
        return Err(BoardForgeError::InvalidInput(
            "coordinates must be finite".into(),
        ));
    }
    Ok(())
}
fn ring_signed_area(ring: &[Point]) -> f64 {
    ring.iter()
        .zip(ring.iter().cycle().skip(1))
        .take(ring.len())
        .map(|(a, b)| a.x * b.y - b.x * a.y)
        .sum::<f64>()
        / 2.0
}
fn ring_perimeter(ring: &[Point]) -> f64 {
    ring.iter()
        .zip(ring.iter().cycle().skip(1))
        .take(ring.len())
        .map(|(a, b)| a.distance(*b))
        .sum()
}
fn orientation(a: Point, b: Point, c: Point) -> f64 {
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}
fn on_segment(a: Point, p: Point, b: Point) -> bool {
    p.x >= a.x.min(b.x) - EPSILON
        && p.x <= a.x.max(b.x) + EPSILON
        && p.y >= a.y.min(b.y) - EPSILON
        && p.y <= a.y.max(b.y) + EPSILON
}
fn point_in_ring(point: Point, ring: &[Point]) -> bool {
    let mut inside = false;
    for (a, b) in ring
        .iter()
        .zip(ring.iter().cycle().skip(1))
        .take(ring.len())
    {
        let edge = Segment { start: *a, end: *b };
        if edge.distance_to(point) <= EPSILON {
            return true;
        }
        if (a.y > point.y) != (b.y > point.y)
            && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x
        {
            inside = !inside;
        }
    }
    inside
}

fn ring_segments(ring: &[Point]) -> impl Iterator<Item = Segment> + '_ {
    ring.iter()
        .zip(ring.iter().cycle().skip(1))
        .take(ring.len())
        .map(|(start, end)| Segment {
            start: *start,
            end: *end,
        })
}

fn rings_intersect(a: &[Point], b: &[Point]) -> bool {
    ring_segments(a).any(|left| ring_segments(b).any(|right| segments_intersect(left, right)))
}

fn ring_self_intersects(ring: &[Point]) -> bool {
    let segments: Vec<_> = ring_segments(ring).collect();
    segments.iter().enumerate().any(|(left_index, left)| {
        segments.iter().enumerate().any(|(right_index, right)| {
            let adjacent = left_index == right_index
                || (left_index + 1) % segments.len() == right_index
                || (right_index + 1) % segments.len() == left_index;
            !adjacent && segments_intersect(*left, *right)
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn square() -> Vec<Point> {
        vec![
            Point::new(0., 0.),
            Point::new(4., 0.),
            Point::new(4., 3.),
            Point::new(0., 3.),
        ]
    }

    #[test]
    fn area_and_perimeter_are_correct() {
        let p = Polygon::new(square()).unwrap();
        assert_eq!(p.area(), 12.);
        assert_eq!(p.perimeter(), 14.);
    }
    #[test]
    fn holes_subtract_area_and_add_perimeter() {
        let p = Polygon::with_holes(
            square(),
            vec![vec![
                Point::new(1., 1.),
                Point::new(2., 1.),
                Point::new(2., 2.),
                Point::new(1., 2.),
            ]],
        )
        .unwrap();
        assert_eq!(p.area(), 11.);
        assert_eq!(p.perimeter(), 18.);
    }
    #[test]
    fn segment_intersection_handles_crossing_and_collinear() {
        assert!(segments_intersect(
            Segment {
                start: Point::new(0., 0.),
                end: Point::new(2., 2.)
            },
            Segment {
                start: Point::new(0., 2.),
                end: Point::new(2., 0.)
            }
        ));
        assert!(segments_intersect(
            Segment {
                start: Point::new(0., 0.),
                end: Point::new(2., 0.)
            },
            Segment {
                start: Point::new(1., 0.),
                end: Point::new(3., 0.)
            }
        ));
    }
    #[test]
    fn hit_testing_uses_tolerance() {
        let s = Segment {
            start: Point::new(0., 0.),
            end: Point::new(10., 0.),
        };
        assert!(s.hit_test(Point::new(4., 0.49), 0.5));
        assert!(!s.hit_test(Point::new(4., 0.51), 0.5));
    }
    #[test]
    fn transforms_points() {
        let p = Transform::translation(2., 3.).apply(Point::new(1., 1.));
        assert_eq!(p, Point::new(3., 4.));
        let r = Transform::rotation(std::f64::consts::FRAC_PI_2).apply(Point::new(1., 0.));
        assert!(r.x.abs() < 1e-9 && (r.y - 1.).abs() < 1e-9);
    }
    #[test]
    fn containment_respects_holes() {
        let p = Polygon::with_holes(
            square(),
            vec![vec![
                Point::new(1., 1.),
                Point::new(2., 1.),
                Point::new(2., 2.),
                Point::new(1., 2.),
            ]],
        )
        .unwrap();
        assert!(p.contains(Point::new(0.5, 0.5)));
        assert!(!p.contains(Point::new(1.5, 1.5)));
    }
    #[test]
    fn fill_closes_valid_outline() {
        let p = fill_closure(&square()).unwrap();
        assert_eq!(p.area(), 12.);
    }
    #[test]
    fn invalid_coordinates_are_rejected() {
        assert!(fill_closure(&[
            Point::new(0., 0.),
            Point::new(f64::NAN, 1.),
            Point::new(1., 0.)
        ])
        .is_err());
    }

    #[test]
    fn self_intersecting_polygons_are_rejected() {
        let bow_tie = vec![
            Point::new(0., 0.),
            Point::new(2., 2.),
            Point::new(0., 2.),
            Point::new(2., 0.),
        ];
        assert!(Polygon::new(bow_tie).is_err());
    }

    #[test]
    fn polygons_detect_overlap_and_separation() {
        let left = Polygon::new(square()).unwrap();
        let translated = |x| {
            Polygon::new(
                square()
                    .into_iter()
                    .map(|point| Transform::translation(x, 0.).apply(point))
                    .collect(),
            )
            .unwrap()
        };
        assert!(left.intersects(&translated(3.)));
        assert!(!left.intersects(&translated(10.)));
    }
}
