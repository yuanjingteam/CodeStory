import '../src/config/env';
import { reviewCodeWithAI } from '../src/services/ai/code-review.service';
import { generateChoiceExplanation } from '../src/services/ai/choice-explanation.service';

async function main(): Promise<void> {
  const codeReview = await reviewCodeWithAI({
    exerciseContent: '查询 users 表中 active=true 的用户。',
    knowledge: 'SQL WHERE',
    correctAnswer: 'SELECT * FROM users WHERE active = true;',
    analysis: '使用 WHERE 过滤 active 字段。',
    userCode: 'SELECT * FROM users WHERE active = true;',
    language: 'sql',
    hintLevelUsed: 0,
    staticGrade: {
      correct: true,
      score: 100,
      feedback: '静态比对通过',
      language: 'sql',
      compileSuccess: null,
      passedCount: 1,
      totalCount: 1,
      functionalScore: 70,
      hintDeduction: 0,
      errorType: null,
      testResult: { mode: 'static' },
    },
  });
  const choice = await generateChoiceExplanation({
    exerciseContent: '哪个 SQL 子句用于过滤行？',
    knowledge: 'SQL WHERE',
    options: [
      {
        label: 'A',
        content: 'WHERE',
        isCorrect: true,
        isSelected: false,
      },
      {
        label: 'B',
        content: 'ORDER BY',
        isCorrect: false,
        isSelected: true,
      },
    ],
    correctOption: 'A',
    selectedOption: 'B',
    analysis: 'WHERE 用于过滤，ORDER BY 用于排序。',
  });

  process.stdout.write(
    `${JSON.stringify({
      codeReview: {
        model: codeReview.model,
        schemaValid: Boolean(codeReview.review.feedback),
      },
      choiceExplanation: {
        schemaValid: Boolean(choice.summary),
        optionCount: choice.optionExplanations.length,
      },
    })}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
