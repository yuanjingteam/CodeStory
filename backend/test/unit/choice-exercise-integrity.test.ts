import { describe, it, expect } from 'vitest';
import {
  findChoiceExerciseWriteIssue,
  inspectChoiceExercise,
} from '../../src/services/courses/choice-exercise-integrity';

const OPTIONS = ['甲', '乙', '丙', '丁'];

function blockedBy(row: { answer: string | null; metadata: unknown }) {
  const inspection = inspectChoiceExercise(row);
  return inspection.usable ? null : inspection.blockedBy;
}

describe('inspectChoiceExercise · 拦截项', () => {
  it('metadata 为 SQL NULL 时 OPTIONS_MISSING', () => {
    expect(blockedBy({ answer: '甲', metadata: null })).toBe('OPTIONS_MISSING');
  });

  it('metadata 里没有 options 数组时 OPTIONS_MISSING', () => {
    expect(blockedBy({ answer: '甲', metadata: { template: '单选题模板' } })).toBe(
      'OPTIONS_MISSING'
    );
  });

  it('metadata 是数组时 OPTIONS_MISSING', () => {
    expect(blockedBy({ answer: '甲', metadata: ['甲', '乙'] })).toBe(
      'OPTIONS_MISSING'
    );
  });

  it('选项少于两个时 OPTIONS_TOO_FEW', () => {
    expect(blockedBy({ answer: '甲', metadata: { options: ['甲'] } })).toBe(
      'OPTIONS_TOO_FEW'
    );
  });

  it('存在空白选项时 OPTION_BLANK', () => {
    expect(
      blockedBy({ answer: '甲', metadata: { options: ['甲', '  '] } })
    ).toBe('OPTION_BLANK');
  });

  it('答案为空串时 ANSWER_BLANK', () => {
    expect(blockedBy({ answer: '', metadata: { options: OPTIONS } })).toBe(
      'ANSWER_BLANK'
    );
  });

  it('答案不在选项内时 ANSWER_NOT_IN_OPTIONS', () => {
    expect(blockedBy({ answer: '戊', metadata: { options: OPTIONS } })).toBe(
      'ANSWER_NOT_IN_OPTIONS'
    );
  });

  it('答案匹配到多个选项时 ANSWER_AMBIGUOUS，而不是仅警告', () => {
    expect(
      blockedBy({ answer: '甲', metadata: { options: ['甲', '甲', '丙'] } })
    ).toBe('ANSWER_AMBIGUOUS');
  });
});

describe('inspectChoiceExercise · 线上真实形状', () => {
  it('answer 为空且 metadata 带幽灵 correctAnswer 键：先撞 ANSWER_BLANK', () => {
    expect(
      blockedBy({
        answer: '',
        metadata: {
          options: [
            'WHERE 可以筛选分组后的结果',
            'COUNT() 用于计算字段平均值',
            'GROUP BY 用于对相同数据进行分组',
            'AVG() 用于统计数据总条数',
          ],
          correctAnswer: '',
        },
      })
    ).toBe('ANSWER_BLANK');
  });

  it('干扰项重复但答案唯一：可用，只带警告', () => {
    const inspection = inspectChoiceExercise({
      answer: '可以制作精美的图表和数据透视表',
      metadata: {
        template: '单选题模板',
        options: [
          '可以处理海量数据而不卡顿',
          '可以处理海量数据而不卡顿',
          '可以制作精美的图表和数据透视表',
          '可以方便地建立表与表之间的关联关系',
        ],
      },
    });
    expect(inspection.usable).toBe(true);
    expect(inspection.warnings).toEqual(['DUPLICATE_DISTRACTOR']);
  });

  it('选项与答案都规范时可用且无警告', () => {
    const inspection = inspectChoiceExercise({
      answer: '丙',
      metadata: { options: OPTIONS },
    });
    expect(inspection).toEqual({
      usable: true,
      options: OPTIONS,
      warnings: [],
    });
  });
});

describe('inspectChoiceExercise · 读取侧不做 trim', () => {
  it('答案带尾空格而选项已去空格时判为不在选项内', () => {
    // 判分比的是原值：options[i] === exercise.answer，所以这里不能替它 trim。
    expect(blockedBy({ answer: '甲 ', metadata: { options: OPTIONS } })).toBe(
      'ANSWER_NOT_IN_OPTIONS'
    );
  });
});

describe('findChoiceExerciseWriteIssue · 写入侧把警告也当错误', () => {
  it('干扰项重复在写入侧被拒', () => {
    expect(
      findChoiceExerciseWriteIssue({
        answer: '丙',
        metadata: { options: ['甲', '甲', '丙'] },
      })
    ).toBe('DUPLICATE_DISTRACTOR');
  });

  it('合规输入返回 null', () => {
    expect(
      findChoiceExerciseWriteIssue({
        answer: '丙',
        metadata: { options: OPTIONS },
      })
    ).toBeNull();
  });
});
