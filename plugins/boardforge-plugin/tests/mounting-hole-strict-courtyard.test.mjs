import assert from 'node:assert/strict'
import test from 'node:test'
import { markMountingHolesBoardOnly } from '../lib/real-board-proof.mjs'

test('generated mounting holes carry board-only metadata and a real F.CrtYd',()=>{
  const pcb=`(kicad_pcb
  (footprint "MountingHole_2.4mm_M2" (layer "F.Cu")
    (property "Reference" "H1")
    (pad "" np_thru_hole circle (at 0 0) (size 3.8 3.8) (drill 2.4) (layers "*.Cu" "*.Mask"))
  )
)`
  const result=markMountingHolesBoardOnly(pcb)
  assert.match(result,/\(attr board_only\)/)
  assert.match(result,/\(fp_circle \(center 0 0\) \(end 2\.15 0\)[\s\S]*\(layer "F\.CrtYd"/)
  assert.equal((result.match(/\(layer "F\.CrtYd"/g)||[]).length,1,'repair must be idempotent')
  assert.equal(markMountingHolesBoardOnly(result),result)
})
