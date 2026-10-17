/**
 * @file Project individual and aggregate programme status from current query inputs.
 * @see .agent/contract.md
 */
import { next, createNextQuery } from "./next.js";
import { residue, createResidueQuery } from "./residue.js";

export function status(repoRoot, options = {}) {
  return programmeStatus(repoRoot, options, next(repoRoot, options));
}

function programmeStatus(repoRoot, options, current, readResidue = programme => residue(repoRoot, { ...options, programme })) {
  const programme = current.programme ?? options.programme ?? null;
  const briefs = current.briefs ?? [];
  const step = brief => ({ number: brief.number, title: brief.title, file: brief.file,
    status: brief.status, dependsOn: brief.dependsOn, blockedBy: brief.blockedBy });
  const problems = [...current.problems];
  let documents = null;
  if (current.state !== "selection-required") {
    try { documents = readResidue(programme ?? undefined); }
    catch (error) { problems.push(error.message); }
  }
  return {
    programme,
    selectionSource: current.selectionSource ?? null,
    installation: current.installation,
    intent: current.intent,
    delivery: current.delivery,
    signOffRecovery: current.signOffRecovery,
    state: current.state,
    nextAction: current.installation.requiresInit ? "cg init" : current.intent?.required && !current.intent.ready ? "cg-warmup" : current.repairablePlan ? "cg-plan" : current.repairableQueue ? "cg-produce" : current.stage,
    reason: current.reason ?? null,
    ...(current.cleanup ? { cleanup: current.cleanup } : {}),
    programmes: current.programmes ?? [],
    queueFiles: [...new Set(briefs.map(b => b.file.replace(/:\d+$/, "")))],
    currentStep: current.step ? step(current.step) : null,
    remainingSteps: briefs.filter(b => b.status !== "Complete").map(step),
    findings: current.findings ?? [],
    receipt: current.receipt ? {
      file: current.receipt.file,
      status: current.receipt.status,
      // A persisted completion request records coordination scope; status never creates one.
      completionRequest: current.receipt.completionRequest ?? null,
    } : null,
    residue: documents ? { blocking: documents.blocking,
      otherProgrammes: documents.residue.filter(item => item.scope === "other") } : null,
    problems,
  };
}

/** Read every candidate without changing selection or admitting any action. */
export function statusSummary(repoRoot, options = {}) {
  const query = createNextQuery(repoRoot, options);
  const current = query.next({ ...options, programme: undefined, ignoreSelection: true });
  const problems = [...current.problems];
  let receipts = [];
  try { receipts = query.deliveries(); }
  catch (error) { if (!problems.includes(error.message)) problems.push(error.message); }
  const names = new Set([...receipts.map(record => record.programme), ...(current.programmes ?? []), ...(current.programme ? [current.programme] : []),
    ...current.signOffRecovery.candidates.map(item => item.programme)]);
  const readResidue = createResidueQuery(repoRoot, options, query.deliveries);
  const result = { state: "summary", installation: current.installation, intent: current.intent, problems,
    programmes: [...names].sort().map(programme => programmeStatus(repoRoot, { ...options, programme }, query.next({ ...options, programme }), readResidue)) };
  return options.compact ? compactSummary(result, current.signOffRecovery) : result;
}


/** Opt-in projection; expanded status remains the authoritative evidence query. */
function compactSummary(result, recovery) {
  const omissions = [];
  const bounded = (value, field, retrieve) => {
    if (Buffer.byteLength(JSON.stringify(value ?? null)) <= 4096) return value;
    omissions.push({ field, retrieve }); return Array.isArray(value) ? ["Content omitted; " + retrieve] : typeof value === "string" ? "Content omitted; " + retrieve : { omitted: true };
  };
  const programmes = result.programmes.slice(0, 100).map(item => ({
    programme: item.programme, state: item.state, receipt: item.receipt ? { status: item.receipt.status, file: item.receipt.file } : null,
    nextAction: item.nextAction, reason: bounded(item.reason, `${item.programme}.reason`, `cg status --programme ${item.programme} --json`),
    remainingSteps: item.remainingSteps.length, cleanupFiles: item.cleanup?.length ?? 0,
    problems: bounded(item.problems, `${item.programme}.problems`, `cg status --programme ${item.programme} --json`),
    retrieve: `cg status --programme ${item.programme} --json`,
  }));
  const compact = { hasProblems: Boolean(result.problems.length || result.programmes.some(item => item.problems.length || item.installation.requiresInit)), format: 'compact-v1', state: 'summary',
    installation: { ...result.installation, installed: bounded(result.installation.installed, 'installation.installed', 'cg status --summary --json') },
    intent: bounded(result.intent, 'intent', 'cg intent verify --json'),
    signOffRecovery: bounded(recovery, 'signOffRecovery', 'cg status --summary --json'),
    problems: bounded(result.problems, 'problems', 'cg status --summary --json'), programmes,
    omittedProgrammes: result.programmes.length - programmes.length, omissions, retrieve: 'cg status --summary --json' };
  while (Buffer.byteLength(JSON.stringify(compact, null, 2)) > 65535 && programmes.length) { programmes.pop(); compact.omittedProgrammes++; }
  while (Buffer.byteLength(JSON.stringify(compact, null, 2)) > 65535 && omissions.length) { omissions.pop(); compact.omittedOmissions = (compact.omittedOmissions ?? 0) + 1; }
  return compact;
}
