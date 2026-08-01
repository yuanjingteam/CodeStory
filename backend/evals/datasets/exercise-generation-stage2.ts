export interface ExerciseGenerationEvalCase {
  id: string;
  hierarchy: string;
  knowledge: string;
  type: 'single_choice' | 'code';
  difficulty: number;
  evidence: string;
}

const topics = [
  ['SQL WHERE', 'WHERE 子句在 SELECT 之后筛选满足条件的行。'],
  ['SQL ORDER BY', 'ORDER BY 按指定列排序，ASC 为升序，DESC 为降序。'],
  ['SQL LIMIT', 'LIMIT 限制返回行数，可与偏移量组合实现分页。'],
  ['SQL COUNT', 'COUNT(*) 统计结果集的行数。'],
  ['SQL GROUP BY', 'GROUP BY 将相同键值的行分组，常与聚合函数配合。'],
  ['SQL HAVING', 'HAVING 在分组后过滤聚合结果，WHERE 在分组前过滤行。'],
  ['SQL JOIN', 'INNER JOIN 只返回连接条件匹配的行。'],
  ['SQL LEFT JOIN', 'LEFT JOIN 保留左表全部行，右表无匹配时补 NULL。'],
  ['SQL DISTINCT', 'DISTINCT 去除 SELECT 结果中的重复行。'],
  ['SQL NULL', '判断空值应使用 IS NULL 或 IS NOT NULL，不能使用等号。'],
  ['Python 列表', 'Python 列表使用方括号，可按索引读取并用 append 追加元素。'],
  ['Python 字典', 'Python 字典保存键值对，可通过键读取或更新对应值。'],
  ['Python 循环', 'for 循环可遍历可迭代对象，range(n) 产生从 0 到 n-1 的整数。'],
  ['Python 函数', '使用 def 定义函数，return 将结果返回给调用方。'],
  ['Python 条件', 'if、elif、else 按条件顺序选择一个分支执行。'],
  ['Python 字符串', '字符串切片 text[start:end] 包含 start，不包含 end。'],
  ['Python 排序', 'sorted 返回新的已排序列表，原列表保持不变。'],
  ['Python 集合', 'set 中元素唯一，可用于去重和集合运算。'],
  ['Python 异常', 'try 捕获可能失败的代码，except 处理指定异常。'],
  ['Python 推导式', '列表推导式可用一个表达式和遍历条件构造新列表。'],
] as const;

const scenarios = ['用户管理', '课程统计', '订单报表', '学习记录', '内容审核'] as const;

export const exerciseGenerationStage2Dataset: ExerciseGenerationEvalCase[] =
  Array.from({ length: 100 }, (_, index) => {
    const [topic, fact] = topics[index % topics.length];
    const scenario = scenarios[Math.floor(index / topics.length)];
    const type = index % 2 === 0 ? 'single_choice' : 'code';
    return {
      id: `exercise-stage2-${String(index + 1).padStart(3, '0')}`,
      hierarchy: `评测课程 / ${scenario} / ${topic}`,
      knowledge: `${topic}在${scenario}中的应用`,
      type,
      difficulty: index % 3,
      evidence: `[固定证据 | ${topic} | 场景:${scenario}]\n${fact}\n题目必须围绕${scenario}场景，但不得引入证据之外的结论。`,
    };
  });
