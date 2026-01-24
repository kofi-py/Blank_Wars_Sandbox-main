
import { config } from 'dotenv';
config();
console.log(process.env.DB_NAME || 'blank_wars');
