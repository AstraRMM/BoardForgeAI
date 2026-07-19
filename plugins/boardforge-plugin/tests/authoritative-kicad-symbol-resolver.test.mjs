import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {extractPinCoordinates,flattenForSchematicCache,resolveAuthoritativeKiCadSymbol} from '../lib/components/authoritative-kicad-symbol-resolver.mjs'

test('resolver expands inherited symbols and returns authoritative pin connection coordinates',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-symbol-resolver-'))
  await writeFile(path.join(root,'Fixture.kicad_sym'),`(kicad_symbol_lib (version 20231120)
    (symbol "Base" (symbol "Base_1_1" (pin input line (at 0 2.54 270) (length 2.54) (name "IN") (number "1"))))
    (symbol "Child" (extends "Base") (symbol "Child_1_1" (pin output line (at 5.08 0 180) (length 2.54) (name "OUT") (number "2")))))`)
  const result=resolveAuthoritativeKiCadSymbol('Fixture:Child',{roots:[root]})
  assert.deepEqual(result.dependencyOrder,['Fixture:Base','Fixture:Child'])
  assert.deepEqual(result.pinMap,{1:'IN',2:'OUT'})
  assert.deepEqual(result.pins.map(p=>[p.number,p.x,p.y,p.rotation]),[['1',0,2.54,270],['2',5.08,0,180]])
  assert.ok(Math.abs(result.pins[0].bodyY-5.08)<1e-9)
})

test('resolver reads the installed KiCad 10 connector symbol with exact pin coordinates',()=>{
  const result=resolveAuthoritativeKiCadSymbol('Connector_Generic:Conn_01x06')
  assert.equal(result.sourceFile.endsWith('Connector_Generic.kicad_sym'),true)
  assert.equal(result.pins.length,6)
  assert.deepEqual(result.pins.map(pin=>pin.number),['1','2','3','4','5','6'])
  assert.ok(result.pins.every(pin=>Number.isFinite(pin.x)&&Number.isFinite(pin.y)))
})

test('resolver fails explicitly when an inherited dependency is absent',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-symbol-missing-parent-'))
  await writeFile(path.join(root,'Broken.kicad_sym'),'(kicad_symbol_lib (version 20231120) (symbol "Child" (extends "Missing")))')
  assert.throws(()=>resolveAuthoritativeKiCadSymbol('Broken:Child',{roots:[root]}),/dependency is missing/)
})

test('MCP1700 inherited symbol flattens to one qualified concrete cache definition',()=>{
  const resolved=resolveAuthoritativeKiCadSymbol('Regulator_Linear:MCP1700x-330xxTT')
  const flattened=flattenForSchematicCache(resolved)
  assert.match(flattened,/^\(symbol "Regulator_Linear:MCP1700x-330xxTT"/)
  assert.doesNotMatch(flattened,/\(extends /)
  assert.match(flattened,/\(property "Value" "MCP1700x-330xxTT"/)
  assert.match(flattened,/\(symbol "MCP1700x-330xxTT_0_1"/)
  assert.deepEqual(extractPinCoordinates(flattened).map(pin=>[pin.number,pin.x,pin.y,pin.rotation]),resolved.pins.map(pin=>[pin.number,pin.x,pin.y,pin.rotation]))
})

test('Schurter 3413 exact fuse symbol binds only the approved R_2512 footprint',()=>{
  const resolved=resolveAuthoritativeKiCadSymbol('BoardForge:Schurter_3413_0218_22')
  assert.deepEqual(resolved.pinMap,{1:'1',2:'2'})
  assert.match(resolved.definitions[0],/\(property "Footprint" "Resistor_SMD:R_2512_6332Metric"/)
  assert.match(resolved.definitions[0],/\(property "ki_fp_filters" "R_2512_6332Metric"/)
})

test('Winbond W25Q128JVS canonical symbol binds the approved 3.9 x 4.9 mm SOIC-8',()=>{
  const resolved=resolveAuthoritativeKiCadSymbol('BoardForge:Winbond_W25Q128JVS_SOIC8_3P9X4P9')
  assert.equal(resolved.sourceFile.includes('winbond-w25q128jv'),true)
  assert.match(resolved.definitions[0],/Package_SO:SOIC-8_3.9x4.9mm_P1.27mm/)
  assert.match(resolved.definitions[0],/ki_fp_filters" "SOIC-8_3.9x4.9mm_P1.27mm/)
  assert.deepEqual(resolved.pinMap,{1:'~CS',2:'DO/IO1',3:'~WP/IO2',4:'GND',5:'DI/IO0',6:'CLK',7:'~HOLD/IO3',8:'VCC'})
})
