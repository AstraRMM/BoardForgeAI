use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;
use uuid::Uuid;

/// Stable identity shared by native and browser engines.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct EntityId(Uuid);

impl EntityId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for EntityId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for EntityId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// Millimetres are the canonical geometry unit at the engine boundary.
#[derive(Clone, Copy, Debug, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Millimeters(pub f64);

#[derive(Clone, Debug, Error, PartialEq, Serialize, Deserialize)]
#[serde(tag = "code", content = "detail", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BoardForgeError {
    #[error("invalid geometry: {0}")]
    InvalidGeometry(String),
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("unsupported operation: {0}")]
    Unsupported(String),
}

pub type Result<T> = std::result::Result<T, BoardForgeError>;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct EngineVersion {
    pub schema: u32,
    pub engine: String,
}

impl Default for EngineVersion {
    fn default() -> Self {
        Self {
            schema: 1,
            engine: env!("CARGO_PKG_VERSION").to_owned(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_stable_through_copy_and_distinct_when_created() {
        let a = EntityId::new();
        assert_eq!(a, a);
        assert_ne!(a, EntityId::new());
    }
}
