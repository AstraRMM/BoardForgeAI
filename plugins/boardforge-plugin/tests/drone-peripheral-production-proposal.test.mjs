import test from 'node:test'
import assert from 'node:assert/strict'
import manifest from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import {catalogDefinition,validateCatalogSemanticTopology} from '../lib/phase2c/catalog-production-engine.mjs'
import {dronePeripheralProductionProposal as proposal,validateFlightControllerStackProductionProposal as validate} from '../lib/phase2c/templates/drone-peripheral.mjs'

test('Board021 generic controller cannot pass as a flight-stack peripheral',()=>{
  const gate=validateCatalogSemanticTopology(catalogDefinition(manifest.boards[20],20))
  assert.equal(gate.ok,false)
  for(const code of ['drone-stack-connectors-missing','drone-peripheral-ports-missing','drone-port-protection-missing','drone-power-rail-distribution-missing','drone-power-monitoring-missing','drone-level-translation-missing','drone-port-ground-return-evidence-missing','drone-stack-pin-map-evidence-missing','drone-peripheral-category-mapped-to-can-controller'])assert.ok(gate.errors.includes(code),code)
})

test('Board021 exact production contract remains fail closed',()=>{
  const gate=validate(proposal)
  assert.equal(gate.ok,false)
  assert.ok(gate.errors.includes('flight-controller-exact-assets-unapproved'))
  for(const code of ['flight-controller-performance-envelope-undeclared','flight-controller-interface-envelope-undeclared','flight-controller-power-envelope-undeclared','flight-controller-sensor-envelope-undeclared','flight-controller-failsafe-envelope-undeclared'])assert.ok(gate.errors.includes(code),code)
  assert.deepEqual(gate.blockedRefs,['U_MCU','U_IMU','U_BARO','P_BARO','J_MOTOR','J_RX','J_GNSS','J_TELEM','J_DEBUG','P_SIG','U_CURRENT','P_POWER','U_SAFE'])
  for(const ref of ['F_IN','Q_REV','D_IN','C_DEC'])assert.equal(proposal.bom.find(x=>x.ref===ref).status,'APPROVED_EXACT_ASSET',ref)
})

test('Board021 purposeful stack outline and mounting intent stay under cap',()=>{
  const gate=validate(proposal),features=proposal.outline.purposefulFeatures
  assert.equal(gate.areaMm2,1993)
  assert.ok(gate.areaMm2<=proposal.maximumAreaMm2)
  assert.equal(features.stackHolePatternMm,30.5)
  assert.equal(features.mountingHoleCount,4)
  assert.equal(features.imuCenterKeepoutRequired,true)
  assert.deepEqual(features.connectorEdges,['front','rear','left','right'])
  assert.equal(features.vibrationIsolationEvidenceRequired,true)
})

test('Board021 requires pin-map power sensor failsafe and production evidence',()=>{
  for(const key of ['flightMcuPerformanceVerified','imuNoiseOrientationVerified','barometerEnvironmentVerified','stackStandardPinMapVerified','motorMappingsVerified','receiverMappingFailsafeVerified','gnssTelemetryDebugMappingsVerified','voltageDomainsLevelProtectionVerified','railNoiseTransientBudgetVerified','backfeedFaultContainmentVerified','watchdogBrownoutFailsafeVerified','motorDisarmedDefaultVerified','stackMountVibrationVerified','productionSensorMotorFailsafeTestVerified']){
    assert.ok(proposal.evidenceRequired.includes(key),key)
    assert.ok(validate(proposal).errors.includes(`flight-controller-evidence-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}-missing`),key)
  }
})
