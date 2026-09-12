/** Read current recovery facts from the queue and receipt; historical reports are not state. */
import { next } from "./next.js";
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
    installation: current.installation,
    state: current.state,
    nextAction: current.installation.requiresInit ? "cg init" : current.repairableQueue ? "cg-prepare" : current.stage,
    reason: current.reason ?? null,
    programmes: current.programmes ?? [],
    queueFiles: [...new Set(briefs.map(b => b.file.replace(/:\d+$/, "")))],
    currentStep: current.step ? step(current.step) : null,
    remainingSteps: briefs.filter(b => b.status !== "Complete").map(step),
    findings: current.findings ?? [],
    prototype: current.prototype ? {
      file: current.prototype.file,
      status: current.prototype.status,
      // A persisted completion request records coordination scope; status never creates one.
      completionRequest: current.prototype.completionRequest ?? null,
    } : null,
    residue: documents ? { blocking: documents.blocking,
      otherProgrammes: documents.residue.filter(item => item.scope === "other") } : null,
    problems,
  };
}
