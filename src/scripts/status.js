// Repository contract: ../../.agent/delivery/contract.md
/** Read current recovery facts from the queue and receipt; historical reports are not state. */
import { next } from "./next.js";
import { readDeliveries } from "./delivery.js";
import { residue } from "./residue.js";

export function status(repoRoot, options = {}) {
  const current = next(repoRoot, options);
  const programme = current.programme ?? options.programme ?? null;
  const briefs = current.briefs ?? [];
  const step = brief => ({ number: brief.number, title: brief.title, file: brief.file,
    status: brief.status, dependsOn: brief.dependsOn, blockedBy: brief.blockedBy });
  const problems = [...current.problems];
  let documents = null;
  if (current.state !== "selection-required") {
    try { documents = residue(repoRoot, { ...options, ...(programme ? { programme } : {}) }); }
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
  const current = next(repoRoot, { ...options, programme: undefined, ignoreSelection: true });
  const problems = [...current.problems];
  let receipts = [];
  try { receipts = readDeliveries(repoRoot); }
  catch (error) { if (!problems.includes(error.message)) problems.push(error.message); }
  const names = new Set([...receipts.map(record => record.programme), ...(current.programmes ?? []), ...(current.programme ? [current.programme] : []),
    ...current.signOffRecovery.candidates.map(item => item.programme)]);
  return { state: "summary", installation: current.installation, intent: current.intent, problems, programmes: [...names].sort().map(programme => status(repoRoot, { ...options, programme })) };
}
