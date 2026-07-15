"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  diffSchematic,
  fixtureFromJson,
  moveSelection,
  nextId,
  rotateSelection,
  sampleSchematic,
  type Id,
  type Point,
  type SchematicDocument,
} from "../../lib/schematic-editor/model";
import {
  buildApprovedTransaction,
  createSchematicSaveClient,
  type ApprovedSchematicTransaction,
  type CandidateReport,
} from "../../lib/schematic-editor/save-client";
import styles from "./BrowserSchematicEditor.module.css";
type Tool = "select" | "pan" | "wire" | "label";
type View = { zoom: number; x: number; y: number };
const DEFAULT_SOURCE = String.raw`C:\Users\luifi\Desktop\BoardForge_Dev\boardforge-ai\fixtures\kicad-roundtrip\m3\05-simple-mcu\simple-mcu.kicad_sch`;
const DEFAULT_SOURCE_HASH =
  "762b28f64563a89364d9def4b253d35ebeeef6b3c83d79b7000c136906c95feb";
export function BrowserSchematicEditor() {
  const [baseline, setBaseline] = useState(() =>
      structuredClone(sampleSchematic),
    ),
    [doc, setDoc] = useState(() =>
      fixtureFromJson(JSON.stringify(sampleSchematic)),
    ),
    [history, setHistory] = useState<SchematicDocument[]>([]),
    [future, setFuture] = useState<SchematicDocument[]>([]);
  const [tool, setTool] = useState<Tool>("select"),
    [selected, setSelected] = useState<Set<Id>>(new Set()),
    [view, setView] = useState<View>({ zoom: 8, x: 80, y: 80 }),
    [grid, setGrid] = useState(true),
    [wireStart, setWireStart] = useState<Point | null>(null),
    [status, setStatus] = useState("Loaded local schematic fixture."),
    [approval, setApproval] = useState<ApprovedSchematicTransaction | null>(
      null,
    ),
    [candidate, setCandidate] = useState<CandidateReport | null>(null),
    [requesting, setRequesting] = useState(false),
    [sourcePath, setSourcePath] = useState(DEFAULT_SOURCE),
    [sourceHash, setSourceHash] = useState(DEFAULT_SOURCE_HASH);
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<{
      screen: Point;
      world: Point;
      view: View;
      moving: boolean;
    } | null>(null);
  const changes = useMemo(() => diffSchematic(baseline, doc), [baseline, doc]);
  const commit = useCallback(
    (next: SchematicDocument, message: string) => {
      setHistory((h) => [...h, doc]);
      setFuture([]);
      setDoc(next);
      setApproval(null);
      setCandidate(null);
      setStatus(message);
    },
    [doc],
  );
  const world = (e: { clientX: number; clientY: number }) => {
    const r = svg.current!.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - view.x) / view.zoom,
      y: (e.clientY - r.top - view.y) / view.zoom,
    };
  };
  const snap = (p: Point) => ({
    x: Math.round(p.x / 2.54) * 2.54,
    y: Math.round(p.y / 2.54) * 2.54,
  });
  const choose = (id: Id, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelected((s) => {
      const n = new Set(e.shiftKey ? s : []);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const down = (e: React.PointerEvent) => {
    svg.current?.setPointerCapture(e.pointerId);
    const p = snap(world(e));
    if (tool === "wire") {
      if (!wireStart) setWireStart(p);
      else {
        commit(
          {
            ...doc,
            wires: [
              ...doc.wires,
              { id: nextId("wire", doc), start: wireStart, end: p },
            ],
          },
          "Wire placed; review diff before approval.",
        );
        setWireStart(null);
      }
      return;
    }
    if (tool === "label") {
      const text = window.prompt("Net label");
      if (text)
        commit(
          {
            ...doc,
            labels: [...doc.labels, { id: nextId("label", doc), ...p, text }],
          },
          "Label placed; review diff before approval.",
        );
      return;
    }
    if (tool === "select" && !(e.target as Element).closest("[data-object-id]"))
      setSelected(new Set());
    drag.current = {
      screen: { x: e.clientX, y: e.clientY },
      world: p,
      view,
      moving: tool === "select" && selected.size > 0,
    };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d && (tool === "pan" || e.buttons === 4))
      setView({
        ...d.view,
        x: d.view.x + e.clientX - d.screen.x,
        y: d.view.y + e.clientY - d.screen.y,
      });
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d?.moving) {
      const p = snap(world(e)),
        delta = { x: p.x - d.world.x, y: p.y - d.world.y };
      if (delta.x || delta.y)
        commit(
          moveSelection(doc, selected, delta),
          "Selection moved; candidate not yet approved.",
        );
    }
    drag.current = null;
  };
  const wheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const p = world(e),
      zoom = Math.max(
        2,
        Math.min(30, view.zoom * (e.deltaY < 0 ? 1.15 : 0.87)),
      ),
      r = svg.current!.getBoundingClientRect();
    setView({
      zoom,
      x: e.clientX - r.left - p.x * zoom,
      y: e.clientY - r.top - p.y * zoom,
    });
  };
  const undo = useCallback(
    () =>
      setHistory((h) => {
        if (!h.length) return h;
        setFuture((f) => [doc, ...f]);
        setDoc(h.at(-1)!);
        setApproval(null);
        setCandidate(null);
        return h.slice(0, -1);
      }),
    [doc],
  );
  const redo = useCallback(
    () =>
      setFuture((f) => {
        if (!f.length) return f;
        setHistory((h) => [...h, doc]);
        setDoc(f[0]);
        setApproval(null);
        setCandidate(null);
        return f.slice(1);
      }),
    [doc],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key.toLowerCase() === "r" && selected.size)
        commit(
          rotateSelection(doc, selected),
          "Selection rotated; candidate not yet approved.",
        );
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [commit, doc, redo, selected, undo]);
  const active = [...selected][0],
    symbol = doc.symbols.find((x) => x.id === active),
    label = doc.labels.find((x) => x.id === active);
  const setProperty = (
    key: "reference" | "value" | "footprint",
    value: string,
  ) =>
    commit(
      {
        ...doc,
        symbols: doc.symbols.map((s) =>
          s.id === active ? { ...s, [key]: value } : s,
        ),
      },
      `${key} changed; candidate not yet approved.`,
    );
  const client = useMemo(() => createSchematicSaveClient(), []);
  const deleteSelected = () =>
    commit(
      {
        ...doc,
        wires: doc.wires.filter((wire) => !selected.has(wire.id)),
        labels: doc.labels.filter((item) => !selected.has(item.id)),
      },
      "Selected wires and labels deleted; candidate not yet approved.",
    );
  const approve = () => {
    if (!changes.length) return;
    try {
      setApproval(
        buildApprovedTransaction(
          sourcePath,
          sourcePath.replace(/\\[^\\]+$/, ""),
          baseline,
          doc,
          sourceHash,
        ),
      );
      setStatus("Transaction approved. No KiCad file has been overwritten.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unsupported transaction change.",
      );
    }
  };
  const save = async () => {
    if (!approval) return;
    setRequesting(true);
    setStatus("Sending approved transaction to local engine…");
    try {
      const result = await client.create(approval);
      setCandidate(result);
      setStatus(`Candidate ${result.state}: ${result.summary}`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Candidate request failed; no files were changed.",
      );
    } finally {
      setRequesting(false);
    }
  };
  const refresh = async () => {
    if (!candidate) return;
    setRequesting(true);
    try {
      const current = await client.status(candidate.id),
        result =
          current.state === "ready" || current.state === "blocked"
            ? await client.report(candidate.id)
            : current;
      setCandidate(result);
      setStatus(`Candidate ${result.state}: ${result.summary}`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Status request failed.",
      );
    } finally {
      setRequesting(false);
    }
  };
  const discard = async () => {
    if (!candidate) return;
    setRequesting(true);
    try {
      const result = await client.discard(candidate.id);
      setCandidate(result);
      setApproval(null);
      setStatus("Candidate discarded. Source files remain unchanged.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Discard failed.");
    } finally {
      setRequesting(false);
    }
  };
  const promote = async () => {
    if (!candidate || candidate.state !== "ready") return;
    setRequesting(true);
    setStatus("Requesting explicit local promotion…");
    try {
      const result = await client.promoteLocal(candidate.id);
      setCandidate(result);
      if (result.state === "promoted") {
        setBaseline(structuredClone(doc));
        setApproval(null);
        setHistory([]);
        setFuture([]);
      }
      setStatus(`Candidate ${result.state}: ${result.summary}`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Promotion failed; no files were changed.",
      );
    } finally {
      setRequesting(false);
    }
  };
  return (
    <div className={styles.shell}>
      <header>
        <strong>Schematic workspace</strong>
        <span>{doc.title}</span>
        <b>Browser fixture · no direct file writes</b>
      </header>
      <nav aria-label="Schematic tools">
        {(["select", "pan", "wire", "label"] as Tool[]).map((t) => (
          <button
            key={t}
            aria-pressed={tool === t}
            onClick={() => {
              setTool(t);
              setWireStart(null);
            }}
          >
            {t}
          </button>
        ))}
        <i />
        <button
          onClick={() =>
            commit(
              rotateSelection(doc, selected),
              "Selection rotated; candidate not yet approved.",
            )
          }
          disabled={!selected.size}
        >
          Rotate
        </button>
        <button
          onClick={deleteSelected}
          disabled={
            !doc.wires.some((wire) => selected.has(wire.id)) &&
            !doc.labels.some((item) => selected.has(item.id))
          }
        >
          Delete selected
        </button>
        <button onClick={undo} disabled={!history.length}>
          Undo
        </button>
        <button onClick={redo} disabled={!future.length}>
          Redo
        </button>
        <button onClick={() => setGrid((v) => !v)} aria-pressed={grid}>
          Grid
        </button>
        <button onClick={() => setView({ zoom: 8, x: 80, y: 80 })}>Fit</button>
        <button
          onClick={() =>
            setView((v) => ({ ...v, zoom: Math.min(30, v.zoom * 1.2) }))
          }
        >
          +
        </button>
        <button
          onClick={() =>
            setView((v) => ({ ...v, zoom: Math.max(2, v.zoom / 1.2) }))
          }
        >
          −
        </button>
        <output>{Math.round((view.zoom / 8) * 100)}%</output>
      </nav>
      <aside className={styles.tree}>
        <h2>Fixture</h2>
        <p>{doc.symbols.length} symbols</p>
        <p>{doc.wires.length} wires</p>
        <p>{doc.labels.length} labels</p>
        <h2>Objects</h2>
        {doc.symbols.map((s) => (
          <button key={s.id} onClick={() => setSelected(new Set([s.id]))}>
            {s.reference} · {s.value}
          </button>
        ))}
      </aside>
      <main className={styles.canvas}>
        <svg
          ref={svg}
          role="application"
          aria-label="Interactive schematic editor"
          tabIndex={0}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onWheel={wheel}
        >
          <defs>
            <pattern
              id="schgrid"
              width={view.zoom * 2.54}
              height={view.zoom * 2.54}
              patternUnits="userSpaceOnUse"
              x={view.x}
              y={view.y}
            >
              <circle cx="1" cy="1" r=".65" fill="#334155" />
            </pattern>
          </defs>
          {grid && <rect width="100%" height="100%" fill="url(#schgrid)" />}
          <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            {doc.wires.map((w) => (
              <line
                data-object-id={w.id}
                key={w.id}
                x1={w.start.x}
                y1={w.start.y}
                x2={w.end.x}
                y2={w.end.y}
                className={
                  selected.has(w.id) ? styles.selectedWire : styles.wire
                }
                onPointerDown={(e) => choose(w.id, e)}
              />
            ))}
            {wireStart && (
              <circle
                cx={wireStart.x}
                cy={wireStart.y}
                r=".8"
                className={styles.anchor}
              />
            )}{" "}
            {doc.labels.map((l) => (
              <text
                data-object-id={l.id}
                key={l.id}
                x={l.x}
                y={l.y - 1}
                className={
                  selected.has(l.id) ? styles.selectedText : styles.label
                }
                onPointerDown={(e) => choose(l.id, e)}
              >
                {l.text}
              </text>
            ))}
            {doc.symbols.map((s) => (
              <g
                data-object-id={s.id}
                key={s.id}
                transform={`translate(${s.x} ${s.y}) rotate(${s.rotation})`}
                className={selected.has(s.id) ? styles.selectedSymbol : ""}
                onPointerDown={(e) => choose(s.id, e)}
              >
                <rect
                  x="-6"
                  y="-5"
                  width="12"
                  height="10"
                  className={styles.symbol}
                />
                {s.pins.map((p) => (
                  <circle
                    key={p.id}
                    cx={p.x - s.x}
                    cy={p.y - s.y}
                    r=".45"
                    className={styles.pin}
                  />
                ))}
                <text y="-6">{s.reference}</text>
                <text y="1">{s.value}</text>
              </g>
            ))}
          </g>
        </svg>
      </main>
      <aside className={styles.inspector}>
        <h2>Properties</h2>
        <label>
          Source path
          <input
            value={sourcePath}
            onChange={(event) => setSourcePath(event.target.value)}
          />
        </label>
        <label>
          Source SHA-256
          <input
            value={sourceHash}
            onChange={(event) => setSourceHash(event.target.value)}
          />
        </label>
        {symbol ? (
          <>
            <strong>{symbol.reference}</strong>
            {(["reference", "value", "footprint"] as const).map((k) => (
              <label key={k}>
                {k}
                <input
                  value={symbol[k]}
                  onChange={(e) => setProperty(k, e.target.value)}
                />
              </label>
            ))}
            <label>
              Rotation
              <input value={symbol.rotation} readOnly />
            </label>
          </>
        ) : label ? (
          <label>
            Label text
            <input
              value={label.text}
              onChange={(event) =>
                commit(
                  {
                    ...doc,
                    labels: doc.labels.map((item) =>
                      item.id === label.id
                        ? { ...item, text: event.target.value }
                        : item,
                    ),
                  },
                  "Label text changed; candidate not yet approved.",
                )
              }
            />
          </label>
        ) : (
          <p>
            Select a symbol. Shift-click to select multiple; drag to move; press
            R to rotate.
          </p>
        )}
        <h2>Change preview</h2>
        {changes.length ? (
          changes.map((c) => (
            <div
              className={styles.change}
              key={`${c.kind}-${c.objectType}-${c.id}`}
            >
              <b>{c.kind}</b> {c.id}
              <small>{c.summary}</small>
            </div>
          ))
        ) : (
          <p>No candidate changes.</p>
        )}
        <button onClick={approve} disabled={!changes.length || requesting}>
          Approve transaction
        </button>
        <button
          className={styles.save}
          onClick={save}
          disabled={!approval || requesting || !!candidate}
        >
          Send to local engine
        </button>
        {candidate && (
          <section aria-label="Candidate report">
            <h2>Candidate report</h2>
            <p>
              <b>{candidate.state}</b> · {candidate.progress}%
            </p>
            <progress value={candidate.progress} max="100" />
            <p>{candidate.summary}</p>
            {candidate.warnings.map((x, i) => (
              <small key={`w${i}`}>Warning: {x}</small>
            ))}
            {candidate.errors.map((x, i) => (
              <small key={`e${i}`}>Error: {x}</small>
            ))}
            <button onClick={refresh} disabled={requesting}>
              Refresh report
            </button>
            <button
              onClick={promote}
              disabled={requesting || candidate.state !== "ready"}
            >
              Promote to local project
            </button>
            <button
              onClick={discard}
              disabled={
                requesting ||
                candidate.state === "promoted" ||
                candidate.state === "discarded"
              }
            >
              Discard candidate
            </button>
          </section>
        )}
        <small>
          Approval creates a versioned candidate transaction. Only explicit
          promotion through the paired local engine may write a validated local
          project.
        </small>
      </aside>
      <footer>
        <span>{status}</span>
        <span>{selected.size} selected</span>
        <span>Grid 2.54 mm</span>
      </footer>
    </div>
  );
}
