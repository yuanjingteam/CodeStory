import './config/env';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { corsOptions } from './config/cors';
import errorHandler from './middleware/errorHandler';
import { authMiddleware, requireAdmin } from './middleware/auth';
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
  aiRouter,
} from './routes/index';
import { startAiChatCleanupScheduler } from './services/ai/chat-retention.service';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
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

// Error handler
app.use(errorHandler);

// 测试环境（vitest）下不监听端口，仅导出 app 供 supertest 直接调用
if (!process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`
    );
    startAiChatCleanupScheduler();
  });
}

export default app;
