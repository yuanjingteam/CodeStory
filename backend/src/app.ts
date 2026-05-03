import express from 'express';
import cors from 'cors';
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

//Health check
app.get('/api/v1/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      message: 'Server and database are running',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

// API routes

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`
  );
});

export default app;
