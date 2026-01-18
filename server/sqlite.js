// sqlite.js
import Database from 'better-sqlite3';
import path from 'path';
import readline from 'readline';

// Путь к твоей базе данных
const dbPath = path.join(process.cwd(), 'data', 'workouts.db'); 
const db = new Database(dbPath);

// Создаём интерактивный интерфейс для ввода запросов
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'sqlite> '
});

console.log('SQLite CLI через Node.js');
console.log('Введите SQL-запрос или "exit" для выхода');
rl.prompt();

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (trimmed.toLowerCase() === 'exit') {
    rl.close();
    return;
  }

  try {
    const stmt = db.prepare(trimmed);

    if (trimmed.toLowerCase().startsWith('select')) {
      const rows = stmt.all();
      console.table(rows);
    } else {
      const info = stmt.run();
      console.log('Успешно выполнено:', info);
    }
  } catch (err) {
    console.error('Ошибка:', err.message);
  }

  rl.prompt();
}).on('close', () => {
  console.log('Выход.');
  process.exit(0);
});
