import fs from 'node:fs';
import path from 'node:path';

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

const inputPath = path.resolve(
  getArgument('input') || 'evals/datasets/exercise-generation-results-final-v2.json'
);
const outputPath = path.resolve(
  getArgument('output') || 'evals/datasets/exercise-generation-results-audited.json'
);
const auditPaths = (getArgument('audits')
  || [1, 2, 3]
    .map((part) => `evals/reports/exercise-audit-part${part}.json`)
    .join(','))
  .split(',')
  .map((value) => path.resolve(value));

const results = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as Array<
  Record<string, unknown>
>;
const audits = auditPaths.flatMap((auditPath) =>
  JSON.parse(fs.readFileSync(auditPath, 'utf8')) as Array<Record<string, unknown>>
);
const auditById = new Map(audits.map((audit) => [String(audit.id), audit]));

if (auditById.size !== results.length) {
  throw new Error(`审查记录数量不匹配：${auditById.size}/${results.length}`);
}

const merged = results.map((result) => {
  const audit = auditById.get(String(result.id));
  if (!audit) throw new Error(`缺少审查记录：${String(result.id)}`);
  return {
    ...result,
    agentAnswerCorrect: audit.agentAnswerCorrect,
    agentConfirmedDuplicate: audit.agentConfirmedDuplicate,
    agentAuditRationale: audit.rationale,
    labelProvenance: 'agent-audited',
  };
});

fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({
  outputPath,
  records: merged.length,
  answerCorrect: merged.filter((item) => item.agentAnswerCorrect === true).length,
  answerIncorrect: merged.filter((item) => item.agentAnswerCorrect === false).length,
  duplicates: merged.filter((item) => item.agentConfirmedDuplicate === true).length,
}, null, 2)}\n`);
