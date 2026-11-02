import {readFileSync, writeFileSync, mkdirSync, copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..');
const repo=resolve(root,'../..');
const dest=resolve(root,'public/submission');
mkdirSync(dest,{recursive:true});
const source=(path,first,last)=>{
  const text=readFileSync(resolve(repo,path),'utf8');
  return {path,first,last,code:text.split(/\r?\n/).slice(first-1,last).join('\n'),sha256:createHash('sha256').update(text).digest('hex')};
};
const tests=JSON.parse(readFileSync(resolve(root,'out/submission-engine-tests-20261102.json'),'utf8'));
if(!tests.success||tests.numFailedTests!==0)throw new Error('A passing actual engine report is required.');
const proof={
  preparedAt:new Date().toISOString(),
  caseRules:source('packages/cases/src/q01GalleryShadow.ts',51,66),
  engine:source('packages/engine/src/round.ts',906,918),
  eventSub:source('apps/server/src/twitch/chatEnvelope.ts',30,52),
  tests:{command:'node node_modules/vitest/vitest.mjs run tests/engine',date:'2 November 2026',passed:tests.numPassedTests,total:tests.numTotalTests,failed:tests.numFailedTests,scope:'Engine logic only; not a new Twitch or OBS run',names:tests.testResults.flatMap(r=>r.assertionResults.map(a=>a.title))},
  obs:{label:'Actual OBS still · 2 November 2026',continuousTake:false,source:'docs/agent-handoff/TWITCH_EVENTSUB_CHECKLIST.md'},
};
for(const [name,file]of [['first-proof','obs-real-chat-first-proof-20261102.png'],['reveal','obs-real-chat-reveal-20261102.png']])copyFileSync(resolve(repo,'.cache',file),resolve(dest,name+'.png'));
writeFileSync(resolve(root,'src/submission/proof.generated.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({passed:proof.tests.passed,total:proof.tests.total,sourceFiles:3,obsStills:2}));
