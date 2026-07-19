use boardforge_geometry::pcb::{self, PcbGeometryRequest, PcbRect, RouteRequest};
use boardforge_geometry::{fill_closure, Point, Polygon, Segment};
use boardforge_kicad::{
    pcb::PcbDocument,
    pcb_edit::{apply_pcb_transaction, PcbEditTransaction},
    pcb_view::PcbBrowserViewV1,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
struct HitTestRequest {
    segment: Segment,
    point: Point,
    tolerance: f64,
}

#[derive(Serialize)]
struct GeometryMetrics {
    area: f64,
    perimeter: f64,
}

fn js_error(error: impl ToString) -> JsValue {
    JsValue::from_str(&error.to_string())
}

#[wasm_bindgen]
pub fn polygon_metrics(value: JsValue) -> Result<JsValue, JsValue> {
    let polygon: Polygon = serde_wasm_bindgen::from_value(value).map_err(js_error)?;
    serde_wasm_bindgen::to_value(&GeometryMetrics {
        area: polygon.area(),
        perimeter: polygon.perimeter(),
    })
    .map_err(js_error)
}

#[wasm_bindgen]
pub fn hit_test_segment(value: JsValue) -> Result<bool, JsValue> {
    let request: HitTestRequest = serde_wasm_bindgen::from_value(value).map_err(js_error)?;
    Ok(request.segment.hit_test(request.point, request.tolerance))
}

#[wasm_bindgen]
pub fn close_outline(value: JsValue) -> Result<JsValue, JsValue> {
    let points: Vec<Point> = serde_wasm_bindgen::from_value(value).map_err(js_error)?;
    serde_wasm_bindgen::to_value(&fill_closure(&points).map_err(js_error)?).map_err(js_error)
}

/// Rust-owned PCB transaction boundary. TypeScript supplies commands, never a parallel board model.
#[wasm_bindgen]
pub fn apply_pcb_edits(source: &str, value: JsValue) -> Result<JsValue, JsValue> {
    let board = PcbDocument::parse(source).map_err(js_error)?;
    let transaction: PcbEditTransaction =
        serde_wasm_bindgen::from_value(value).map_err(js_error)?;
    serde_wasm_bindgen::to_value(&apply_pcb_transaction(&board, &transaction).map_err(js_error)?)
        .map_err(js_error)
}

/// Parses the browser's board view directly from Rust's lossless KiCad document model.
#[wasm_bindgen]
pub fn parse_pcb_document(source: &str) -> Result<JsValue, JsValue> {
    let board = PcbDocument::parse(source).map_err(js_error)?;
    serde_wasm_bindgen::to_value(&PcbBrowserViewV1::from_document(&board, 0, "KiCad PCB"))
        .map_err(js_error)
}

/// Versioned Rust routing preview. Input/output use the schema-1 PCB DTOs.
#[wasm_bindgen]
pub fn pcb_plan_route(value: JsValue) -> Result<JsValue, JsValue> {
    let request: RouteRequest = serde_wasm_bindgen::from_value(value).map_err(js_error)?;
    if request.schema != pcb::PCB_GEOMETRY_SCHEMA {
        return Err(js_error("unsupported PCB geometry schema"));
    }
    serde_wasm_bindgen::to_value(&pcb::plan_route(&request)).map_err(js_error)
}

/// Runs clearance, connectivity, keepout, edge and drill validation in Rust.
#[wasm_bindgen]
pub fn pcb_validate(value: JsValue) -> Result<JsValue, JsValue> {
    let request: PcbGeometryRequest = serde_wasm_bindgen::from_value(value).map_err(js_error)?;
    if request.schema != pcb::PCB_GEOMETRY_SCHEMA {
        return Err(js_error("unsupported PCB geometry schema"));
    }
    serde_wasm_bindgen::to_value(&pcb::validate_board(&request)).map_err(js_error)
}

#[derive(Deserialize)]
struct NetMetricsRequest {
    board: PcbGeometryRequest,
    net: String,
}

#[wasm_bindgen]
pub fn pcb_net_metrics(value: JsValue) -> Result<JsValue, JsValue> {
    let request: NetMetricsRequest = serde_wasm_bindgen::from_value(value).map_err(js_error)?;
    if request.board.schema != pcb::PCB_GEOMETRY_SCHEMA {
        return Err(js_error("unsupported PCB geometry schema"));
    }
    serde_wasm_bindgen::to_value(&pcb::net_metrics(&request.board, &request.net)).map_err(js_error)
}

#[derive(Deserialize)]
struct PlacementRequest {
    schema: u32,
    courtyard: PcbRect,
    keepouts: Vec<PcbRect>,
    occupied: Vec<PcbRect>,
}

#[wasm_bindgen]
pub fn pcb_validate_placement(value: JsValue) -> Result<JsValue, JsValue> {
    let request: PlacementRequest = serde_wasm_bindgen::from_value(value).map_err(js_error)?;
    if request.schema != pcb::PCB_GEOMETRY_SCHEMA {
        return Err(js_error("unsupported PCB geometry schema"));
    }
    serde_wasm_bindgen::to_value(&pcb::placement_violations(
        &request.courtyard,
        &request.keepouts,
        &request.occupied,
    ))
    .map_err(js_error)
}
