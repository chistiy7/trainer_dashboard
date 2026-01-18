import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'workouts.db');
const db = new Database(dbPath);

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      duration_hours INTEGER NOT NULL DEFAULT 0,
      duration_minutes INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      complexity INTEGER NOT NULL CHECK(complexity >= 1)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL,
      description TEXT NOT NULL,
      exercise_type_id TEXT NOT NULL,
      time_minutes INTEGER NOT NULL CHECK(time_minutes > 0),
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_type_id) REFERENCES exercise_types(id)
    )
  `);

  const defaultTypes = [
    { id: '1', name: 'Кардио', complexity: 2 },
    { id: '2', name: 'Силовые', complexity: 3 },
    { id: '3', name: 'Растяжка', complexity: 1 },
    { id: '4', name: 'Плиометрика', complexity: 4 },
    { id: '5', name: 'Йога', complexity: 2 }
  ];

  const insertType = db.prepare(`
    INSERT OR IGNORE INTO exercise_types (id, name, complexity)
    VALUES (?, ?, ?)
  `);

  defaultTypes.forEach(type => {
    insertType.run(type.id, type.name, type.complexity);
  });
}

export default db;

