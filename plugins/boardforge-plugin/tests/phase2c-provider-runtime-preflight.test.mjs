import test from 'node:test'
import assert from 'node:assert/strict'
import { buildProviderRuntimePreflight, classifyProviderRuntime, runDigiKeyRuntimeProbe } from '../lib/phase2c/provider-runtime-preflight.mjs'

const now='2026-07-15T12:00:00.000Z'
test('configuration cannot masquerade as live provider proof',()=>{
  const row=classifyProviderRuntime({provider:'mouser',configured:true,authenticated:true},{now:new Date(now)})
  assert.equal(row.status,'AUTHENTICATED_NOT_LIVE_VERIFIED'); assert.equal(row.ready,false)
})
test('only fresh successful runtime requests become live verified',()=>{
  const good=classifyProviderRuntime({provider:'digikey',configured:true,authenticated:true,request:{attempted:true,ok:true,observedAt:now,httpStatus:200,latencyMs:42,evidenceKind:'exact_mpn_lookup'}},{now:new Date(now)})
  assert.equal(good.status,'LIVE_VERIFIED'); assert.equal(good.ready,true)
  const stale=classifyProviderRuntime({provider:'digikey',configured:true,authenticated:true,request:{attempted:true,ok:true,observedAt:'2026-07-15T11:00:00.000Z'}},{now:new Date(now)})
  assert.equal(stale.status,'STALE_OR_INVALID_LIVE_EVIDENCE')
})
test('preflight output contains operational metadata but no credential values',()=>{
  const request={attempted:true,ok:true,observedAt:now,httpStatus:200,latencyMs:1,evidenceKind:'exact_mpn_lookup'}
  const report=buildProviderRuntimePreflight({generatedAt:now,digikey:{configured:true,authenticated:true,request,clientSecret:'never-print'},mouser:{configured:true,authenticated:true,request,apiKey:'never-print'}})
  assert.equal(report.status,'PROVIDERS_READY'); assert.equal(report.containsSecrets,false)
  const text=JSON.stringify(report); assert.doesNotMatch(text,/never-print|clientSecret|apiKey/)
})
test('failed request records bounded error code without response body',()=>{
  const row=classifyProviderRuntime({provider:'mouser',configured:true,authenticated:true,request:{attempted:true,ok:false,httpStatus:401,errorCode:'HTTP_401',responseBody:'secret'}})
  assert.equal(row.status,'LIVE_REQUEST_FAILED'); assert.equal(row.runtime.errorCode,'HTTP_401')
  assert.doesNotMatch(JSON.stringify(row),/responseBody|secret/)
})
test('DigiKey runtime probe requires a fresh exact ProductInformation V4 MPN result', async()=>{
  const authClient={healthCheck:async()=>({configured:true,authenticated:true})}
  const apiClient={request:async(pathname,request)=>{
    assert.equal(pathname,'/products/v4/search/keyword'); assert.equal(request.body.Keywords,'RC0603FR-0710KL')
    return {Products:[{ManufacturerProductNumber:'RC0603FR-0710KL',DigiKeyProductNumber:'311-10.0KHRCT-ND'}]}
  }}
  const result=await runDigiKeyRuntimeProbe({authClient,apiClient})
  assert.equal(result.request.ok,true); assert.equal(result.request.evidenceKind,'digikey_productinformation_v4_exact_mpn')
  assert.doesNotMatch(JSON.stringify(result),/accessToken|clientSecret|responseBody/)
})
