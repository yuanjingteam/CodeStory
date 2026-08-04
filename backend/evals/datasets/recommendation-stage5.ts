export interface RecommendationPrecisionCase {
  id: string;
  scene: 'lesson' | 'review';
  recommendedIds: string[];
  relevantIds: string[];
  labelProvenance: 'spec-derived-review';
  notes: string;
}

export const recommendationStage5Dataset: RecommendationPrecisionCase[] = [
  {
    id: 'review-low-score-01',
    scene: 'review',
    recommendedIds: ['exercise-a', 'lesson-b', 'lesson-c', 'lesson-d', 'lesson-e'],
    relevantIds: ['exercise-a', 'lesson-b', 'lesson-c', 'lesson-d'],
    labelProvenance: 'spec-derived-review',
    notes: '错题、薄弱小节和同课程后继内容应优先。',
  },
  {
    id: 'review-low-score-02',
    scene: 'review',
    recommendedIds: ['exercise-f', 'exercise-g', 'lesson-h', 'lesson-i', 'lesson-j'],
    relevantIds: ['exercise-f', 'exercise-g', 'lesson-h', 'lesson-i'],
    labelProvenance: 'spec-derived-review',
    notes: '多道低分题按分数升序进入复习队列。',
  },
  {
    id: 'review-mastery-01',
    scene: 'review',
    recommendedIds: ['lesson-k', 'lesson-l', 'lesson-m', 'lesson-n', 'lesson-o'],
    relevantIds: ['lesson-k', 'lesson-l', 'lesson-m', 'lesson-n'],
    labelProvenance: 'spec-derived-review',
    notes: '无错题时按掌握度和课程顺序推荐。',
  },
  {
    id: 'review-cold-start-01',
    scene: 'review',
    recommendedIds: ['lesson-p', 'lesson-q', 'lesson-r', 'lesson-s', 'lesson-t'],
    relevantIds: ['lesson-p', 'lesson-q', 'lesson-r', 'lesson-s'],
    labelProvenance: 'spec-derived-review',
    notes: '冷启动优先基础难度和课程前序小节。',
  },
  {
    id: 'review-cold-start-02',
    scene: 'review',
    recommendedIds: ['lesson-u', 'lesson-v', 'lesson-w', 'lesson-x', 'lesson-y'],
    relevantIds: ['lesson-u', 'lesson-v', 'lesson-w', 'lesson-x'],
    labelProvenance: 'spec-derived-review',
    notes: '无学习记录时不得引用其他用户的错题。',
  },
  {
    id: 'lesson-related-01',
    scene: 'lesson',
    recommendedIds: ['lesson-aa', 'lesson-ab', 'lesson-ac', 'lesson-ad', 'lesson-ae'],
    relevantIds: ['lesson-aa', 'lesson-ab', 'lesson-ac', 'lesson-ad'],
    labelProvenance: 'spec-derived-review',
    notes: '同课程语义相关小节保持检索顺序。',
  },
  {
    id: 'lesson-related-02',
    scene: 'lesson',
    recommendedIds: ['lesson-af', 'lesson-ag', 'lesson-ah', 'lesson-ai', 'lesson-aj'],
    relevantIds: ['lesson-af', 'lesson-ag', 'lesson-ah', 'lesson-ai'],
    labelProvenance: 'spec-derived-review',
    notes: '当前小节不得出现在推荐结果中。',
  },
  {
    id: 'lesson-rag-fallback-01',
    scene: 'lesson',
    recommendedIds: ['lesson-ak', 'lesson-al', 'lesson-am', 'lesson-an', 'lesson-ao'],
    relevantIds: ['lesson-ak', 'lesson-al', 'lesson-am', 'lesson-an'],
    labelProvenance: 'spec-derived-review',
    notes: 'RAG 失败时按同课程顺序降级。',
  },
  {
    id: 'lesson-partial-rag-01',
    scene: 'lesson',
    recommendedIds: ['lesson-ap', 'lesson-aq', 'lesson-ar', 'lesson-as', 'lesson-at'],
    relevantIds: ['lesson-ap', 'lesson-aq', 'lesson-ar', 'lesson-as'],
    labelProvenance: 'spec-derived-review',
    notes: '相关结果不足五条时用课程顺序补齐。',
  },
  {
    id: 'review-approved-only-01',
    scene: 'review',
    recommendedIds: ['exercise-au', 'lesson-av', 'lesson-aw', 'lesson-ax', 'lesson-ay'],
    relevantIds: ['exercise-au', 'lesson-av', 'lesson-aw', 'lesson-ax'],
    labelProvenance: 'spec-derived-review',
    notes: '复习题必须处于 approved 状态且属于当前课程。',
  },
];
