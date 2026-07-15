import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateBoardAttempt, summarizeChallenge } from '../lib/phase2c/challenge-benchmark.mjs'

const gates = Object.fromEntries(['requirements','architecture','schematic','pcb','erc','drc','manufacturing','gerbers','drill','bom','cpl','manufacturingZip','rustReparse','kicadValidation','sourceUnchanged','proof'].map(k => [k, true]))
const good = (id='a', totalMs=89_000) => ({ id, designFingerprint:id, supportedClass:true, gates, validation:{ercViolations:0,drcViolations:0}, sourcing:{digikey:{live:true,verifiedAt:'now',fakeStock:false},mouser:{live:true,verifiedAt:'now',fakeStock:false}}, metrics:{boardAreaMm2:1000,componentAreaMm2:300,componentCount:20,routedLengthMm:200}, compactness:{reviewed:true,unusedAreaRatio:.7}, outline:{custom:true,purposeful:true}, timings:{totalMs,scope:'full_end_to_end'}, engineLearning:{fixes:[],regressions:[]} })

test('strict acceptance rejects asserted gates without measured zero ERC/DRC and live sourcing', () => {
  const row = good(); row.validation.drcViolations = 2; row.sourcing.mouser.live = false
  const result = evaluateBoardAttempt(row)
  assert.equal(result.accepted, false)
  assert.deepEqual(result.failures.map(x=>x.code), ['DRC_NOT_ZERO','MOUSER_LIVE_SOURCE_NOT_PROVEN'])
})

test('90-second status distinguishes met, missed, unsupported and unmeasured', () => {
  assert.equal(evaluateBoardAttempt(good('fast')).target90, 'TARGET_MET')
  assert.equal(evaluateBoardAttempt(good('slow', 90_001)).target90, 'TARGET_MISSED')
  const unsupported=good(); unsupported.supportedClass=false; assert.equal(evaluateBoardAttempt(unsupported).target90,'NOT_APPLICABLE_UNSUPPORTED_CLASS')
  const unknown=good(); delete unknown.timings.totalMs; assert.equal(evaluateBoardAttempt(unknown).target90,'NOT_MEASURED')
  const partial=good(); partial.timings.scope='engineering_only'; assert.equal(evaluateBoardAttempt(partial).target90,'NOT_MEASURED_FULL_PIPELINE')
})

test('duplicate designs never inflate accepted count', () => {
  const report=summarizeChallenge([good('same'),good('same')],{targetCount:2})
  assert.equal(report.accepted,1); assert.equal(report.rejected,1)
  assert.equal(report.failureCategories.uniqueness,1)
})

test('challenge closes only at target count and sixty percent purposeful custom outlines', () => {
  const attempts=Array.from({length:5},(_,i)=>good(String(i)))
  attempts[3].outline.custom=false; attempts[4].outline.custom=false
  assert.equal(summarizeChallenge(attempts,{targetCount:5}).status,'CHALLENGE_ACCEPTED')
  attempts[2].outline.custom=false
  assert.equal(summarizeChallenge(attempts,{targetCount:5}).status,'CHALLENGE_IN_PROGRESS')
})

test('density and utilization are derived only from measured geometry', () => {
  const result=evaluateBoardAttempt(good())
  assert.equal(result.metrics.componentDensityPer1000Mm2,20)
  assert.equal(result.metrics.areaUtilization,.3)
  assert.equal(result.metrics.routingDensityMmPerCm2,20)
})
