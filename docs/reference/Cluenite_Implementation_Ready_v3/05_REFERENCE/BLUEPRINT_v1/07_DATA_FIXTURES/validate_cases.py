#!/usr/bin/env python3
"""Validation & smoke simulation for authored CLUENITE case fixtures.

Intentionally limited: checks reachability/links and deterministic proof gates, NOT
production authorization, Twitch EventSub, chat moderation or persistence.
"""
from __future__ import annotations
from pathlib import Path
import json

ROOT = Path(__file__).parent
CASES = sorted(ROOT.glob('[qmc]0*.json'))

class CaseError(Exception): pass

def require(ok, message):
    if not ok: raise CaseError(message)

def check_case(c):
    label = c['id']
    objs = c['objects']; evid = c['evidence']; rels = c['relations']
    obj_ids = [v['id'] for v in objs]
    ev_ids = [v['id'] for v in evid]
    rel_ids = [v['id'] for v in rels]
    require(len(obj_ids) == len(set(obj_ids)),f'{label}: duplicate object id')
    require(len(ev_ids) == len(set(ev_ids)),f'{label}: duplicate evidence id')
    require(len(rel_ids) == len(set(rel_ids)),f'{label}: duplicate relation id')
    require(not (set(rel_ids) & set(ev_ids)),f'{label}: relation/evidence ID collision')
    e_set=set(ev_ids); r_set=set(rel_ids)
    for e in evid:
        require(e['source'] in obj_ids,f'{label}: unknown evidence source {e}')
    for ob in objs:
        require(ob.get('role','any') in ('any','field','records'),f'{label}: invalid role')
        for eid in ob['unlocks']:
            require(eid in e_set,f'{label}: unknown unlocked evidence {eid}')
    expected_unlocks={x for o in objs for x in o['unlocks']}
    require(expected_unlocks==e_set,f'{label}: orphan evidence')
    op=c.get('orderPuzzle')
    extra={op['unlocks']} if op else set()
    if op:
        require(set(op['input'])==set(op['correct']),f'{label}: order puzzle mismatch')
        require(set(op['requires']) <= e_set,f'{label}: order puzzle references unknown evidence')
    for r in rels:
        require(set(r['requires']) <= (e_set|r_set|extra),f'{label}: invalid relation prerequisite {r}')
        if r['type']=='link': require(set(r['between']) <= e_set,f'{label}: bad relation endpoints')
        if r['type']=='joint': require(set(r['roles'])=={'field','records'},f'{label}: joint missing roles')
    require(set(c['answer']['required']) <= (e_set|r_set|extra),f'{label}: answer invalid prerequisite')
    require(c['answer']['id'] and len(set(c['answer']['aliases']))==len(c['answer']['aliases']),f'{label}: answer aliases')
    # Verify no cyclic relation dependencies.
    def visit(rid, stack):
        if rid in stack:raise CaseError(f'{label}: cyclic dependency {rid}')
        rel=next(x for x in rels if x['id']==rid)
        for dep in rel['requires']:
            if dep in r_set:visit(dep,stack|{rid})
    for rid in rel_ids:visit(rid,set())
    # Static reachable closure, assuming all inspectables can be inspected.
    reachable=set(e_set)|extra
    changed=True
    while changed:
        changed=False
        for rel in rels:
            if set(rel['requires']) <= reachable and rel['id'] not in reachable:
                reachable.add(rel['id']);changed=True
    require(set(c['answer']['required']) <= reachable,f'{label}: impossible answer proof')
    return True

class SmokeEngine:
    def __init__(self,c):
        self.c=c;self.state=set();self.events=set();self.contributions=[];self.relation_map={r['id']:r for r in c['relations']}
    def inspect(self, object_id,role='any', msg=None):
        if msg and msg in self.events:return False
        ob=next((o for o in self.c['objects'] if o['id']==object_id),None)
        if ob is None or (ob['role'] not in (role,'any')):return False
        if msg:self.events.add(msg)
        before=len(self.state)
        self.state.update(ob['unlocks'])
        if len(self.state)>before:self.contributions.append((role,object_id))
        return True
    def order(self, inputs):
        op=self.c.get('orderPuzzle')
        if not op:return False
        if op['correct']==inputs and set(op['requires']) <= self.state:
            self.state.add(op['unlocks']);return True
        return False
    def link(self,rel_id):
        rel=self.relation_map[rel_id]
        if rel['type']=='joint':return False
        if set(rel['requires']) <= self.state:
            self.state.add(rel_id);return True
        return False
    def joint(self,rel_id):
        rel=self.relation_map[rel_id]
        if rel['type']!='joint':return False
        if set(rel['requires']) <= self.state:
            # Provenance of both station-specific contributions required.
            roles={role for role,obj in self.contributions}
            if 'field' not in roles or 'records' not in roles:return False
            self.state.add(rel_id);return True
        return False
    def solve(self,guess):
        return guess.upper() in ({self.c['answer']['id']}|set(self.c['answer']['aliases'])) and set(self.c['answer']['required']) <= self.state

def smoke_case(c):
    e=SmokeEngine(c)
    require(not e.solve(c['answer']['id']),'unproven solution accepted')
    require(not e.inspect('__INVALID__'),'unknown object accepted')
    for obj in c['objects']:
        role=obj['role'];valid=e.inspect(obj['id'],role,msg='chat:'+obj['id'])
        require(valid,f"{c['id']}: inspect failed {obj['id']}")
        # duplicate chat message must not add credit
        before=len(e.contributions)
        require(not e.inspect(obj['id'],role,msg='chat:'+obj['id']),f"{c['id']}: duplicate event accepted")
        require(len(e.contributions)==before,f"{c['id']}: duplicate credit added")
    op=c.get('orderPuzzle')
    if op:
        require(not e.order(list(reversed(op['correct']))),'wrong timeline accepted')
        require(e.order(op['correct']),'correct timeline not accepted')
    pending=[r for r in c['relations']]
    while pending:
        before=len(pending)
        pending=[r for r in pending if not ((e.joint(r['id']) if r['type']=='joint' else e.link(r['id'])))]
        require(len(pending)<before, f"{c['id']}: relation deadlock: {pending}")
    require(e.solve(c['answer']['id']),f"{c['id']}: intended complete solve failed")
    require(not e.solve('__WRONG__'),f"{c['id']}: incorrect answer accepted")
    return len(c['objects']),len(c['relations']),len(e.contributions)

def main():
    require(len(CASES)==3,f'Expected 3 fixtures, found {len(CASES)}')
    for f in CASES:
        c=json.loads(f.read_text())
        check_case(c)
        objects,relations,credits=smoke_case(c)
        print(f"PASS {c['id']} v{c['version']}: {objects} objects, {relations} relations, {credits} true contribution actions, proof/negative/dedupe checks")
    print('PASS 3/3 case fixtures — static graph and limited smoke validation only')

if __name__=='__main__':
    main()
