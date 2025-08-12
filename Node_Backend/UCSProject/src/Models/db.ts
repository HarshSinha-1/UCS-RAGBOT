import { Pool } from 'pg';
import config from '../configs/config';

const pool = new Pool({
  connectionString: config.Db_connection,
});

pool.connect()
  .then((client) => {
    console.log('Connected to Postgres SQL');
    client.release();
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

export default pool;
