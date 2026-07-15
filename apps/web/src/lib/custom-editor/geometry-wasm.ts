export type GeometryPoint = Readonly<{ x: number; y: number }>
export type GeometryMetrics = Readonly<{ area: number; perimeter: number }>
type WasmGeometryModule = {
  default: (input?: string | URL | Request) => Promise<unknown>
  polygon_metrics: (polygon: { exterior: readonly GeometryPoint[]; holes: readonly GeometryPoint[][] }) => GeometryMetrics
  close_outline: (points: readonly GeometryPoint[]) => { exterior: GeometryPoint[]; holes: GeometryPoint[][] }
}

let modulePromise: Promise<WasmGeometryModule> | null = null

/** Loads the checked-in wasm-pack browser artifact without coupling Turbopack to generated code. */
export async function loadRustGeometry(): Promise<WasmGeometryModule> {
  if (!modulePromise) {
    const importModule = new Function('path', 'return import(path)') as (path: string) => Promise<WasmGeometryModule>
    modulePromise = importModule('/wasm/boardforge_wasm.js').then(async (module) => {
      await module.default('/wasm/boardforge_wasm_bg.wasm')
      return module
    })
  }
  return modulePromise
}

export async function rustPolygonMetrics(points: readonly GeometryPoint[]): Promise<GeometryMetrics> {
  const module = await loadRustGeometry()
  return module.polygon_metrics({ exterior: points, holes: [] })
}

export async function rustCloseOutline(points: readonly GeometryPoint[]) {
  const module = await loadRustGeometry()
  return module.close_outline(points)
}
