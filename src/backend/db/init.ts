import 'dotenv/config';
import { initializeDatabase } from './index';

initializeDatabase();
console.log('Database initialized successfully');
process.exit(0);
