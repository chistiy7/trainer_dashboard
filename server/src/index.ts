import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database';
import workoutsRouter from './routes/workouts';
import exercisesRouter from './routes/exercises';
import exerciseTypesRouter from './routes/exerciseTypes';

const app = express();
const PORT = process.env.PORT || 3001;

initializeDatabase();

app.use(cors());
app.use(express.json());

app.use('/api/workouts', workoutsRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/exercise-types', exerciseTypesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

