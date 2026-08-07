import type { KnowledgeIndexSummary } from '@/types/knowledge-index';
import { showToast } from '@/utils/toast';

export function showKnowledgeIndexResult(
  successMessage: string,
  summary?: KnowledgeIndexSummary
): void {
  if (!summary) {
    showToast.success(successMessage);
    return;
  }

  if (summary.status === 'ready') {
    showToast.success(`${successMessage}，AI 知识库已同步`);
    return;
  }
  if (summary.status === 'not_indexed') {
    showToast.info(`${successMessage}，暂无可同步的小节内容`);
    return;
  }
  if (summary.status === 'pending') {
    showToast.info(`${successMessage}，AI 知识库等待同步`);
    return;
  }
  if (summary.status === 'needs_content') {
    showToast.warning(
      `${successMessage}，内容不足，补充正文后才能进入 AI 知识库`
    );
    return;
  }
  if (summary.status === 'needs_review') {
    showToast.warning(
      `${successMessage}，内容较短，请确认是否纳入 AI 知识库`
    );
    return;
  }
  if (summary.status === 'excluded') {
    showToast.info(`${successMessage}，该内容已排除出 AI 知识库`);
    return;
  }
  if (summary.status === 'partial') {
    showToast.warning(
      `${successMessage}，部分知识索引未完成，可在小节列表重新索引`
    );
    return;
  }
  showToast.warning(
    `${successMessage}，但 AI 知识库同步失败，可在小节列表重新索引`
  );
}
