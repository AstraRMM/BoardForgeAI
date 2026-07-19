/* tslint:disable */
/* eslint-disable */

/**
 * Rust-owned PCB transaction boundary. TypeScript supplies commands, never a parallel board model.
 */
export function apply_pcb_edits(source: string, value: any): any;

export function close_outline(value: any): any;

export function hit_test_segment(value: any): boolean;

/**
 * Parses the browser's board view directly from Rust's lossless KiCad document model.
 */
export function parse_pcb_document(source: string): any;

export function pcb_net_metrics(value: any): any;

/**
 * Versioned Rust routing preview. Input/output use the schema-1 PCB DTOs.
 */
export function pcb_plan_route(value: any): any;

/**
 * Runs clearance, connectivity, keepout, edge and drill validation in Rust.
 */
export function pcb_validate(value: any): any;

export function pcb_validate_placement(value: any): any;

export function polygon_metrics(value: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly apply_pcb_edits: (a: number, b: number, c: any) => [number, number, number];
    readonly close_outline: (a: any) => [number, number, number];
    readonly hit_test_segment: (a: any) => [number, number, number];
    readonly parse_pcb_document: (a: number, b: number) => [number, number, number];
    readonly pcb_net_metrics: (a: any) => [number, number, number];
    readonly pcb_plan_route: (a: any) => [number, number, number];
    readonly pcb_validate: (a: any) => [number, number, number];
    readonly pcb_validate_placement: (a: any) => [number, number, number];
    readonly polygon_metrics: (a: any) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
