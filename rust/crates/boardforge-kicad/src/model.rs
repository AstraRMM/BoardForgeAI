use crate::raw::{parse, RawSExpression};
use boardforge_core::{BoardForgeError, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WriteMode {
    PreserveMode,
    CanonicalMode,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct UnsupportedConstruct {
    pub kind: String,
    pub path: String,
    pub status: SupportStatus,
    pub preserved: bool,
    pub modified: bool,
    pub risk: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SupportStatus {
    SupportedTyped,
    SupportedPartial,
    PreservedRaw,
    LossRisk,
    Blocked,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ParsedKiCadDocument {
    pub kind: String,
    pub source: String,
    pub source_sha256: String,
    pub root: RawSExpression,
    pub unsupported: Vec<UnsupportedConstruct>,
}

impl ParsedKiCadDocument {
    pub fn parse(source: impl Into<String>, expected: &str, typed_heads: &[&str]) -> Result<Self> {
        let source = source.into();
        let root = parse(&source)?;
        if root.head() != Some(expected) {
            return Err(BoardForgeError::InvalidInput(format!(
                "expected {expected} document"
            )));
        }
        let mut unsupported = Vec::new();
        collect_unknown(&root, expected, typed_heads, &mut unsupported);
        let source_sha256 = format!("{:x}", Sha256::digest(source.as_bytes()));
        Ok(Self {
            kind: expected.into(),
            source,
            source_sha256,
            root,
            unsupported,
        })
    }
    pub fn write(&self, mode: WriteMode) -> Result<String> {
        if self.unsupported.iter().any(|item| {
            matches!(
                item.status,
                SupportStatus::LossRisk | SupportStatus::Blocked
            ) && !item.preserved
        }) {
            return Err(BoardForgeError::InvalidInput(
                "write blocked by unsupported construct loss risk".into(),
            ));
        }
        Ok(match mode {
            WriteMode::PreserveMode => self.source.clone(),
            WriteMode::CanonicalMode => format!("{}\n", self.root.canonical()),
        })
    }
}

fn collect_unknown(
    node: &RawSExpression,
    path: &str,
    typed: &[&str],
    output: &mut Vec<UnsupportedConstruct>,
) {
    let Some(values) = node.as_list() else { return };
    for (index, child) in values.iter().enumerate().skip(1) {
        let Some(head) = child.head() else { continue };
        let child_path = format!("{path}/{head}[{index}]");
        if !typed.contains(&head) {
            output.push(UnsupportedConstruct {
                kind: head.into(),
                path: child_path.clone(),
                status: SupportStatus::PreservedRaw,
                preserved: true,
                modified: false,
                risk: "none; raw subtree retained".into(),
            });
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct StructuralDiff {
    pub semantic_additions: Vec<String>,
    pub semantic_removals: Vec<String>,
    pub semantic_modifications: Vec<String>,
    pub preserved_unknown: usize,
    pub uuid_changes: usize,
    pub coordinate_changes: usize,
    pub status: DiffStatus,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DiffStatus {
    Parity,
    ParityWithFormattingOnly,
    RustBetter,
    NodeBetter,
    LossDetected,
    Blocked,
}

pub fn structural_diff(
    before: &ParsedKiCadDocument,
    after: &ParsedKiCadDocument,
) -> StructuralDiff {
    let same = before.root == after.root;
    StructuralDiff {
        semantic_additions: vec![],
        semantic_removals: vec![],
        semantic_modifications: if same {
            vec![]
        } else {
            vec!["normalized AST changed".into()]
        },
        preserved_unknown: after
            .unsupported
            .iter()
            .filter(|item| item.preserved)
            .count(),
        uuid_changes: 0,
        coordinate_changes: 0,
        status: if same {
            if before.source == after.source {
                DiffStatus::Parity
            } else {
                DiffStatus::ParityWithFormattingOnly
            }
        } else {
            DiffStatus::LossDetected
        },
    }
}
