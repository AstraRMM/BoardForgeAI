import { boxArea, shrinkWrapBox } from "./shrinkwrap-outline.mjs";

export function rectanglePoints(box) {
  return [
    [box.x1, box.y1],
    [box.x2, box.y1],
    [box.x2, box.y2],
    [box.x1, box.y2],
  ];
}

export function chamferedRectanglePoints(box, chamferMm = 3) {
  const c = Math.min(chamferMm, (box.x2 - box.x1) / 3, (box.y2 - box.y1) / 3);
  return [
    [box.x1 + c, box.y1],
    [box.x2 - c, box.y1],
    [box.x2, box.y1 + c],
    [box.x2, box.y2 - c],
    [box.x2 - c, box.y2],
    [box.x1 + c, box.y2],
    [box.x1, box.y2 - c],
    [box.x1, box.y1 + c],
  ];
}

export function mountingEarBoardPoints(box, earInsetMm = 5) {
  const i = Math.min(earInsetMm, (box.x2 - box.x1) / 5, (box.y2 - box.y1) / 5);
  const midY = (box.y1 + box.y2) / 2;
  return [
    [box.x1 + i, box.y1],
    [box.x2 - i, box.y1],
    [box.x2, box.y1 + i],
    [box.x2, midY - i],
    [box.x2 - i * 0.35, midY],
    [box.x2, midY + i],
    [box.x2, box.y2 - i],
    [box.x2 - i, box.y2],
    [box.x1 + i, box.y2],
    [box.x1, box.y2 - i],
    [box.x1, midY + i],
    [box.x1 + i * 0.35, midY],
    [box.x1, midY - i],
    [box.x1, box.y1 + i],
  ];
}

export function generateOutlineCandidate({ mode, items, constraints }) {
  const box = shrinkWrapBox(items, constraints);
  let points;
  if (mode === "OCTAGONAL_BOARD" || mode === "CHAMFERED_RECTANGLE") {
    points = chamferedRectanglePoints(box, constraints.chamferMm ?? 3);
  } else if (mode === "MOUNTING_EAR_BOARD") {
    points = mountingEarBoardPoints(box, constraints.earInsetMm ?? 5);
  } else {
    points = rectanglePoints(box);
  }
  return { mode, box, points, areaMm2: polygonArea(points), boundingAreaMm2: boxArea(box) };
}

export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const x1 = Array.isArray(points[i]) ? points[i][0] : points[i].x;
    const y1 = Array.isArray(points[i]) ? points[i][1] : points[i].y;
    const next = points[(i + 1) % points.length];
    const x2 = Array.isArray(next) ? next[0] : next.x;
    const y2 = Array.isArray(next) ? next[1] : next.y;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}
