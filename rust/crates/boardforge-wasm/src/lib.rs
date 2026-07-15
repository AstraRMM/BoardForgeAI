use boardforge_geometry::{fill_closure, Point, Polygon, Segment};
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
