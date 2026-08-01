import { Router } from 'express';
import { z } from 'zod';
import {
  getGradingReviewDetail,
  GRADING_REVIEW_RESULTS,
  GRADING_REVIEW_STATUSES,
  GradingReviewConflictError,
  GradingReviewNotFoundError,
  listGradingReviews,
  reviewGradingReview,
} from '../services/courses/grading-review.service';

const router = Router();

const listSchema = z.object({
  status: z.enum(GRADING_REVIEW_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

const reviewSchema = z.object({
  result: z.enum(GRADING_REVIEW_RESULTS),
  note: z.string().trim().max(2000).optional(),
}).strict();

router.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ code: 400, message: '分页或状态参数无效', data: null });
  }
  try {
    const result = await listGradingReviews(parsed.data);
    return res.json({ code: 200, message: 'success', data: result });
  } catch {
    return res.status(500).json({ code: 500, message: '复核队列加载失败', data: null });
  }
});

router.get('/:id', async (req, res) => {
  const result = await getGradingReviewDetail(req.params.id);
  if (!result) {
    return res.status(404).json({ code: 404, message: '复核单不存在', data: null });
  }
  return res.json({ code: 200, message: 'success', data: result });
});

router.post('/:id/review', async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 400, message: '复核结论参数无效', data: null });
  }
  try {
    await reviewGradingReview({
      reviewId: req.params.id,
      reviewerId: req.user!.id,
      result: parsed.data.result,
      note: parsed.data.note,
    });
    const result = await getGradingReviewDetail(req.params.id);
    return res.json({ code: 200, message: 'success', data: result });
  } catch (error) {
    if (error instanceof GradingReviewNotFoundError) {
      return res.status(404).json({ code: 404, message: error.message, data: null });
    }
    if (error instanceof GradingReviewConflictError) {
      return res.status(409).json({
        code: 409,
        message: error.message,
        data: { reason: error.reason },
      });
    }
    return res.status(500).json({ code: 500, message: '复核失败', data: null });
  }
});

export default router;
