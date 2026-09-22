// config/db.js
import mysql from "mysql2/promise";

let pool;
export const getDb = () => {
  if (!pool) throw new Error("Database pool has not been initialized");
  return pool;
};

const initializeGeoGuardianTable = async (dbPool) => {
  const query = `
    CREATE TABLE IF NOT EXISTS geoguardian_records (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      bounding_box JSON NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      selected_scenes JSON NULL,
      cloud_percentage DECIMAL(5,2) NULL,
      mean_ndvi DECIMAL(5,4) NULL,
      before_ndvi DECIMAL(5,4) NULL,
      after_ndvi DECIMAL(5,4) NULL,
      ndvi_change DECIMAL(5,4) NULL,
      affected_area DECIMAL(12,4) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;
  await dbPool.execute(query);
  console.log("GeoGuardian DB tables checked/created.");
};

const connectDB = async () => {
  pool = mysql.createPool({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, waitForConnections: true, connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10), timezone: "Z" });
  const connection = await pool.getConnection();
  connection.release();
  
  // Initialize GeoGuardian tables
  await initializeGeoGuardianTable(pool);
  
  console.log(`MySQL connected: ${process.env.DB_HOST || "127.0.0.1"}/${process.env.DB_NAME}`);
  return pool;
};

export default connectDB;
