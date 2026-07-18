import { readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_ROOTS = [
  process.env.KICAD10_SYMBOL_DIR,
  "C:\\Program Files\\KiCad\\10.0\\share\\kicad\\symbols",
].filter(Boolean);
const fileCache = new Map();

export function resolveAuthoritativeKiCadSymbol(
  libId,
  { roots = DEFAULT_ROOTS } = {},
) {
  const [library, ...parts] = String(libId || "").split(":"),
    name = parts.join(":");
  if (!library || !name)
    throw new TypeError(
      `KiCad symbol libId must be Library:Name; got ${libId || "empty"}`,
    );
  if (libId === "BoardForge:TPS25750D") {
    const definition = bundledTps25750dDefinition(),
      pins = extractPinCoordinates(definition);
    return {
      schema: "boardforge.authoritative-kicad-symbol.v1",
      libId,
      library,
      name,
      sourceFile: "bundled:ti-tps25750-slvsfr7a-table-6-1",
      dependencyOrder: [libId],
      definitions: [definition],
      pins,
      pinMap: Object.fromEntries(pins.map((pin) => [pin.number, pin.name])),
    };
  }
  if (libId === "BoardForge:ULN2803C") {
    const definition = bundledUln2803cDefinition(),
      pins = extractPinCoordinates(definition);
    return {
      schema: "boardforge.authoritative-kicad-symbol.v1",
      libId,
      library,
      name,
      sourceFile: "bundled:ti-uln2803c-slls544p-figure-5-1-and-dw-package",
      dependencyOrder: [libId],
      definitions: [definition],
      pins,
      pinMap: Object.fromEntries(pins.map((pin) => [pin.number, pin.name])),
    };
  }
  if (libId === "BoardForge:THI_2-0511M") {
    const definition = bundledThi20511mDefinition(),
      pins = extractPinCoordinates(definition);
    return {
      schema: "boardforge.authoritative-kicad-symbol.v1",
      libId,
      library,
      name,
      sourceFile: "bundled:traco-thi2m-datasheet-rev-2024-06-19-page-4",
      dependencyOrder: [libId],
      definitions: [definition],
      pins,
      pinMap: Object.fromEntries(pins.map((pin) => [pin.number, pin.name])),
    };
  }
  const source = loadLibrary(library, roots);
  if (!source)
    throw new Error(`KiCad symbol library is not installed: ${library}`);
  const symbols = indexTopLevelSymbols(source.text),
    root = symbols.get(name);
  if (!root) throw new Error(`KiCad symbol is not installed: ${libId}`);
  const chain = [],
    visiting = new Set();
  function visit(symbolName) {
    if (visiting.has(symbolName))
      throw new Error(
        `KiCad symbol inheritance cycle: ${[...visiting, symbolName].join(" -> ")}`,
      );
    const definition = symbols.get(symbolName);
    if (!definition)
      throw new Error(
        `KiCad symbol dependency is missing: ${library}:${symbolName}`,
      );
    visiting.add(symbolName);
    const parent = definition.match(/\(extends\s+"([^"]+)"\)/)?.[1];
    if (parent) visit(parent);
    visiting.delete(symbolName);
    if (!chain.some((row) => row.name === symbolName))
      chain.push({ name: symbolName, definition });
  }
  visit(name);
  const pins = new Map();
  for (const item of chain)
    for (const pin of extractPinCoordinates(item.definition))
      pins.set(pin.number, pin);
  return {
    schema: "boardforge.authoritative-kicad-symbol.v1",
    libId,
    library,
    name,
    sourceFile: source.file,
    dependencyOrder: chain.map((row) => `${library}:${row.name}`),
    definitions: chain.map((row) => row.definition),
    pins: [...pins.values()],
    pinMap: Object.fromEntries(
      [...pins].map(([number, pin]) => [number, pin.name]),
    ),
  };
}

export function extractPinCoordinates(definition) {
  const pins = [];
  for (
    let start = definition.indexOf("(pin ");
    start >= 0;
    start = definition.indexOf("(pin ", start + 5)
  ) {
    const block = balanced(definition, start);
    if (!block) continue;
    const at = block.match(/\(at\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/),
      number = block.match(/\(number\s+"([^"]+)"/),
      name = block.match(/\(name\s+"([^"]*)"/),
      length = block.match(/\(length\s+(-?[\d.]+)/);
    if (!at || !number) continue;
    const rotation = Number(at[3]),
      lengthMm = Number(length?.[1] || 0),
      r = (rotation * Math.PI) / 180,
      x = Number(at[1]),
      y = Number(at[2]);
    const electricalType = block.match(/^\(pin\s+([^\s()]+)/)?.[1] || "passive";
    pins.push({
      number: number[1],
      name: name?.[1] || "",
      electricalType,
      x,
      y,
      rotation,
      lengthMm,
      bodyX: x + Math.cos(r) * lengthMm,
      bodyY: y - Math.sin(r) * lengthMm,
    });
  }
  return pins;
}

export function bundledTps25750dDefinition({
  qualifiedName = "BoardForge:TPS25750D",
} = {}) {
  const names = [
    "LDO_3V3",
    "ADCIN1",
    "ADCIN2",
    "LDO_1V5",
    "GPIO0",
    "GPIO1",
    "GPIO2",
    "I2Cs_SDA",
    "I2Cs_SCL",
    "I2Cs_IRQ",
    "GND",
    "GND",
    "GPIO11",
    "GND",
    "DRAIN",
    "I2Cm_SDA",
    "I2Cm_SCL",
    "I2Cm_IRQ",
    "GPIO3",
    "PPHV",
    "PPHV",
    "PPHV",
    "VBUS_IN",
    "VBUS_IN",
    "VBUS_IN",
    "GPIO4_USB_P",
    "GPIO5_USB_N",
    "CC1",
    "CC2",
    "DRAIN",
    "GND",
    "VBUS",
    "VBUS",
    "PP5V",
    "PP5V",
    "GPIO7",
    "GPIO6",
    "VIN_3V3",
    "GND",
    "DRAIN",
  ];
  const outputs = new Set([1, 4, 7, 10, 13, 17, 19, 36, 37]),
    inputs = new Set([2, 3, 9, 18, 38]),
    bidirectional = new Set([5, 6, 8, 16, 20, 21, 22, 26, 27, 28, 29]),
    powerIn = new Set([11, 12, 14, 31, 34, 35, 38, 39]),
    powerOut = new Set([1, 4]);
  const type = (n) =>
    powerOut.has(n)
      ? "power_out"
      : powerIn.has(n)
        ? "power_in"
        : bidirectional.has(n)
          ? "bidirectional"
          : outputs.has(n)
            ? "open_collector"
            : inputs.has(n)
              ? "input"
              : "passive";
  const pins = names
    .map((name, index) => {
      const n = index + 1,
        left = n <= 20,
        y = 24.13 - (left ? n - 1 : n - 21) * 2.54,
        x = left ? -12.7 : 12.7,
        rotation = left ? 0 : 180;
      return `\t\t\t(pin ${type(n)} line (at ${x} ${y} ${rotation}) (length 2.54) (name "${name}" (effects (font (size 1 1)))) (number "${n}" (effects (font (size 1 1)))))`;
    })
    .join("\n");
  return `(symbol "${qualifiedName}"\n\t(pin_names (offset 1.016))\n\t(exclude_from_sim no)\n\t(in_bom yes)\n\t(on_board yes)\n\t(property "Reference" "U" (at 0 27.94 0) (effects (font (size 1.27 1.27))))\n\t(property "Value" "TPS25750D" (at 0 -27.94 0) (effects (font (size 1.27 1.27))))\n\t(symbol "TPS25750D_0_1"\n\t\t(rectangle (start -10.16 26.67) (end 10.16 -26.67) (stroke (width .254) (type default)) (fill (type background)))\n${pins}\n\t)\n)`;
}

export function bundledUln2803cDefinition({
  qualifiedName = "BoardForge:ULN2803C",
} = {}) {
  const names = [
    "1B",
    "2B",
    "3B",
    "4B",
    "5B",
    "6B",
    "7B",
    "8B",
    "GND",
    "NC",
    "NC",
    "COM",
    "8C",
    "7C",
    "6C",
    "5C",
    "4C",
    "3C",
    "2C",
    "1C",
  ];
  const pins = names
    .map((name, index) => {
      const n = index + 1,
        left = n <= 10,
        row = left ? n - 1 : 20 - n,
        x = left ? -12.7 : 12.7,
        y = 11.43 - row * 2.54,
        rotation = left ? 0 : 180,
        type =
          n <= 8
            ? "input"
            : n === 9
              ? "power_in"
              : n === 12
                ? "passive"
                : n >= 13
                  ? "open_collector"
                  : "no_connect";
      return `\t\t(pin ${type} line (at ${x} ${y} ${rotation}) (length 2.54) (name "${name}" (effects (font (size 1 1)))) (number "${n}" (effects (font (size 1 1)))))`;
    })
    .join("\n");
  return `(symbol "${qualifiedName}"
\t(pin_names (offset 1.016))
\t(exclude_from_sim no)
\t(in_bom yes)
\t(on_board yes)
\t(property "Reference" "U" (at 0 15.24 0) (effects (font (size 1.27 1.27))))
\t(property "Value" "ULN2803C" (at 0 -15.24 0) (effects (font (size 1.27 1.27))))
\t(property "Footprint" "Package_SO:SOIC-20W_7.5x12.8mm_P1.27mm" (at 0 0 0) (hide yes) (effects (font (size 1.27 1.27))))
\t(property "Datasheet" "https://www.ti.com/lit/ds/symlink/uln2803c.pdf" (at 0 0 0) (hide yes) (effects (font (size 1.27 1.27))))
\t(symbol "ULN2803C_0_1"
\t\t(rectangle (start -10.16 13.97) (end 10.16 -13.97) (stroke (width .254) (type default)) (fill (type background)))
${pins}
\t)
)`;
}

export function bundledThi20511mDefinition({
  qualifiedName = "BoardForge:THI_2-0511M",
} = {}) {
  const pins = [
    ["1", "-Vin (GND)", "power_in", -10.16, 7.62, 0],
    ["7", "NC", "no_connect", -10.16, 2.54, 0],
    ["8", "NC", "no_connect", -10.16, -2.54, 0],
    ["9", "+Vout", "power_out", 10.16, -2.54, 180],
    // The output return is not a driven KiCad power source. Marking it
    // passive preserves the real pin while avoiding an invented second
    // source when FIELD_GND is explicitly power-flagged by the design.
    ["10", "-Vout", "passive", 10.16, 2.54, 180],
    ["16", "+Vin", "power_in", 10.16, 7.62, 180],
  ].map(([number, name, type, x, y, rotation]) =>
    `\t\t(pin ${type} line (at ${x} ${y} ${rotation}) (length 2.54) (name "${name}" (effects (font (size 1 1)))) (number "${number}" (effects (font (size 1 1)))))`,
  ).join("\n");
  return `(symbol "${qualifiedName}"
\t(pin_names (offset 1.016))
\t(exclude_from_sim no)
\t(in_bom yes)
\t(on_board yes)
\t(property "Reference" "U" (at 0 12.7 0) (effects (font (size 1.27 1.27))))
\t(property "Value" "THI 2-0511M" (at 0 -7.62 0) (effects (font (size 1.27 1.27))))
\t(property "Footprint" "BoardForge:THI_2-0511M_DIP16_6Lead" (at 0 0 0) (hide yes) (effects (font (size 1.27 1.27))))
\t(property "Datasheet" "https://www.tracopower.com/products/thi2m.pdf" (at 0 0 0) (hide yes) (effects (font (size 1.27 1.27))))
\t(symbol "THI_2-0511M_0_1"
\t\t(rectangle (start -7.62 10.16) (end 7.62 -5.08) (stroke (width .254) (type default)) (fill (type background)))
${pins}
\t)
)`;
}

export function flattenForSchematicCache(
  resolved,
  { qualifiedName = resolved?.libId } = {},
) {
  if (!resolved?.definitions?.length || !resolved?.name || !qualifiedName)
    throw new TypeError("A resolved authoritative KiCad symbol is required");
  const baseName = resolved.dependencyOrder[0].split(":").at(-1),
    targetName = resolved.name;
  let flattened = resolved.definitions[0];
  for (const child of resolved.definitions.slice(1)) {
    for (const form of directChildForms(child)) {
      if (form.startsWith("(extends ")) continue;
      const property = form.match(/^\(property\s+"([^"]+)"/);
      if (property)
        flattened = replaceDirectProperty(flattened, property[1], form);
    }
  }
  // Cached schematic symbols are concrete: inherited unit geometry is renamed
  // to the selected child and the library-qualified id applies only to the root.
  flattened = flattened.replaceAll(`"${baseName}_`, `"${targetName}_`);
  flattened = flattened.replace(
    /^\(symbol\s+"[^"]+"/,
    `(symbol "${qualifiedName}"`,
  );
  return flattened;
}

function loadLibrary(library, roots) {
  for (const root of roots) {
    const file = path.join(root, `${library}.kicad_sym`);
    if (fileCache.has(file)) return fileCache.get(file);
    try {
      const value = { file, text: readFileSync(file, "utf8") };
      fileCache.set(file, value);
      return value;
    } catch {
      fileCache.set(file, null);
    }
  }
  return null;
}
function indexTopLevelSymbols(text) {
  const result = new Map();
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === "(") {
      if (depth === 1 && text.startsWith("(symbol ", i)) {
        const block = balanced(text, i),
          name = block?.match(/^\(symbol\s+"([^"]+)"/)?.[1];
        if (block && name) {
          result.set(name, block);
          i += block.length - 1;
          continue;
        }
      }
      depth++;
    } else if (ch === ")") depth--;
  }
  return result;
}
function balanced(text, start) {
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}
function directChildForms(definition) {
  const forms = [];
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = 0; i < definition.length; i++) {
    const ch = definition[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === "(") {
      if (depth === 1) {
        const form = balanced(definition, i);
        if (form) {
          forms.push(form);
          i += form.length - 1;
          continue;
        }
      }
      depth++;
    } else if (ch === ")") depth--;
  }
  return forms;
}
function replaceDirectProperty(definition, name, replacement) {
  for (const form of directChildForms(definition)) {
    const match = form.match(/^\(property\s+"([^"]+)"/);
    if (match?.[1] === name) return definition.replace(form, replacement);
  }
  const end = definition.lastIndexOf(")");
  return `${definition.slice(0, end)}\n\t${replacement}\n${definition.slice(end)}`;
}
