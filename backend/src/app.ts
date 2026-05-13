import express from 'express';
import cors from 'cors';
import path from 'path';
import errorHandler from '../src/middleware/errorHandler';
import prisma from '../src/config/prisma';

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.dev' });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// 静态文件服务 - 课程图片
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

//Health check
app.get('/api/v1/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    // 测试查询用户数据
    const users = await prisma.users.findMany({
      take: 1,
    });

    
    const serializedUsers = users.map((user) => ({
      ...user,
      score: Number(user.score),
    }));

    res.json({
      status: 'ok',
      message: 'Server and database are running',
      database: 'connected',
      userCount: users.length,
      sampleUser: serializedUsers.length > 0 ? serializedUsers[0] : null,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// API routes
import coursesRouter from './routes/courses';
app.use('/api/v1/courses', coursesRouter);


// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`
  );
});

export default app;
