import fs from "node:fs";

export function parseKiCadSchematicSymbolGraph(schematicText) {
  const symbols = [];
  const instanceRe = /\(symbol\s+\(lib_id\s+"([^"]+)"\)[\s\S]*?\(property\s+"Reference"\s+"([^"]+)"[\s\S]*?\(property\s+"Value"\s+"([^"]*)"[\s\S]*?\(property\s+"Footprint"\s+"([^"]*)"[\s\S]*?\(instances\s+\(project/g;
  for (const match of schematicText.matchAll(instanceRe)) {
    symbols.push({
      libId: match[1],
      reference: match[2],
      value: match[3],
      footprint: match[4],
    });
  }

  const labels = [...schematicText.matchAll(/\((?:global_)?label\s+"([^"]+)"/g)].map((match) => match[1]);

  return {
    symbolCount: symbols.length,
    symbols,
    labels,
    labelSet: new Set(labels),
  };
}

export function readKiCadSchematicSymbolGraph(schematicPath) {
  return parseKiCadSchematicSymbolGraph(fs.readFileSync(schematicPath, "utf8"));
}

export function validateRealSchematicSymbolGraph(graph, requiredNets = []) {
  const missingFootprints = graph.symbols.filter((symbol) => !symbol.footprint);
  const missingValues = graph.symbols.filter((symbol) => !symbol.value);
  const missingRequiredNets = requiredNets.filter((net) => !graph.labelSet.has(net));
  return {
    valid: graph.symbolCount > 0 && missingFootprints.length === 0 && missingValues.length === 0 && missingRequiredNets.length === 0,
    symbolCount: graph.symbolCount,
    missingFootprints,
    missingValues,
    missingRequiredNets,
  };
}

export function compareSchematicGraphToPcbText(graph, pcbText) {
  const missingRefsOnPcb = graph.symbols
    .filter((symbol) => !pcbText.includes(`"Reference" "${symbol.reference}"`))
    .map((symbol) => symbol.reference);
  return {
    consistent: missingRefsOnPcb.length === 0,
    schematicRefs: graph.symbols.map((symbol) => symbol.reference),
    missingRefsOnPcb,
  };
}
