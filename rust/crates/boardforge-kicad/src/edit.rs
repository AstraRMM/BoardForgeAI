use crate::{raw::RawSExpression, schematic::Schematic};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EditTransaction {
    pub version: u32,
    pub operations: Vec<EditOperation>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum EditOperation {
    MoveSymbol {
        uuid: String,
        x: f64,
        y: f64,
        expected_x: Option<f64>,
        expected_y: Option<f64>,
    },
    RotateSymbol {
        uuid: String,
        angle: f64,
        expected_angle: Option<f64>,
    },
    EditProperty {
        uuid: String,
        name: String,
        value: String,
        expected: Option<String>,
    },
    AddWire {
        uuid: String,
        start: [f64; 2],
        end: [f64; 2],
    },
    DeleteWire {
        uuid: String,
        expected_start: Option<[f64; 2]>,
        expected_end: Option<[f64; 2]>,
    },
    AddLabel {
        uuid: String,
        text: String,
        x: f64,
        y: f64,
        angle: Option<f64>,
        kind: Option<LabelKind>,
    },
    MoveLabel {
        uuid: String,
        x: f64,
        y: f64,
        expected_x: Option<f64>,
        expected_y: Option<f64>,
    },
    EditLabel {
        uuid: String,
        text: String,
        expected: Option<String>,
    },
    DeleteLabel {
        uuid: String,
        expected: Option<String>,
    },
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LabelKind {
    Local,
    Global,
    Hierarchical,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EditDiff {
    pub operation_index: usize,
    pub uuid: String,
    pub kind: String,
    pub before: Option<String>,
    pub after: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EditResult {
    pub source: String,
    pub diffs: Vec<EditDiff>,
    pub preserved_unknown: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct EditError {
    pub code: String,
    pub operation_index: Option<usize>,
    pub uuid: Option<String>,
    pub message: String,
}

impl std::fmt::Display for EditError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}
impl std::error::Error for EditError {}

pub fn apply_transaction(
    schematic: &Schematic,
    transaction: &EditTransaction,
) -> Result<EditResult, EditError> {
    if transaction.version != 1 {
        return Err(error(
            "unsupported_version",
            None,
            None,
            "transaction version must be 1",
        ));
    }
    let mut root = schematic.document.root.clone();
    let mut diffs = Vec::new();
    for (index, operation) in transaction.operations.iter().enumerate() {
        apply(&mut root, operation, index, &mut diffs)?;
    }
    Ok(EditResult {
        source: format!("{}\n", root.canonical()),
        diffs,
        preserved_unknown: schematic.document.unsupported.len(),
    })
}

fn apply(
    root: &mut RawSExpression,
    op: &EditOperation,
    index: usize,
    diffs: &mut Vec<EditDiff>,
) -> Result<(), EditError> {
    let (uuid, kind) = match op {
        EditOperation::MoveSymbol { uuid, .. } | EditOperation::RotateSymbol { uuid, .. } => {
            (uuid, "symbol")
        }
        EditOperation::EditProperty { uuid, .. } => (uuid, "symbol"),
        EditOperation::AddWire { uuid, .. } | EditOperation::DeleteWire { uuid, .. } => {
            (uuid, "wire")
        }
        EditOperation::AddLabel { uuid, .. }
        | EditOperation::MoveLabel { uuid, .. }
        | EditOperation::EditLabel { uuid, .. }
        | EditOperation::DeleteLabel { uuid, .. } => (uuid, "label"),
    };
    if matches!(
        op,
        EditOperation::AddWire { .. } | EditOperation::AddLabel { .. }
    ) {
        if find(root, uuid).is_some() {
            return Err(error(
                "duplicate_uuid",
                Some(index),
                Some(uuid),
                "UUID already exists",
            ));
        }
        let node = match op {
            EditOperation::AddWire { uuid, start, end } => list(vec![
                atom("wire"),
                list(vec![atom("pts"), xy(*start), xy(*end)]),
                uuid_node(uuid),
            ]),
            EditOperation::AddLabel {
                uuid,
                text,
                x,
                y,
                angle,
                kind,
            } => list(vec![
                atom(match kind.unwrap_or(LabelKind::Local) {
                    LabelKind::Local => "label",
                    LabelKind::Global => "global_label",
                    LabelKind::Hierarchical => "hierarchical_label",
                }),
                quoted(text),
                at(*x, *y, angle.unwrap_or(0.)),
                uuid_node(uuid),
            ]),
            _ => unreachable!(),
        };
        root_list(root)?.push(node.clone());
        diffs.push(diff(index, uuid, kind, None, Some(node.canonical())));
        return Ok(());
    }
    let node = find_mut(root, uuid).ok_or_else(|| {
        error(
            "not_found",
            Some(index),
            Some(uuid),
            "target UUID not found",
        )
    })?;
    let before = node.canonical();
    match op {
        EditOperation::MoveSymbol {
            x,
            y,
            expected_x,
            expected_y,
            ..
        }
        | EditOperation::MoveLabel {
            x,
            y,
            expected_x,
            expected_y,
            ..
        } => {
            let old = coords(node, "at")?;
            stale_num(index, uuid, expected_x, old[0])?;
            stale_num(index, uuid, expected_y, old[1])?;
            set_at(node, *x, *y, old[2]);
        }
        EditOperation::RotateSymbol {
            angle,
            expected_angle,
            ..
        } => {
            let old = coords(node, "at")?;
            stale_num(index, uuid, expected_angle, old[2])?;
            set_at(node, old[0], old[1], *angle);
        }
        EditOperation::EditProperty {
            name,
            value,
            expected,
            ..
        } => {
            let property = children_mut(node)
                .iter_mut()
                .find(|n| {
                    n.head() == Some("property") && n.atom(1).map(unquote) == Some(name.as_str())
                })
                .ok_or_else(|| {
                    error(
                        "property_not_found",
                        Some(index),
                        Some(uuid),
                        "property not found",
                    )
                })?;
            let old = property.atom(2).map(unquote).unwrap_or_default();
            stale_text(index, uuid, expected.as_deref(), old)?;
            list_mut(property)?[2] = quoted(value);
        }
        EditOperation::DeleteWire {
            expected_start,
            expected_end,
            ..
        } => {
            let (start, end) = wire_points(node)?;
            stale_point(index, uuid, expected_start, start)?;
            stale_point(index, uuid, expected_end, end)?;
            remove_uuid(root, uuid);
            diffs.push(diff(index, uuid, kind, Some(before), None));
            return Ok(());
        }
        EditOperation::EditLabel { text, expected, .. } => {
            let old = node.atom(1).map(unquote).unwrap_or_default();
            stale_text(index, uuid, expected.as_deref(), old)?;
            list_mut(node)?[1] = quoted(text);
        }
        EditOperation::DeleteLabel { expected, .. } => {
            let old = node.atom(1).map(unquote).unwrap_or_default();
            stale_text(index, uuid, expected.as_deref(), old)?;
            remove_uuid(root, uuid);
            diffs.push(diff(index, uuid, kind, Some(before), None));
            return Ok(());
        }
        _ => unreachable!(),
    }
    diffs.push(diff(
        index,
        uuid,
        kind,
        Some(before),
        Some(node.canonical()),
    ));
    Ok(())
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
fn list(v: Vec<RawSExpression>) -> RawSExpression {
    RawSExpression::List(v)
}
fn xy(p: [f64; 2]) -> RawSExpression {
    list(vec![
        atom("xy"),
        atom(&p[0].to_string()),
        atom(&p[1].to_string()),
    ])
}
fn at(x: f64, y: f64, a: f64) -> RawSExpression {
    list(vec![
        atom("at"),
        atom(&x.to_string()),
        atom(&y.to_string()),
        atom(&a.to_string()),
    ])
}
fn uuid_node(v: &str) -> RawSExpression {
    list(vec![atom("uuid"), atom(v)])
}
fn unquote(v: &str) -> &str {
    v.strip_prefix('"')
        .and_then(|x| x.strip_suffix('"'))
        .unwrap_or(v)
}
fn list_mut(node: &mut RawSExpression) -> Result<&mut Vec<RawSExpression>, EditError> {
    match node {
        RawSExpression::List(v) => Ok(v),
        _ => Err(error("invalid_ast", None, None, "expected list")),
    }
}
fn children_mut(node: &mut RawSExpression) -> &mut Vec<RawSExpression> {
    match node {
        RawSExpression::List(v) => v,
        _ => unreachable!(),
    }
}
fn root_list(node: &mut RawSExpression) -> Result<&mut Vec<RawSExpression>, EditError> {
    list_mut(node)
}
fn find<'a>(node: &'a RawSExpression, uuid: &str) -> Option<&'a RawSExpression> {
    if node
        .children("uuid")
        .any(|n| n.atom(1).map(unquote) == Some(uuid))
    {
        return Some(node);
    }
    node.as_list()?.iter().find_map(|n| find(n, uuid))
}
fn find_mut<'a>(node: &'a mut RawSExpression, uuid: &str) -> Option<&'a mut RawSExpression> {
    let hit = node.as_list().is_some_and(|v| {
        v.iter()
            .any(|n| n.head() == Some("uuid") && n.atom(1).map(unquote) == Some(uuid))
    });
    if hit {
        return Some(node);
    }
    match node {
        RawSExpression::List(v) => v.iter_mut().find_map(|n| find_mut(n, uuid)),
        _ => None,
    }
}
fn remove_uuid(root: &mut RawSExpression, uuid: &str) {
    if let RawSExpression::List(v) = root {
        v.retain(|n| {
            !n.children("uuid")
                .any(|u| u.atom(1).map(unquote) == Some(uuid))
        });
    }
}
fn coords(node: &RawSExpression, head: &str) -> Result<[f64; 3], EditError> {
    let n = node
        .children(head)
        .next()
        .ok_or_else(|| error("invalid_ast", None, None, "position missing"))?;
    Ok([
        n.atom(1).and_then(|v| v.parse().ok()).unwrap_or(0.),
        n.atom(2).and_then(|v| v.parse().ok()).unwrap_or(0.),
        n.atom(3).and_then(|v| v.parse().ok()).unwrap_or(0.),
    ])
}
fn set_at(node: &mut RawSExpression, x: f64, y: f64, a: f64) {
    if let Some(n) = children_mut(node)
        .iter_mut()
        .find(|n| n.head() == Some("at"))
    {
        *n = at(x, y, a);
    }
}
fn wire_points(node: &RawSExpression) -> Result<([f64; 2], [f64; 2]), EditError> {
    let pts = node
        .children("pts")
        .next()
        .ok_or_else(|| error("invalid_ast", None, None, "wire points missing"))?;
    let mut xy = pts.children("xy").map(|n| {
        [
            n.atom(1).and_then(|v| v.parse().ok()).unwrap_or(0.),
            n.atom(2).and_then(|v| v.parse().ok()).unwrap_or(0.),
        ]
    });
    Ok((
        xy.next()
            .ok_or_else(|| error("invalid_ast", None, None, "wire start missing"))?,
        xy.next()
            .ok_or_else(|| error("invalid_ast", None, None, "wire end missing"))?,
    ))
}
fn stale_num(i: usize, u: &str, e: &Option<f64>, a: f64) -> Result<(), EditError> {
    if e.is_some_and(|v| (v - a).abs() > 1e-9) {
        Err(error(
            "stale_value",
            Some(i),
            Some(u),
            "expected numeric value does not match",
        ))
    } else {
        Ok(())
    }
}
fn stale_text(i: usize, u: &str, e: Option<&str>, a: &str) -> Result<(), EditError> {
    if e.is_some_and(|v| v != a) {
        Err(error(
            "stale_value",
            Some(i),
            Some(u),
            "expected text does not match",
        ))
    } else {
        Ok(())
    }
}
fn stale_point(i: usize, u: &str, e: &Option<[f64; 2]>, a: [f64; 2]) -> Result<(), EditError> {
    if e.is_some_and(|v| (v[0] - a[0]).abs() > 1e-9 || (v[1] - a[1]).abs() > 1e-9) {
        Err(error(
            "stale_value",
            Some(i),
            Some(u),
            "expected point does not match",
        ))
    } else {
        Ok(())
    }
}
fn error(code: &str, i: Option<usize>, u: Option<&str>, m: &str) -> EditError {
    EditError {
        code: code.into(),
        operation_index: i,
        uuid: u.map(Into::into),
        message: m.into(),
    }
}
fn diff(i: usize, u: &str, k: &str, b: Option<String>, a: Option<String>) -> EditDiff {
    EditDiff {
        operation_index: i,
        uuid: u.into(),
        kind: k.into(),
        before: b,
        after: a,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const S:&str="(kicad_sch (version 1) (future x) (symbol (at 1 2 0) (uuid s) (property \"Value\" \"old\")) (wire (pts (xy 0 0) (xy 1 1)) (uuid w)) (label \"A\" (at 2 3 0) (uuid l)))";
    fn sch() -> Schematic {
        Schematic::parse(S).unwrap()
    }
    fn tx(op: EditOperation) -> EditTransaction {
        EditTransaction {
            version: 1,
            operations: vec![op],
        }
    }
    #[test]
    fn moves_symbol() {
        assert!(apply_transaction(
            &sch(),
            &tx(EditOperation::MoveSymbol {
                uuid: "s".into(),
                x: 4.,
                y: 5.,
                expected_x: Some(1.),
                expected_y: Some(2.)
            })
        )
        .unwrap()
        .source
        .contains("(at 4 5 0)"))
    }
    #[test]
    fn rotates_symbol() {
        assert!(apply_transaction(
            &sch(),
            &tx(EditOperation::RotateSymbol {
                uuid: "s".into(),
                angle: 90.,
                expected_angle: Some(0.)
            })
        )
        .unwrap()
        .source
        .contains("(at 1 2 90)"))
    }
    #[test]
    fn edits_property() {
        assert!(apply_transaction(
            &sch(),
            &tx(EditOperation::EditProperty {
                uuid: "s".into(),
                name: "Value".into(),
                value: "new".into(),
                expected: Some("old".into())
            })
        )
        .unwrap()
        .source
        .contains("\"new\""))
    }
    #[test]
    fn adds_and_deletes_wire() {
        let a = apply_transaction(
            &sch(),
            &tx(EditOperation::AddWire {
                uuid: "w2".into(),
                start: [2., 2.],
                end: [3., 3.],
            }),
        )
        .unwrap();
        assert!(a.source.contains("(uuid w2)"));
        let d = apply_transaction(
            &sch(),
            &tx(EditOperation::DeleteWire {
                uuid: "w".into(),
                expected_start: Some([0., 0.]),
                expected_end: Some([1., 1.]),
            }),
        )
        .unwrap();
        assert!(!d.source.contains("(uuid w)"))
    }
    #[test]
    fn adds_label_kinds() {
        assert!(apply_transaction(
            &sch(),
            &tx(EditOperation::AddLabel {
                uuid: "g".into(),
                text: "VCC".into(),
                x: 0.,
                y: 0.,
                angle: None,
                kind: Some(LabelKind::Global)
            })
        )
        .unwrap()
        .source
        .contains("global_label"))
    }
    #[test]
    fn moves_and_edits_label() {
        let r = apply_transaction(
            &sch(),
            &EditTransaction {
                version: 1,
                operations: vec![
                    EditOperation::MoveLabel {
                        uuid: "l".into(),
                        x: 8.,
                        y: 9.,
                        expected_x: Some(2.),
                        expected_y: Some(3.),
                    },
                    EditOperation::EditLabel {
                        uuid: "l".into(),
                        text: "B".into(),
                        expected: Some("A".into()),
                    },
                ],
            },
        )
        .unwrap();
        assert!(r.source.contains("(label \"B\" (at 8 9 0)"))
    }
    #[test]
    fn deletes_label() {
        assert!(!apply_transaction(
            &sch(),
            &tx(EditOperation::DeleteLabel {
                uuid: "l".into(),
                expected: Some("A".into())
            })
        )
        .unwrap()
        .source
        .contains("(uuid l)"))
    }
    #[test]
    fn rejects_stale_atomically() {
        let t = EditTransaction {
            version: 1,
            operations: vec![
                EditOperation::MoveSymbol {
                    uuid: "s".into(),
                    x: 9.,
                    y: 9.,
                    expected_x: Some(1.),
                    expected_y: Some(2.),
                },
                EditOperation::EditLabel {
                    uuid: "l".into(),
                    text: "B".into(),
                    expected: Some("WRONG".into()),
                },
            ],
        };
        let e = apply_transaction(&sch(), &t).unwrap_err();
        assert_eq!(e.code, "stale_value");
        assert_eq!(e.operation_index, Some(1));
        assert!(sch()
            .write(crate::WriteMode::CanonicalMode)
            .unwrap()
            .contains("(at 1 2 0)"))
    }
    #[test]
    fn preserves_unknown_order_and_rejects_duplicates() {
        let r = apply_transaction(
            &sch(),
            &tx(EditOperation::MoveSymbol {
                uuid: "s".into(),
                x: 2.,
                y: 2.,
                expected_x: None,
                expected_y: None,
            }),
        )
        .unwrap();
        assert!(r.source.find("(future x)").unwrap() < r.source.find("(symbol ").unwrap());
        assert_eq!(
            apply_transaction(
                &sch(),
                &tx(EditOperation::AddWire {
                    uuid: "w".into(),
                    start: [0., 0.],
                    end: [1., 1.]
                })
            )
            .unwrap_err()
            .code,
            "duplicate_uuid"
        )
    }
}
