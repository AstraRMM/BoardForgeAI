use boardforge_core::{BoardForgeError, Result};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum RawSExpression {
    Atom(String),
    List(Vec<RawSExpression>),
}

impl RawSExpression {
    pub fn head(&self) -> Option<&str> {
        match self {
            Self::List(values) => values.first().and_then(|value| match value {
                Self::Atom(atom) => Some(atom.as_str()),
                _ => None,
            }),
            _ => None,
        }
    }
    pub fn children<'a>(&'a self, name: &'a str) -> impl Iterator<Item = &'a RawSExpression> + 'a {
        self.as_list()
            .into_iter()
            .flatten()
            .filter(move |value| value.head() == Some(name))
    }
    pub fn as_list(&self) -> Option<&[RawSExpression]> {
        if let Self::List(values) = self {
            Some(values)
        } else {
            None
        }
    }
    pub fn atom(&self, index: usize) -> Option<&str> {
        self.as_list()?.get(index).and_then(|value| {
            if let Self::Atom(atom) = value {
                Some(atom.as_str())
            } else {
                None
            }
        })
    }
    pub fn canonical(&self) -> String {
        match self {
            Self::Atom(value) => value.clone(),
            Self::List(values) => format!(
                "({})",
                values
                    .iter()
                    .map(Self::canonical)
                    .collect::<Vec<_>>()
                    .join(" ")
            ),
        }
    }
}

pub fn parse(source: &str) -> Result<RawSExpression> {
    let mut parser = Parser { source, offset: 0 };
    parser.skip_trivia();
    let value = parser.expression()?;
    parser.skip_trivia();
    if parser.offset != source.len() {
        return Err(BoardForgeError::InvalidInput(format!(
            "unexpected KiCad content at byte {}",
            parser.offset
        )));
    }
    Ok(value)
}

struct Parser<'a> {
    source: &'a str,
    offset: usize,
}
impl Parser<'_> {
    fn skip_trivia(&mut self) {
        loop {
            while self.peek().is_some_and(char::is_whitespace) {
                self.bump();
            }
            if self.source[self.offset..].starts_with(';') {
                while self.peek().is_some_and(|c| c != '\n') {
                    self.bump();
                }
            } else {
                break;
            }
        }
    }
    fn expression(&mut self) -> Result<RawSExpression> {
        self.skip_trivia();
        match self.peek() {
            Some('(') => {
                self.bump();
                let mut values = Vec::new();
                loop {
                    self.skip_trivia();
                    match self.peek() {
                        Some(')') => {
                            self.bump();
                            break;
                        }
                        None => {
                            return Err(BoardForgeError::InvalidInput(
                                "unterminated KiCad list".into(),
                            ))
                        }
                        _ => values.push(self.expression()?),
                    }
                }
                Ok(RawSExpression::List(values))
            }
            Some('"') => self.quoted().map(RawSExpression::Atom),
            Some(_) => self.atom().map(RawSExpression::Atom),
            None => Err(BoardForgeError::InvalidInput(
                "missing KiCad expression".into(),
            )),
        }
    }
    fn quoted(&mut self) -> Result<String> {
        let start = self.offset;
        self.bump();
        let mut escaped = false;
        while let Some(character) = self.bump() {
            if character == '"' && !escaped {
                return Ok(self.source[start..self.offset].to_string());
            }
            escaped = character == '\\' && !escaped;
            if character != '\\' {
                escaped = false;
            }
        }
        Err(BoardForgeError::InvalidInput(
            "unterminated KiCad string".into(),
        ))
    }
    fn atom(&mut self) -> Result<String> {
        let start = self.offset;
        while self
            .peek()
            .is_some_and(|c| !c.is_whitespace() && c != '(' && c != ')')
        {
            self.bump();
        }
        if start == self.offset {
            Err(BoardForgeError::InvalidInput("empty KiCad atom".into()))
        } else {
            Ok(self.source[start..self.offset].to_string())
        }
    }
    fn peek(&self) -> Option<char> {
        self.source[self.offset..].chars().next()
    }
    fn bump(&mut self) -> Option<char> {
        let value = self.peek()?;
        self.offset += value.len_utf8();
        Some(value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn parses_and_canonicalizes_nested_kicad() {
        let parsed = parse(" (kicad_sch\n (version 20231120) (unknown \"a b\")) ").unwrap();
        assert_eq!(parsed.head(), Some("kicad_sch"));
        assert_eq!(
            parsed.canonical(),
            "(kicad_sch (version 20231120) (unknown \"a b\"))"
        );
    }
    #[test]
    fn rejects_truncated_input() {
        assert!(parse("(kicad_pcb (version 1)").is_err());
    }
}
