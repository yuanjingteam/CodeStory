import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import errorHandler from '../src/middleware/errorHandler';
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
} from './routes/index';

dotenv.config();

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './.env' });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// API routes
app.use('/api/v1/auth', authRouters);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/v1/courses', coursesRouter);
app.use('/api/v1/home', homeRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/user-manage', userManageRouter);
app.use('/api/v1/chapter/lesson', lessonsRouter);
app.use('/api/v1/exercises', exercisesRouter);
app.use('/api/v1/admin/courses', courseManageRouter);
app.use('/api/v1/admin/chapter', chapterManageRouter);
// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`
  );
});

export default app;
