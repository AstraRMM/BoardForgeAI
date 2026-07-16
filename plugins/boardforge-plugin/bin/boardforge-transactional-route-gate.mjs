import {copyFile,readFile,writeFile} from'node:fs/promises'
import {execFile}from'node:child_process'
import{promisify}from'node:util'
import path from'node:path'
const run=promisify(execFile)
const [baseline,proposal,output]=process.argv.slice(2)
if(!baseline||!proposal||!output)throw new Error('usage: baseline proposal output')
const cli='C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe'
const baselineText=await readFile(baseline,'utf8'),proposalText=await readFile(proposal,'utf8')
const netNames=Object.fromEntries([...proposalText.matchAll(/\(net\s+(\d+)\s+"([^"]+)"\)/g)].map(m=>[m[1],m[2]]))
const baselineNetNames=Object.fromEntries([...baselineText.matchAll(/\(net\s+(\d+)\s+"([^"]+)"\)/g)].map(m=>[m[1],m[2]]))
const baselineForms=[...topForms(baselineText,'segment'),...topForms(baselineText,'via'),...topForms(baselineText,'zone')]
const existing=new Set(baselineForms.map(form=>formKey(normalizeFormNet(form,baselineNetNames))))
const forms=[...topForms(proposalText,'segment'),...topForms(proposalText,'via'),...topForms(proposalText,'zone')].filter(form=>!existing.has(formKey(normalizeFormNet(form,netNames))))
const groups=new Map();for(const form of forms){const token=form.match(/\(net\s+(?:"([^"]+)"|(\d+))\)/),code=token?.[1]||token?.[2];if(!code)continue;const list=groups.get(code)||[];list.push(form);groups.set(code,list)}
let current=baselineText,currentCounts=await drc(baseline,output+'.baseline.json'),accepted=[],rejected=[]
if(currentCounts.violations)throw new Error(`transaction baseline has ${currentCounts.violations} physical violations`)
for(const [code,items]of groups){const name=netNames[code]||code,normalized=items.map(form=>normalizeNet(form,name)),trial=output+`.trial-${safe(name)}.kicad_pcb`;await writeFile(trial,insert(current,normalized));await copyRules(baseline,trial);const counts=await drc(trial,trial+'.drc.json');if(counts.violations===0&&counts.unconnected<currentCounts.unconnected){current=await readFile(trial,'utf8');currentCounts=counts;accepted.push({net:name,...counts,forms:items.length})}else rejected.push({net:name,...counts,forms:items.length,reason:counts.violations?'introduced_physical_drc':counts.unconnected>=currentCounts.unconnected?'did_not_reduce_unconnected':'unknown'})}
await writeFile(output,current);await copyRules(baseline,output);const final=await drc(output,output+'.drc.json');console.log(JSON.stringify({schema:'boardforge.transactional-real-kicad-route-gate.v1',baseline:await drc(baseline,output+'.baseline-final.json'),accepted,rejected,final,output},null,2))
async function drc(p,out){const source=await readFile(p,'utf8'),args=['pcb','drc','--format','json','--units','mm','--severity-all',...(source.includes('(zone ')?['--refill-zones']:[]),'--save-board','--exit-code-violations','--output',out,p];try{await run(cli,args,{maxBuffer:20e6})}catch{}const j=JSON.parse(await readFile(out,'utf8'));return{violations:(j.violations||[]).length,unconnected:(j.unconnected_items||[]).length}}
async function copyRules(from,to){const src=from.replace(/\.kicad_pcb$/,'.kicad_dru'),dst=to.replace(/\.kicad_pcb$/,'.kicad_dru');try{await copyFile(src,dst)}catch{}}
function insert(text,items){return`${text.trimEnd().slice(0,-1)}\n${items.join('\n')}\n)\n`}
function*topForms(text,name){for(let start=text.search(new RegExp(`\\(${name}\\s`));start>=0;){const end=balanced(text,start);yield text.slice(start,end);const next=text.slice(end).search(new RegExp(`\\(${name}\\s`));if(next<0)return;start=end+next}}
function balanced(t,s){let d=0,q=false,e=false;for(let i=s;i<t.length;i++){const c=t[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c==='"')q=false}else if(c==='"')q=true;else if(c==='(')d++;else if(c===')'&&--d===0)return i+1}throw new Error('unbalanced form')}
function safe(s){return String(s).replace(/[^a-z0-9_-]/gi,'_')}
function normalizeNet(form,name){const safeName=String(name).replaceAll('"','');return form.replace(/\(net\s+(?:"[^"]+"|\d+)\)/,`(net "${safeName}")`)}
function normalizeFormNet(form,names){const token=form.match(/\(net\s+(?:"([^"]+)"|(\d+))\)/),name=token?.[1]||names[token?.[2]]||token?.[2];return name?normalizeNet(form,name):form}
function formKey(form){return form.replace(/\(uuid\s+"[^"]+"\)/g,'').replace(/\s+/g,' ').trim()}
