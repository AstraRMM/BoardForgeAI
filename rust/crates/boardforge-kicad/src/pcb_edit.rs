use crate::{pcb::PcbDocument, raw::RawSExpression};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PcbEditTransaction {
    pub version: u32,
    #[serde(default)]
    pub expected_source_sha256: Option<String>,
    pub operations: Vec<PcbEditOperation>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum PcbEditOperation {
    MoveFootprint {
        uuid: String,
        x: f64,
        y: f64,
        #[serde(default)]
        expected: Option<String>,
    },
    RotateFootprint {
        uuid: String,
        angle: f64,
        #[serde(default)]
        expected: Option<String>,
    },
    DuplicateFootprint {
        uuid: String,
        new_uuid: String,
        x: f64,
        y: f64,
    },
    DeleteFootprint {
        uuid: String,
        #[serde(default)]
        expected: Option<String>,
    },
    AddTrack {
        uuid: String,
        start: [f64; 2],
        end: [f64; 2],
        width: f64,
        layer: String,
        net: u32,
    },
    DragTrack {
        uuid: String,
        start: [f64; 2],
        end: [f64; 2],
        #[serde(default)]
        expected: Option<String>,
    },
    DeleteTrack {
        uuid: String,
        #[serde(default)]
        expected: Option<String>,
    },
    AddVia {
        uuid: String,
        at: [f64; 2],
        size: f64,
        drill: f64,
        layers: [String; 2],
        net: u32,
    },
    DeleteVia {
        uuid: String,
        #[serde(default)]
        expected: Option<String>,
    },
    SetProperty {
        uuid: String,
        name: String,
        value: String,
        #[serde(default)]
        expected: Option<String>,
    },
    SetLayer {
        uuid: String,
        layer: String,
        #[serde(default)]
        expected: Option<String>,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct PcbEditDiff {
    pub operation_index: usize,
    pub uuid: String,
    pub kind: String,
    pub before: Option<String>,
    pub after: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PcbEditResult {
    pub source: String,
    pub source_sha256: String,
    pub diffs: Vec<PcbEditDiff>,
    pub preserved_unknown: usize,
    pub validation: PcbValidationSummary,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct PcbValidationSummary {
    pub object_count: usize,
    pub warnings: Vec<String>,
}

/// Extension point for Rust DRC/clearance/net validators. Returning an error aborts atomically.
pub trait PcbValidationHook {
    fn validate(
        &self,
        board: &PcbDocument,
        diffs: &[PcbEditDiff],
    ) -> Result<Vec<String>, PcbEditError>;
}

struct StructuralValidation;
impl PcbValidationHook for StructuralValidation {
    fn validate(
        &self,
        _board: &PcbDocument,
        _diffs: &[PcbEditDiff],
    ) -> Result<Vec<String>, PcbEditError> {
        Ok(Vec::new())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct PcbEditError {
    pub code: String,
    pub operation_index: Option<usize>,
    pub uuid: Option<String>,
    pub message: String,
}
impl std::fmt::Display for PcbEditError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}
impl std::error::Error for PcbEditError {}

/// Applies all operations to a clone and commits only after structural validation and reparse.
pub fn apply_pcb_transaction(
    board: &PcbDocument,
    tx: &PcbEditTransaction,
) -> Result<PcbEditResult, PcbEditError> {
    apply_pcb_transaction_with_hook(board, tx, &StructuralValidation)
}

pub fn apply_pcb_transaction_with_hook(
    board: &PcbDocument,
    tx: &PcbEditTransaction,
    hook: &dyn PcbValidationHook,
) -> Result<PcbEditResult, PcbEditError> {
    if tx.version != 1 {
        return Err(err(
            "unsupported_version",
            None,
            None,
            "PCB transaction version must be 1",
        ));
    }
    if let Some(expected) = &tx.expected_source_sha256 {
        if expected != &board.parsed.source_sha256 {
            return Err(err(
                "stale_source",
                None,
                None,
                "source SHA-256 precondition failed",
            ));
        }
    }
    let mut root = board.parsed.root.clone();
    let mut diffs = Vec::new();
    for (index, op) in tx.operations.iter().enumerate() {
        apply(&mut root, op, index, &mut diffs)?;
    }
    let mut validation = validate(&root)?;
    let source = format!("{}\n", root.canonical());
    let edited = PcbDocument::parse(source.clone())
        .map_err(|e| err("invalid_result", None, None, &e.to_string()))?;
    validation.warnings = hook.validate(&edited, &diffs)?;
    let source_sha256 = format!("{:x}", Sha256::digest(source.as_bytes()));
    Ok(PcbEditResult {
        source,
        source_sha256,
        diffs,
        preserved_unknown: board.unsupported().len(),
        validation,
    })
}

fn apply(
    root: &mut RawSExpression,
    op: &PcbEditOperation,
    index: usize,
    diffs: &mut Vec<PcbEditDiff>,
) -> Result<(), PcbEditError> {
    match op {
        PcbEditOperation::AddTrack {
            uuid,
            start,
            end,
            width,
            layer,
            net,
        } => {
            valid_uuid(root, uuid, index)?;
            finite(&[start[0], start[1], end[0], end[1], *width], index, uuid)?;
            if *width <= 0.0 {
                return Err(err(
                    "invalid_geometry",
                    Some(index),
                    Some(uuid),
                    "track width must be positive",
                ));
            }
            let node = list(vec![
                atom("segment"),
                point("start", *start),
                point("end", *end),
                number_node("width", *width),
                text_node("layer", layer),
                int_node("net", *net),
                text_node("uuid", uuid),
            ]);
            append(root, node.clone())?;
            push_diff(diffs, index, uuid, "track", None, Some(node.canonical()));
        }
        PcbEditOperation::AddVia {
            uuid,
            at,
            size,
            drill,
            layers,
            net,
        } => {
            valid_uuid(root, uuid, index)?;
            finite(&[at[0], at[1], *size, *drill], index, uuid)?;
            if *drill <= 0.0 || *size <= *drill {
                return Err(err(
                    "invalid_geometry",
                    Some(index),
                    Some(uuid),
                    "via size must exceed positive drill",
                ));
            }
            let node = list(vec![
                atom("via"),
                point("at", *at),
                number_node("size", *size),
                number_node("drill", *drill),
                list(vec![atom("layers"), quoted(&layers[0]), quoted(&layers[1])]),
                int_node("net", *net),
                text_node("uuid", uuid),
            ]);
            append(root, node.clone())?;
            push_diff(diffs, index, uuid, "via", None, Some(node.canonical()));
        }
        PcbEditOperation::DuplicateFootprint {
            uuid,
            new_uuid,
            x,
            y,
        } => {
            valid_uuid(root, new_uuid, index)?;
            finite(&[*x, *y], index, new_uuid)?;
            let mut copy = find(root, uuid)
                .ok_or_else(|| err("not_found", Some(index), Some(uuid), "footprint not found"))?
                .clone();
            if copy.head() != Some("footprint") {
                return Err(err(
                    "wrong_kind",
                    Some(index),
                    Some(uuid),
                    "object is not a footprint",
                ));
            }
            set_child_atom(&mut copy, "uuid", new_uuid, true);
            set_at(&mut copy, *x, *y, None)?;
            append(root, copy.clone())?;
            push_diff(
                diffs,
                index,
                new_uuid,
                "footprint",
                None,
                Some(copy.canonical()),
            );
        }
        PcbEditOperation::MoveFootprint {
            uuid,
            x,
            y,
            expected,
        } => mutate(root, index, uuid, "footprint", expected, diffs, |n| {
            set_at(n, *x, *y, None)
        })?,
        PcbEditOperation::RotateFootprint {
            uuid,
            angle,
            expected,
        } => mutate(root, index, uuid, "footprint", expected, diffs, |n| {
            set_at(n, at_values(n)?[0], at_values(n)?[1], Some(*angle))
        })?,
        PcbEditOperation::DragTrack {
            uuid,
            start,
            end,
            expected,
        } => mutate(root, index, uuid, "segment", expected, diffs, |n| {
            set_point(n, "start", *start);
            set_point(n, "end", *end);
            Ok(())
        })?,
        PcbEditOperation::SetProperty {
            uuid,
            name,
            value,
            expected,
        } => mutate(root, index, uuid, "object", expected, diffs, |n| {
            set_named_property(n, name, value);
            Ok(())
        })?,
        PcbEditOperation::SetLayer {
            uuid,
            layer,
            expected,
        } => mutate(root, index, uuid, "object", expected, diffs, |n| {
            set_child_atom(n, "layer", layer, true);
            Ok(())
        })?,
        PcbEditOperation::DeleteFootprint { uuid, expected } => {
            remove(root, index, uuid, "footprint", expected, diffs)?
        }
        PcbEditOperation::DeleteTrack { uuid, expected } => {
            remove(root, index, uuid, "segment", expected, diffs)?
        }
        PcbEditOperation::DeleteVia { uuid, expected } => {
            remove(root, index, uuid, "via", expected, diffs)?
        }
    };
    Ok(())
}

fn mutate<F>(
    root: &mut RawSExpression,
    index: usize,
    uuid: &str,
    kind: &str,
    expected: &Option<String>,
    diffs: &mut Vec<PcbEditDiff>,
    f: F,
) -> Result<(), PcbEditError>
where
    F: FnOnce(&mut RawSExpression) -> Result<(), PcbEditError>,
{
    let node = find_mut(root, uuid)
        .ok_or_else(|| err("not_found", Some(index), Some(uuid), "object not found"))?;
    if kind != "object" && node.head() != Some(kind) {
        return Err(err(
            "wrong_kind",
            Some(index),
            Some(uuid),
            "object kind does not match operation",
        ));
    }
    let before = node.canonical();
    stale(expected, &before, index, uuid)?;
    f(node)?;
    let after = node.canonical();
    push_diff(diffs, index, uuid, kind, Some(before), Some(after));
    Ok(())
}
fn remove(
    root: &mut RawSExpression,
    index: usize,
    uuid: &str,
    kind: &str,
    expected: &Option<String>,
    diffs: &mut Vec<PcbEditDiff>,
) -> Result<(), PcbEditError> {
    let found = find(root, uuid)
        .ok_or_else(|| err("not_found", Some(index), Some(uuid), "object not found"))?;
    if found.head() != Some(kind) {
        return Err(err(
            "wrong_kind",
            Some(index),
            Some(uuid),
            "object kind does not match operation",
        ));
    }
    let before = found.canonical();
    stale(expected, &before, index, uuid)?;
    if !remove_direct(root, uuid) {
        return Err(err(
            "nested_delete_blocked",
            Some(index),
            Some(uuid),
            "only board objects may be deleted",
        ));
    }
    push_diff(diffs, index, uuid, kind, Some(before), None);
    Ok(())
}
fn validate(root: &RawSExpression) -> Result<PcbValidationSummary, PcbEditError> {
    let mut ids = HashSet::new();
    let mut count = 0;
    collect_ids(root, &mut |id| {
        count += 1;
        if !ids.insert(id.to_owned()) {
            return Err(err(
                "duplicate_uuid",
                None,
                Some(id),
                "duplicate stable identity",
            ));
        }
        Ok(())
    })?;
    Ok(PcbValidationSummary {
        object_count: count,
        warnings: Vec::new(),
    })
}
fn collect_ids<'a, F>(n: &'a RawSExpression, f: &mut F) -> Result<(), PcbEditError>
where
    F: FnMut(&'a str) -> Result<(), PcbEditError>,
{
    if let Some(id) = uuid(n) {
        f(id)?;
    }
    if let Some(v) = n.as_list() {
        for c in v.iter().skip(1) {
            collect_ids(c, f)?;
        }
    }
    Ok(())
}
fn valid_uuid(root: &RawSExpression, id: &str, i: usize) -> Result<(), PcbEditError> {
    if id.trim().is_empty() {
        return Err(err(
            "invalid_uuid",
            Some(i),
            Some(id),
            "stable identity cannot be empty",
        ));
    }
    if find(root, id).is_some() {
        return Err(err(
            "duplicate_uuid",
            Some(i),
            Some(id),
            "UUID already exists",
        ));
    }
    Ok(())
}
fn stale(expected: &Option<String>, actual: &str, i: usize, id: &str) -> Result<(), PcbEditError> {
    if expected.as_ref().is_some_and(|v| v != actual) {
        Err(err(
            "stale_object",
            Some(i),
            Some(id),
            "object precondition failed",
        ))
    } else {
        Ok(())
    }
}
fn finite(v: &[f64], i: usize, id: &str) -> Result<(), PcbEditError> {
    if v.iter().all(|n| n.is_finite()) {
        Ok(())
    } else {
        Err(err(
            "invalid_number",
            Some(i),
            Some(id),
            "coordinates must be finite",
        ))
    }
}
fn at_values(n: &RawSExpression) -> Result<[f64; 3], PcbEditError> {
    let a = n
        .children("at")
        .next()
        .ok_or_else(|| err("missing_at", None, uuid(n), "object has no position"))?;
    Ok([
        parse_num(a.atom(1))?,
        parse_num(a.atom(2))?,
        a.atom(3).map(|x| x.parse().unwrap_or(0.0)).unwrap_or(0.0),
    ])
}
fn parse_num(v: Option<&str>) -> Result<f64, PcbEditError> {
    v.and_then(|x| x.parse().ok())
        .ok_or_else(|| err("invalid_number", None, None, "invalid KiCad number"))
}
fn set_at(n: &mut RawSExpression, x: f64, y: f64, angle: Option<f64>) -> Result<(), PcbEditError> {
    finite(&[x, y, angle.unwrap_or(0.0)], 0, uuid(n).unwrap_or(""))?;
    let mut vals = vec![atom("at"), num(x), num(y)];
    if let Some(a) = angle {
        vals.push(num(a));
    } else if let Ok(old) = at_values(n) {
        vals.push(num(old[2]));
    }
    replace_child(n, "at", list(vals));
    Ok(())
}
fn set_point(n: &mut RawSExpression, h: &str, p: [f64; 2]) {
    replace_child(n, h, point(h, p));
}
fn set_named_property(n: &mut RawSExpression, name: &str, value: &str) {
    if let Some(v) = list_mut(n) {
        if let Some(p) = v.iter_mut().find(|c| {
            c.head() == Some("property") && c.atom(1).map(unquote).as_deref() == Some(name)
        }) {
            if let Some(items) = list_mut(p) {
                if items.len() > 2 {
                    items[2] = quoted(value);
                    return;
                }
            }
        }
        v.push(list(vec![atom("property"), quoted(name), quoted(value)]));
    }
}
fn set_child_atom(n: &mut RawSExpression, h: &str, value: &str, quote: bool) {
    replace_child(
        n,
        h,
        list(vec![
            atom(h),
            if quote { quoted(value) } else { atom(value) },
        ]),
    );
}
fn replace_child(n: &mut RawSExpression, h: &str, new: RawSExpression) {
    if let Some(v) = list_mut(n) {
        if let Some(p) = v.iter().position(|c| c.head() == Some(h)) {
            v[p] = new
        } else {
            v.push(new)
        }
    }
}
fn append(root: &mut RawSExpression, n: RawSExpression) -> Result<(), PcbEditError> {
    list_mut(root)
        .ok_or_else(|| err("invalid_root", None, None, "PCB root is not a list"))?
        .push(n);
    Ok(())
}
fn remove_direct(root: &mut RawSExpression, id: &str) -> bool {
    let Some(v) = list_mut(root) else {
        return false;
    };
    let old = v.len();
    v.retain(|n| uuid(n) != Some(id));
    old != v.len()
}
fn find<'a>(n: &'a RawSExpression, id: &str) -> Option<&'a RawSExpression> {
    if uuid(n) == Some(id) {
        return Some(n);
    }
    n.as_list()?.iter().skip(1).find_map(|c| find(c, id))
}
fn find_mut<'a>(n: &'a mut RawSExpression, id: &str) -> Option<&'a mut RawSExpression> {
    if uuid(n) == Some(id) {
        return Some(n);
    }
    match n {
        RawSExpression::List(v) => v.iter_mut().skip(1).find_map(|c| find_mut(c, id)),
        _ => None,
    }
}
fn uuid(n: &RawSExpression) -> Option<&str> {
    n.children("uuid")
        .next()
        .or_else(|| n.children("tstamp").next())
        .and_then(|x| x.atom(1))
        .map(unquote_ref)
}
fn unquote(v: &str) -> String {
    unquote_ref(v).to_owned()
}
fn unquote_ref(v: &str) -> &str {
    v.strip_prefix('"')
        .and_then(|x| x.strip_suffix('"'))
        .unwrap_or(v)
}
fn list_mut(n: &mut RawSExpression) -> Option<&mut Vec<RawSExpression>> {
    match n {
        RawSExpression::List(v) => Some(v),
        _ => None,
    }
}
fn list(v: Vec<RawSExpression>) -> RawSExpression {
    RawSExpression::List(v)
}
fn atom(v: &str) -> RawSExpression {
    RawSExpression::Atom(v.into())
}
fn quoted(v: &str) -> RawSExpression {
    atom(&format!(
        "\"{}\"",
        v.replace('\\', "\\\\").replace('"', "\\\"")
    ))
}
fn num(v: f64) -> RawSExpression {
    atom(&format!("{v:.6}"))
}
fn point(h: &str, p: [f64; 2]) -> RawSExpression {
    list(vec![atom(h), num(p[0]), num(p[1])])
}
fn number_node(h: &str, v: f64) -> RawSExpression {
    list(vec![atom(h), num(v)])
}
fn int_node(h: &str, v: u32) -> RawSExpression {
    list(vec![atom(h), atom(&v.to_string())])
}
fn text_node(h: &str, v: &str) -> RawSExpression {
    list(vec![atom(h), quoted(v)])
}
fn push_diff(
    v: &mut Vec<PcbEditDiff>,
    i: usize,
    id: &str,
    k: &str,
    b: Option<String>,
    a: Option<String>,
) {
    v.push(PcbEditDiff {
        operation_index: i,
        uuid: id.into(),
        kind: k.into(),
        before: b,
        after: a,
    })
}
fn err(c: &str, i: Option<usize>, u: Option<&str>, m: &str) -> PcbEditError {
    PcbEditError {
        code: c.into(),
        operation_index: i,
        uuid: u.map(Into::into),
        message: m.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const PCB: &str = r#"(kicad_pcb (version 20240108) (layers (0 "F.Cu" signal) (31 "B.Cu" signal)) (footprint "R" (layer "F.Cu") (at 10 20 0) (uuid "fp1") (property "Reference" "R1")) (segment (start 1 2) (end 3 4) (width 0.25) (layer "F.Cu") (net 1) (uuid "t1")) (via (at 3 4) (size 0.8) (drill 0.4) (layers "F.Cu" "B.Cu") (net 1) (uuid "v1")) (future_node (opaque 1)))"#;
    fn board() -> PcbDocument {
        PcbDocument::parse(PCB).unwrap()
    }
    fn tx(ops: Vec<PcbEditOperation>) -> PcbEditTransaction {
        PcbEditTransaction {
            version: 1,
            expected_source_sha256: None,
            operations: ops,
        }
    }
    #[test]
    fn footprint_edits_keep_stable_identity_and_unknowns() {
        let r = apply_pcb_transaction(
            &board(),
            &tx(vec![
                PcbEditOperation::MoveFootprint {
                    uuid: "fp1".into(),
                    x: 12.,
                    y: 24.,
                    expected: None,
                },
                PcbEditOperation::RotateFootprint {
                    uuid: "fp1".into(),
                    angle: 90.,
                    expected: None,
                },
                PcbEditOperation::SetProperty {
                    uuid: "fp1".into(),
                    name: "Reference".into(),
                    value: "R2".into(),
                    expected: None,
                },
            ]),
        )
        .unwrap();
        assert!(r.source.contains("(at 12.000000 24.000000 90.000000)"));
        assert!(r.source.contains("(uuid \"fp1\")"));
        assert!(r.source.contains("(future_node (opaque 1))"));
    }
    #[test]
    fn adds_drags_and_deletes_copper() {
        let r = apply_pcb_transaction(
            &board(),
            &tx(vec![
                PcbEditOperation::AddTrack {
                    uuid: "t2".into(),
                    start: [0., 0.],
                    end: [5., 5.],
                    width: 0.3,
                    layer: "B.Cu".into(),
                    net: 1,
                },
                PcbEditOperation::DragTrack {
                    uuid: "t1".into(),
                    start: [2., 2.],
                    end: [4., 4.],
                    expected: None,
                },
                PcbEditOperation::AddVia {
                    uuid: "v2".into(),
                    at: [5., 5.],
                    size: 0.8,
                    drill: 0.4,
                    layers: ["F.Cu".into(), "B.Cu".into()],
                    net: 1,
                },
                PcbEditOperation::DeleteVia {
                    uuid: "v1".into(),
                    expected: None,
                },
            ]),
        )
        .unwrap();
        let p = PcbDocument::parse(&r.source).unwrap();
        assert_eq!(p.segments.len(), 2);
        assert_eq!(p.vias.len(), 1);
        assert_eq!(p.vias[0].0.uuid.as_deref(), Some("v2"));
    }
    #[test]
    fn duplicate_gets_new_stable_identity() {
        let r = apply_pcb_transaction(
            &board(),
            &tx(vec![PcbEditOperation::DuplicateFootprint {
                uuid: "fp1".into(),
                new_uuid: "fp2".into(),
                x: 30.,
                y: 40.,
            }]),
        )
        .unwrap();
        let p = PcbDocument::parse(r.source).unwrap();
        assert_eq!(p.footprints.len(), 2);
        assert_eq!(p.footprints[1].node.uuid.as_deref(), Some("fp2"));
    }
    #[test]
    fn transaction_is_atomic_on_late_failure() {
        let b = board();
        let e = apply_pcb_transaction(
            &b,
            &tx(vec![
                PcbEditOperation::MoveFootprint {
                    uuid: "fp1".into(),
                    x: 1.,
                    y: 2.,
                    expected: None,
                },
                PcbEditOperation::DeleteTrack {
                    uuid: "missing".into(),
                    expected: None,
                },
            ]),
        )
        .unwrap_err();
        assert_eq!(e.code, "not_found");
        assert_eq!(b.parsed.source, PCB);
    }
    #[test]
    fn rejects_stale_source_and_object() {
        let mut t = tx(vec![]);
        t.expected_source_sha256 = Some("bad".into());
        assert_eq!(
            apply_pcb_transaction(&board(), &t).unwrap_err().code,
            "stale_source"
        );
        let e = apply_pcb_transaction(
            &board(),
            &tx(vec![PcbEditOperation::DeleteTrack {
                uuid: "t1".into(),
                expected: Some("bad".into()),
            }]),
        )
        .unwrap_err();
        assert_eq!(e.code, "stale_object");
    }
    #[test]
    fn rejects_duplicate_uuid_and_invalid_via() {
        let e = apply_pcb_transaction(
            &board(),
            &tx(vec![PcbEditOperation::AddTrack {
                uuid: "t1".into(),
                start: [0., 0.],
                end: [1., 1.],
                width: 0.2,
                layer: "F.Cu".into(),
                net: 1,
            }]),
        )
        .unwrap_err();
        assert_eq!(e.code, "duplicate_uuid");
        let e = apply_pcb_transaction(
            &board(),
            &tx(vec![PcbEditOperation::AddVia {
                uuid: "v2".into(),
                at: [0., 0.],
                size: 0.3,
                drill: 0.4,
                layers: ["F.Cu".into(), "B.Cu".into()],
                net: 1,
            }]),
        )
        .unwrap_err();
        assert_eq!(e.code, "invalid_geometry");
    }

    struct RejectingDrc;
    impl PcbValidationHook for RejectingDrc {
        fn validate(
            &self,
            _board: &PcbDocument,
            _diffs: &[PcbEditDiff],
        ) -> Result<Vec<String>, PcbEditError> {
            Err(err("drc_blocked", None, None, "clearance violation"))
        }
    }
    #[test]
    fn validation_hook_can_abort_before_candidate_serialization() {
        let board = board();
        let result = apply_pcb_transaction_with_hook(
            &board,
            &tx(vec![PcbEditOperation::MoveFootprint {
                uuid: "fp1".into(),
                x: 11.0,
                y: 21.0,
                expected: None,
            }]),
            &RejectingDrc,
        );
        assert_eq!(result.unwrap_err().code, "drc_blocked");
        assert_eq!(board.parsed.source, PCB);
    }
}
