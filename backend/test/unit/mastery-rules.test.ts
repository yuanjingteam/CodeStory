// 阶段 0A 收尾：前置项 D 掌握度纯函数单元测试
// 迁移自 scripts/check-mastery-rules.ts，用 vitest 的 describe/it 组织断言
import { describe, it, expect } from 'vitest';
import {
  calculateAnswerMastery,
  calculateLessonMasteryLevel,
  getMasteryBand,
  resolveMasteryLevel,
} from '../../src/services/courses/learning-progress.service';

describe('前置项 D · calculateAnswerMastery（单题掌握值）', () => {
  it('正常提示等级下返回规范化后的 score', () => {
    expect(calculateAnswerMastery({ score: 90, hintLevelUsed: 1 })).toBe(90);
  });

  it('score 超过 100 时规范化为 100', () => {
    expect(calculateAnswerMastery({ score: 140, hintLevelUsed: 0 })).toBe(100);
  });

  it('hintLevelUsed 为负数时返回 0', () => {
    expect(calculateAnswerMastery({ score: 70, hintLevelUsed: -1 })).toBe(0);
  });

  it('hintLevelUsed 超过 3 时返回 0', () => {
    expect(calculateAnswerMastery({ score: 70, hintLevelUsed: 4 })).toBe(0);
  });
});

describe('前置项 D · calculateLessonMasteryLevel（小节候选掌握度）', () => {
  it('按有效题目数求和后求平均，未作答按 0 计', () => {
    expect(
      calculateLessonMasteryLevel(
        [
          { score: 100, hintLevelUsed: 0 },
          { score: 80, hintLevelUsed: 2 },
        ],
        3
      )
    ).toBe(60);
  });

  it('题目数为 0 时返回 0', () => {
    expect(calculateLessonMasteryLevel([], 0)).toBe(0);
  });
});

describe('前置项 D · getMasteryBand（掌握度区间标签）', () => {
  it('0 为 not_started', () => {
    expect(getMasteryBand(0)).toBe('not_started');
  });
  it('39 为 beginner', () => {
    expect(getMasteryBand(39)).toBe('beginner');
  });
  it('59 为 developing', () => {
    expect(getMasteryBand(59)).toBe('developing');
  });
  it('79 为 proficient', () => {
    expect(getMasteryBand(79)).toBe('proficient');
  });
  it('80 为 mastered', () => {
    expect(getMasteryBand(80)).toBe('mastered');
  });
});

describe('前置项 D · resolveMasteryLevel（事件矩阵）', () => {
  it('选择题答对：取 max(当前值, 候选值) 提升', () => {
    expect(
      resolveMasteryLevel({
        event: 'choice_correct',
        currentLevel: 40,
        candidateLevel: 70,
      })
    ).toBe(70);
  });

  it('选择题答错：保持当前值，不下调', () => {
    expect(
      resolveMasteryLevel({
        event: 'choice_incorrect',
        currentLevel: 70,
        candidateLevel: 0,
      })
    ).toBe(70);
  });

  it('人工改判未掌握但未复核：保持当前值', () => {
    expect(
      resolveMasteryLevel({
        event: 'human_not_mastered',
        currentLevel: 70,
        candidateLevel: 30,
      })
    ).toBe(70);
  });

  it('人工改判未掌握且已复核：唯一允许的下调入口，取候选值', () => {
    expect(
      resolveMasteryLevel({
        event: 'human_not_mastered',
        currentLevel: 70,
        candidateLevel: 30,
        reviewed: true,
      })
    ).toBe(30);
  });
});
