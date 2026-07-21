import 'dotenv/config';
import { createClient } from 'redis';

//1.创建Redis连接客户端，从环境变量中去读地址
const redisClient = createClient({
  url: process.env.REDIS_URL,
});
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

redisClient.connect().catch(console.error);

export default redisClient;
