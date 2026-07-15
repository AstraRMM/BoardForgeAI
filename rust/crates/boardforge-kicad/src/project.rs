//! Lossless-enough JSON support for KiCad `.kicad_pro` project files.
//!
//! KiCad adds project properties over time.  Known properties are typed while
//! `extra` maps retain properties written by newer KiCad releases and plugins.

use crate::model::WriteMode;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ProjectMeta {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<u64>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

/// Board editor settings are intentionally extensible: KiCad's board object is
/// currently empty in many project versions, but must survive future additions.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct BoardSettings {
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct NetClass {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub clearance: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub track_width: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub via_diameter: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub via_drill: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub diff_pair_width: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub diff_pair_gap: Option<f64>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct NetSettings {
    #[serde(default)]
    pub classes: Vec<NetClass>,
    #[serde(default)]
    pub meta: Value,
    #[serde(default)]
    pub net_colors: Value,
    #[serde(default)]
    pub netclass_assignments: Value,
    #[serde(default)]
    pub netclass_patterns: Vec<Value>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct SchematicSettings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub legacy_lib_dir: Option<String>,
    #[serde(default)]
    pub legacy_lib_list: Vec<String>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Sheet {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uuid: Option<String>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct KicadProject {
    #[serde(default)]
    pub meta: ProjectMeta,
    #[serde(default)]
    pub board: BoardSettings,
    #[serde(default)]
    pub boards: Vec<Value>,
    #[serde(default)]
    pub cvpcb: Map<String, Value>,
    #[serde(default)]
    pub erc: Map<String, Value>,
    #[serde(default)]
    pub libraries: Map<String, Value>,
    #[serde(default)]
    pub net_settings: NetSettings,
    #[serde(default)]
    pub pcbnew: Map<String, Value>,
    #[serde(default)]
    pub schematic: SchematicSettings,
    #[serde(default)]
    pub sheets: Vec<Sheet>,
    #[serde(default)]
    pub text_variables: Map<String, Value>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
    #[serde(skip)]
    source: Option<ProjectSource>,
}

#[derive(Clone, Debug)]
struct ProjectSource {
    text: String,
    value: Value,
}

impl PartialEq for KicadProject {
    fn eq(&self, other: &Self) -> bool {
        // Source formatting is provenance, not project data.
        serde_json::to_value(self).ok() == serde_json::to_value(other).ok()
    }
}

impl KicadProject {
    pub fn parse(input: &str) -> serde_json::Result<Self> {
        let value: Value = serde_json::from_str(input)?;
        let mut project: Self = serde_json::from_value(value)?;
        // Compare future writes against the normalized model, not the sparse
        // input object: serde defaults must not make an untouched file dirty.
        let normalized = serde_json::to_value(&project)?;
        project.source = Some(ProjectSource {
            text: input.to_owned(),
            value: normalized,
        });
        Ok(project)
    }

    pub fn write(&self, mode: WriteMode) -> serde_json::Result<String> {
        let value = serde_json::to_value(self)?;
        if mode == WriteMode::PreserveMode {
            if let Some(source) = &self.source {
                if source.value == value {
                    return Ok(source.text.clone());
                }
            }
            return serde_json::to_string_pretty(&value);
        }
        serde_json::to_string_pretty(&canonicalize(value))
    }
}

fn canonicalize(value: Value) -> Value {
    match value {
        Value::Object(object) => {
            let mut entries: Vec<_> = object.into_iter().collect();
            entries.sort_unstable_by(|left, right| left.0.cmp(&right.0));
            Value::Object(
                entries
                    .into_iter()
                    .map(|(key, value)| (key, canonicalize(value)))
                    .collect(),
            )
        }
        Value::Array(values) => Value::Array(values.into_iter().map(canonicalize).collect()),
        scalar => scalar,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const PROJECT: &str = r#"{
  "future_top": {"enabled": true, "revision": 7},
  "meta": {"filename": "robot.kicad_pro", "version": 1, "future_meta": "kept"},
  "board": {"future_board": [1, 2, 3]},
  "net_settings": {
    "classes": [{"name": "Default", "clearance": 0.2, "track_width": 0.25, "future_rule": 9}],
    "netclass_patterns": [],
    "future_net_setting": {"x": 1}
  },
  "schematic": {"legacy_lib_dir": "", "legacy_lib_list": [], "future_schematic": false},
  "sheets": [{"name": "Root", "uuid": "00000000-0000-0000-0000-000000000001", "future_sheet": 42}],
  "text_variables": {"COMPANY": "BoardForge"},
  "pcbnew": {"last_paths": {"gencad": ""}}
}"#;

    #[test]
    fn parses_typed_fields_and_preserves_unknown_json_at_each_boundary() {
        let project = KicadProject::parse(PROJECT).unwrap();
        assert_eq!(project.meta.filename.as_deref(), Some("robot.kicad_pro"));
        assert_eq!(project.net_settings.classes[0].clearance, Some(0.2));
        assert_eq!(project.extra["future_top"]["revision"], 7);
        assert_eq!(project.meta.extra["future_meta"], "kept");
        assert_eq!(project.board.extra["future_board"], json!([1, 2, 3]));
        assert_eq!(project.net_settings.classes[0].extra["future_rule"], 9);
        assert_eq!(project.sheets[0].extra["future_sheet"], 42);
    }

    #[test]
    fn preserve_mode_is_byte_identical_while_unmodified() {
        let project = KicadProject::parse(PROJECT).unwrap();
        assert_eq!(project.write(WriteMode::PreserveMode).unwrap(), PROJECT);
    }

    #[test]
    fn canonical_output_is_deterministic_and_parse_write_reparse_equal() {
        let project = KicadProject::parse(PROJECT).unwrap();
        let first = project.write(WriteMode::CanonicalMode).unwrap();
        let reparsed = KicadProject::parse(&first).unwrap();
        let second = reparsed.write(WriteMode::CanonicalMode).unwrap();
        assert_eq!(first, second);
        assert_eq!(project, reparsed);
    }

    #[test]
    fn preserve_mode_serializes_mutations_without_losing_unknown_fields() {
        let mut project = KicadProject::parse(PROJECT).unwrap();
        project.meta.filename = Some("renamed.kicad_pro".into());
        let output = project.write(WriteMode::PreserveMode).unwrap();
        assert_ne!(output, PROJECT);
        let reparsed = KicadProject::parse(&output).unwrap();
        assert_eq!(reparsed.meta.filename.as_deref(), Some("renamed.kicad_pro"));
        assert_eq!(reparsed.extra["future_top"]["enabled"], true);
    }
}
