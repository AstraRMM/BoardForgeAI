# Board006 THI 2-0511M production-asset blocker

Status: `BLOCKED_NO_EXACT_INSTALLED_KICAD_ASSET`

No production asset was registered. This report does not approve Board006 or authorize generated output.

## Primary-source package evidence

Traco Power's THI 2M data sheet identifies `THI 2-0511M` as a 5 V-input, 5 V / 400 mA-output, 3000 VACrms-isolated converter in a six-lead DIP-16 module.

Primary source: <https://www.tracopower.com/products/thi2m.pdf>

The manufacturer's bottom-view drawing specifies:

- body: 23.8 mm by 13.4 mm, 8.6 mm high;
- square pins: 0.5 mm;
- row spacing: 10.16 mm;
- 2.54 mm pin grid with 15.24 mm between pin 1 and pin 7 positions;
- populated physical pins: 1, 7, 8, 9, 10, and 16 only;
- single-output pin functions: 1 `-Vin`, 7 `NC`, 8 `NC`, 9 `+Vout`, 10 `-Vout`, 16 `+Vin`.

BoardForge's required net projection is therefore:

| Physical pin | Required net |
|---:|---|
| 1 | GND |
| 7 | NC |
| 8 | NC |
| 9 | FIELD_5V |
| 10 | FIELD_GND |
| 16 | 5V |

## Installed KiCad 10 audit

Audited locations:

- `C:\Program Files\KiCad\10.0\share\kicad\symbols\Converter_DCDC.kicad_sym`
- `C:\Program Files\KiCad\10.0\share\kicad\footprints\Converter_DCDC.pretty`
- `C:\Program Files\KiCad\10.0\share\kicad\footprints\Package_DIP.pretty`

No symbol or footprint whose name or metadata contains `THI 2`, `THI2`, or `THI-2` is installed.

Generic DIP-16 footprints are not acceptable substitutes: they contain sixteen physical pads, whereas the manufacturer drawing has six populated lead positions. Registering such a footprint would create ten nonexistent plated holes and would violate exact physical-pin-count projection.

Other installed Traco footprints target different converter families and package drawings. They cannot be reused merely because they share a manufacturer or nominal DIP/SIP description.

## Required unblock work

An exact local asset must be created and independently checked against the manufacturer drawing before registry approval:

1. A six-pin symbol with physical numbers `1, 7, 8, 9, 10, 16` and the source-backed electrical pin functions above.
2. A six-pad THT footprint using only those DIP-16 grid positions, the manufacturer's row/grid dimensions, a source-backed finished-hole choice derived from the 0.5 mm square pin and fabrication allowance, and the exact body/courtyard envelope.
3. Symbol-to-footprint projection tests proving no remapped, missing, or invented pins.
4. KiCad load, courtyard, drill, and DRC validation.
5. Exact-MPN registry approval only after those checks pass.

The manufacturer drawing specifies the pin size, but it does not prescribe a PCB finished-hole diameter. Selecting that fabrication allowance requires an explicit BoardForge footprint policy or manufacturer land-pattern evidence. Until that evidence is adopted and tested, pad and drill geometry remain intentionally unimplemented.
