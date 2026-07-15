use boardforge_kicad::{
    edit::{apply_transaction, EditTransaction},
    pcb::PcbDocument,
    project::KicadProject,
    schematic::Schematic,
    WriteMode,
};
use serde::Serialize;
use std::{env, fs, path::Path, process::ExitCode};

#[derive(Serialize)]
struct Output {
    kind: &'static str,
    normalized: String,
    unsupported: usize,
}

fn normalize(path: &str, source: String) -> Result<Output, String> {
    match Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
    {
        "kicad_pro" => {
            let value = KicadProject::parse(&source).map_err(|error| error.to_string())?;
            Ok(Output {
                kind: "project",
                normalized: value
                    .write(WriteMode::CanonicalMode)
                    .map_err(|error| error.to_string())?,
                unsupported: value.extra.len(),
            })
        }
        "kicad_sch" => {
            let value = Schematic::parse(source).map_err(|error| error.to_string())?;
            Ok(Output {
                kind: "schematic",
                normalized: value
                    .write(WriteMode::CanonicalMode)
                    .map_err(|error| error.to_string())?,
                unsupported: value.document.unsupported.len(),
            })
        }
        "kicad_pcb" => {
            let value = PcbDocument::parse(source).map_err(|error| error.to_string())?;
            Ok(Output {
                kind: "pcb",
                normalized: value
                    .write(WriteMode::CanonicalMode)
                    .map_err(|error| error.to_string())?,
                unsupported: value.unsupported().len(),
            })
        }
        _ => Err("unsupported KiCad extension".into()),
    }
}

fn main() -> ExitCode {
    let mut arguments = env::args().skip(1);
    let mode = arguments.next().unwrap_or_default();
    let path = arguments.next().unwrap_or_default();
    if mode == "apply-transaction" && !path.is_empty() {
        let transaction_path = arguments.next().unwrap_or_else(|| "-".into());
        let source = match fs::read_to_string(&path) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("{e}");
                return ExitCode::from(2);
            }
        };
        let json = if transaction_path == "-" {
            let mut value = String::new();
            if let Err(e) = std::io::Read::read_to_string(&mut std::io::stdin(), &mut value) {
                eprintln!("{e}");
                return ExitCode::from(2);
            }
            value
        } else {
            match fs::read_to_string(transaction_path) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("{e}");
                    return ExitCode::from(2);
                }
            }
        };
        let transaction: EditTransaction = match serde_json::from_str(&json) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("{e}");
                return ExitCode::from(2);
            }
        };
        let schematic = match Schematic::parse(source) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("{e}");
                return ExitCode::FAILURE;
            }
        };
        return match apply_transaction(&schematic, &transaction) {
            Ok(v) => {
                println!("{}", serde_json::to_string(&v).expect("result serializes"));
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("{}", serde_json::to_string(&e).expect("error serializes"));
                ExitCode::FAILURE
            }
        };
    }
    if mode != "normalize" || path.is_empty() {
        eprintln!("usage: boardforge-kicad normalize <file> | apply-transaction <schematic> <transaction.json|->");
        return ExitCode::from(2);
    }
    let source = match fs::read_to_string(&path) {
        Ok(value) => value,
        Err(error) => {
            eprintln!("{error}");
            return ExitCode::from(2);
        }
    };
    match normalize(&path, source) {
        Ok(value) => {
            println!(
                "{}",
                serde_json::to_string(&value).expect("output serializes")
            );
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}
