import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolvedDecisionIds, checkHarvest } from '../src/scripts/harvest.js';
function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cg-decisions-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const records=path.join(dir,'decisions'); fs.mkdirSync(records);
  const write=(name,record)=>fs.writeFileSync(path.join(records,name),JSON.stringify(record));
  return {dir,records,write};
}
test('compact decision evidence excludes pending records and survives individual cleanup',t=>{
  const {dir,records,write}=fixture(t);
  write('_sequence.json',{DU:101,DA:0});
  write('DU-101.json',{id:'DU-101',status:'resolved',scope:'export',decision:'Managers only',authority:'Owner approved managers only',response:{text:'Managers only',actor:'owner'}});
  write('DU-100.json',{id:'DU-100',status:'pending',scope:'export',decision:'Retention period'});
  assert.deepEqual([...resolvedDecisionIds(records)],['DU-101']);
  const manifest=path.join(dir,'harvest.json');
  fs.writeFileSync(manifest,JSON.stringify({cohort:'export',eligibleDecisionIds:['DU-101'],classifications:[{id:'DU-101',destination:'drop',reason:'Meaning and approval preserved in completion evidence'}]}));
  assert.deepEqual(checkHarvest(manifest,{decisionLog:records}).failures,[]);
  fs.unlinkSync(path.join(records,'DU-101.json'));
  assert.deepEqual([...resolvedDecisionIds(records)],[]);
  assert.ok(checkHarvest(manifest,{decisionLog:records}).failures.some(x=>x.includes('DU-101')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(records,'_sequence.json'))).DU,101);
  assert.ok(fs.existsSync(path.join(records,'DU-100.json')));
});
test('invalid identity, missing authority, malformed JSON and symlinks cannot supply resolved authority',t=>{
  const {dir,records,write}=fixture(t);
  const valid={id:'DU-01',status:'resolved',scope:'export',decision:'Managers only',authority:'Actual owner response'};
  for(const change of [{id:'DU-02'},{authority:''},{status:'approved'}]) {
    write('DU-01.json',{...valid,...change});
    assert.throws(()=>resolvedDecisionIds(records),/invalid decision evidence/);
  }
  fs.writeFileSync(path.join(records,'DU-01.json'),'{');
  assert.throws(()=>resolvedDecisionIds(records),/invalid JSON/);
  fs.unlinkSync(path.join(records,'DU-01.json'));
  fs.writeFileSync(path.join(dir,'external.json'),JSON.stringify(valid));
  fs.symlinkSync(path.join(dir,'external.json'),path.join(records,'DU-01.json'));
  assert.throws(()=>resolvedDecisionIds(records),/unexpected decision evidence/);
});
test('legacy logs remain readable during migration without treating pending questions as resolved',t=>{
  const {dir}=fixture(t), file=path.join(dir,'legacy.md');
  fs.writeFileSync(file,'## Pending your review\n### DU-02 — question\n## Resolved\n### DU-01 — agreed\n');
  assert.deepEqual([...resolvedDecisionIds(file)],['DU-01']);
});
