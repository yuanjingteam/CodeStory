import dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local', override: true });
}
