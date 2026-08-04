import './config/env';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { corsOptions } from './config/cors';
import { httpLogger, logger } from './config/logger';
import errorHandler from './middleware/errorHandler';
import { authMiddleware, requireAdmin } from './middleware/auth';
import { requestContextMiddleware } from './middleware/request-context';
import { serveUploadFromOSS } from './middleware/serve-upload';
import {
  authRouters,
  coursesRouter,
  homeRouter,
  profileRouter,
  userManageRouter,
  lessonsRouter,
  exercisesRouter,
  courseManageRouter,
  chapterManageRouter,
  lessonManageRouter,
  exerciseManageRouter,
  aiRouter,
  gradingReviewsRouter,
  recommendationsRouter,
} from './routes/index';
import { startAiChatCleanupScheduler } from './services/ai/chat-retention.service';
import { startContentCleanupScheduler } from './services/course-manage/content-retention.service';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(requestContextMiddleware);
app.use(httpLogger);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// API routes
app.use('/api/v1/auth', authRouters);
app.use(
  '/uploads',
  serveUploadFromOSS,
  express.static(path.join(process.cwd(), 'uploads'))
);
app.use('/api/v1/courses', coursesRouter);
app.use('/api/v1/home', homeRouter);
app.use('/api/v1/profile', authMiddleware, profileRouter);
app.use('/api/v1/chapter/lesson',authMiddleware, lessonsRouter);
app.use('/api/v1/exercises', authMiddleware, exercisesRouter);
app.use('/api/v1/recommendations', authMiddleware, recommendationsRouter);
app.use('/api/v1/ai', aiRouter);
app.use(
  '/api/v1/admin/user-manage',
  [authMiddleware, requireAdmin],
  userManageRouter
);
app.use(
  '/api/v1/admin/courses',
  [authMiddleware, requireAdmin],
  courseManageRouter
);
app.use(
  '/api/v1/admin/chapter',
  [authMiddleware, requireAdmin],
  chapterManageRouter
);
app.use(
  '/api/v1/admin/lessons',
  [authMiddleware, requireAdmin],
  lessonManageRouter
);
app.use(
  '/api/v1/admin/grading-reviews',
  [authMiddleware, requireAdmin],
  gradingReviewsRouter
);
app.use(
  '/api/v1/admin/exercises',
  [authMiddleware, requireAdmin],
  exerciseManageRouter
);

// Error handler
app.use(errorHandler);

// 测试环境（vitest）下不监听端口，仅导出 app 供 supertest 直接调用
if (!process.env.VITEST) {
  app.listen(PORT, () => {
    logger.info(
      { port: PORT, environment: process.env.NODE_ENV || 'development' },
      'Server started'
    );
    startAiChatCleanupScheduler();
    startContentCleanupScheduler();
  });
}

export default app;
