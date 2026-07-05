export function scoreFootprintConfidence({ symbolPresent=true, footprintPresent=true, packageMatch='unknown' }={}){ let score=0; if(symbolPresent)score+=35; if(footprintPresent)score+=45; if(packageMatch==='match')score+=20;  return {score, status: score>=85?'HIGH_CONFIDENCE':score>=60?'REVIEW_RECOMMENDED':'BLOCKED_FOOTPRINT_CONFIDENCE'} }

