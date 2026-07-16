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

## Installed-family alternative audit

The installed KiCad 10 converter library was also searched for an alternative that could satisfy the Board006 electrical requirement without creating a new footprint. The acceptance threshold used for this audit is 5 V nominal input, 5 V output, at least 400 mA output, and a manufacturer rating of at least 2500 VACrms. A VDC hipot number was not converted to, or treated as, a VACrms working/test rating.

| Candidate | Installed exact symbol/footprint | Manufacturer electrical evidence | Result |
|---|---|---|---|
| Traco `THB10-1211` | Yes: `THB10-1211` / `Converter_DCDC_TRACO_THB10-xxxx_Single_THT` | 9-18 V input, 5.1 V / 1600 mA output, reinforced 4.2 kVAC isolation | Rejected: cannot operate from the required 5 V input |
| Traco `TEA1-0505HI` | Yes: `TEA1-0505HI` / `Converter_DCDC_TRACO_TEA1-xxxxHI_THT` | 4.5-5.5 V input, 5 V / 200 mA output, 4000 VDC isolation | Rejected: only half the 400 mA baseline and the isolation rating is VDC, not VACrms |
| XP Power `IH0505SH` | Yes: `IH0505SH` / `Converter_DCDC_XP_POWER-IHxxxxSH_THT` | 5 V input, dual +/-5 V / +/-200 mA output; installed primary-source link identifies 3000-6000 VDC isolation | Rejected: wrong dual-output topology, insufficient per-output current, and VDC rather than VACrms |
| Murata `MEJ1S0505SC` | Installed exact footprint; matching family symbol data is present in the converter library | 5 V input, 5 V / 200 mA output, 5.2 kVDC isolation | Rejected: only half the 400 mA baseline and VDC rather than VACrms |
| Traco `THI 3-0511` | No exact installed THI symbol/footprint | 4.5-5.5 V input, 5 V / 600 mA output, 4000 VACrms isolation | Rejected: electrical fit, but no exact installed production asset |
| Traco `THM 10-0511` | No exact installed THM symbol/footprint | 4.5-9 V input, 5 V / 2000 mA output, 5000 VAC isolation | Rejected: electrical fit, but no exact installed production asset |

Primary manufacturer sources used for the alternative audit:

- Traco TEA 1HI: <https://www.tracopower.com/tea1hi-datasheet>
- Traco THB 10: <https://www.tracopower.com/products/thb10.pdf>
- Traco THI 3: <https://www.tracopower.com/thi3-datasheet>
- Traco THM 10: <https://www.tracopower.com/thm10-datasheet>
- XP Power IH: <https://www.xppower.com/pdfs/SF_IH.pdf>
- Murata MEJ1: <https://www.murata.com/-/media/webrenewal/products/power/datasheet/kdc_mej1.ashx>

The full installed-symbol description sweep found no 5 V-input / 5 V-output converter with an explicit kVAC rating. Installed converter families that do carry explicit 3.0, 4.2, or 5.0 kVAC descriptions begin at 9 V input or substantially higher input ranges. Therefore no installed alternative clears all three evidence gates: electrical suitability, VACrms isolation, and exact package/pin-map availability.

## Required unblock work

An exact local asset must be created and independently checked against the manufacturer drawing before registry approval:

1. A six-pin symbol with physical numbers `1, 7, 8, 9, 10, 16` and the source-backed electrical pin functions above.
2. A six-pad THT footprint using only those DIP-16 grid positions, the manufacturer's row/grid dimensions, a source-backed finished-hole choice derived from the 0.5 mm square pin and fabrication allowance, and the exact body/courtyard envelope.
3. Symbol-to-footprint projection tests proving no remapped, missing, or invented pins.
4. KiCad load, courtyard, drill, and DRC validation.
5. Exact-MPN registry approval only after those checks pass.

The manufacturer drawing specifies the pin size, but it does not prescribe a PCB finished-hole diameter. Selecting that fabrication allowance requires an explicit BoardForge footprint policy or manufacturer land-pattern evidence. Until that evidence is adopted and tested, pad and drill geometry remain intentionally unimplemented.
