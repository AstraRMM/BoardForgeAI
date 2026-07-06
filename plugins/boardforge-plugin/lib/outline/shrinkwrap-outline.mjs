export function expandBox(box, marginMm) {
  return {
    x1: box.x1 - marginMm,
    y1: box.y1 - marginMm,
    x2: box.x2 + marginMm,
    y2: box.y2 + marginMm,
  };
}

export function boxArea(box) {
  return Math.max(0, box.x2 - box.x1) * Math.max(0, box.y2 - box.y1);
}

export function shrinkWrapBox(items, constraints = {}) {
  if (!items.length) throw new Error("Cannot shrink-wrap an empty item set");
  const margin = Number(constraints.componentMarginMm ?? constraints.copperToEdgeMm ?? 2);
  return expandBox({
    x1: Math.min(...items.map((item) => item.x1)),
    y1: Math.min(...items.map((item) => item.y1)),
    x2: Math.max(...items.map((item) => item.x2)),
    y2: Math.max(...items.map((item) => item.y2)),
  }, margin);
}
