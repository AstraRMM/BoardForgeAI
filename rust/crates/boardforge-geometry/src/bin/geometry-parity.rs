use boardforge_geometry::{fill_closure, Point, Polygon};
use serde::{Deserialize, Serialize};
use std::{env, fs, process::ExitCode};

#[derive(Deserialize)]
struct Fixture {
    id: String,
    points: Vec<Point>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultRow {
    id: String,
    valid: bool,
    area: Option<f64>,
    perimeter: Option<f64>,
}

fn main() -> ExitCode {
    let Some(path) = env::args().nth(1) else {
        eprintln!("usage: geometry-parity <fixtures.json>");
        return ExitCode::from(2);
    };
    let input = match fs::read_to_string(path)
        .ok()
        .and_then(|text| serde_json::from_str::<Vec<Fixture>>(&text).ok())
    {
        Some(value) => value,
        None => return ExitCode::from(2),
    };
    let rows: Vec<_> = input
        .into_iter()
        .map(|fixture| {
            let polygon = fill_closure(&fixture.points).or_else(|_| Polygon::new(fixture.points));
            match polygon {
                Ok(value) => ResultRow {
                    id: fixture.id,
                    valid: true,
                    area: Some(value.area()),
                    perimeter: Some(value.perimeter()),
                },
                Err(_) => ResultRow {
                    id: fixture.id,
                    valid: false,
                    area: None,
                    perimeter: None,
                },
            }
        })
        .collect();
    println!(
        "{}",
        serde_json::to_string(&rows).expect("serializable parity output")
    );
    ExitCode::SUCCESS
}
