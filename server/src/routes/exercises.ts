import express from 'express';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/workout/:workoutId', (req, res) => {
  try {
    const exercises = db.prepare(`
      SELECT e.*, et.name as exercise_type_name, et.complexity
      FROM exercises e
      JOIN exercise_types et ON e.exercise_type_id = et.id
      WHERE e.workout_id = ?
      ORDER BY e.id
    `).all(req.params.workoutId);
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const exercise = db.prepare(`
      SELECT e.*, et.name as exercise_type_name, et.complexity
      FROM exercises e
      JOIN exercise_types et ON e.exercise_type_id = et.id
      WHERE e.id = ?
    `).get(req.params.id);
    
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exercise' });
  }
});

router.post('/', (req, res) => {
  try {
    const { workout_id, description, exercise_type_id, time_minutes } = req.body;
    
    if (!workout_id || !description || !exercise_type_id || !time_minutes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workout_id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const exerciseType = db.prepare('SELECT * FROM exercise_types WHERE id = ?').get(exercise_type_id);
    if (!exerciseType) {
      return res.status(404).json({ error: 'Exercise type not found' });
    }

    const currentExercises = db.prepare(`
      SELECT e.*, et.complexity
      FROM exercises e
      JOIN exercise_types et ON e.exercise_type_id = et.id
      WHERE e.workout_id = ?
    `).all(workout_id);

    const currentTotalComplexity = currentExercises.reduce((sum, ex) => sum + ex.complexity, 0);
    const currentTotalTime = currentExercises.reduce((sum, ex) => sum + ex.time_minutes, 0);
    const workoutTotalMinutes = (workout.duration_hours * 60) + workout.duration_minutes;

    const newTotalComplexity = currentTotalComplexity + exerciseType.complexity;
    const newTotalTime = currentTotalTime + time_minutes;

    const complexityExceeded = newTotalComplexity > 10;
    const timeExceeded = newTotalTime > workoutTotalMinutes;

    if (complexityExceeded || timeExceeded) {
      return res.status(400).json({
        error: 'Cannot add exercise',
        complexityExceeded,
        timeExceeded,
        currentTotalComplexity,
        newTotalComplexity,
        currentTotalTime,
        newTotalTime,
        workoutTotalMinutes
      });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO exercises (id, workout_id, description, exercise_type_id, time_minutes)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, workout_id, description, exercise_type_id, time_minutes);

    const exercise = db.prepare(`
      SELECT e.*, et.name as exercise_type_name, et.complexity
      FROM exercises e
      JOIN exercise_types et ON e.exercise_type_id = et.id
      WHERE e.id = ?
    `).get(id);
    
    res.status(201).json(exercise);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { description, exercise_type_id, time_minutes, workout_id } = req.body;
    
    if (!description || !exercise_type_id || !time_minutes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const currentExercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
    if (!currentExercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const targetWorkoutId = workout_id || currentExercise.workout_id;

    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(targetWorkoutId);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const exerciseType = db.prepare('SELECT * FROM exercise_types WHERE id = ?').get(exercise_type_id);
    if (!exerciseType) {
      return res.status(404).json({ error: 'Exercise type not found' });
    }

    const currentExercises = db.prepare(`
      SELECT e.*, et.complexity
      FROM exercises e
      JOIN exercise_types et ON e.exercise_type_id = et.id
      WHERE e.workout_id = ? AND e.id != ?
    `).all(targetWorkoutId, req.params.id);

    const currentTotalComplexity = currentExercises.reduce((sum, ex) => sum + ex.complexity, 0);
    const currentTotalTime = currentExercises.reduce((sum, ex) => sum + ex.time_minutes, 0);
    const workoutTotalMinutes = (workout.duration_hours * 60) + workout.duration_minutes;

    const newTotalComplexity = currentTotalComplexity + exerciseType.complexity;
    const newTotalTime = currentTotalTime + time_minutes;

    const complexityExceeded = newTotalComplexity > 10;
    const timeExceeded = newTotalTime > workoutTotalMinutes;

    if (complexityExceeded || timeExceeded) {
      return res.status(400).json({
        error: 'Cannot update exercise',
        complexityExceeded,
        timeExceeded,
        currentTotalComplexity,
        newTotalComplexity,
        currentTotalTime,
        newTotalTime,
        workoutTotalMinutes
      });
    }

    db.prepare(`
      UPDATE exercises 
      SET description = ?, exercise_type_id = ?, time_minutes = ?, workout_id = ?
      WHERE id = ?
    `).run(description, exercise_type_id, time_minutes, targetWorkoutId, req.params.id);

    const exercise = db.prepare(`
      SELECT e.*, et.name as exercise_type_name, et.complexity
      FROM exercises e
      JOIN exercise_types et ON e.exercise_type_id = et.id
      WHERE e.id = ?
    `).get(req.params.id);
    
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

router.post('/:id/move', (req, res) => {
  try {
    const { target_workout_id } = req.body;
    
    if (!target_workout_id) {
      return res.status(400).json({ error: 'Missing target_workout_id' });
    }

    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const targetWorkout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(target_workout_id);
    if (!targetWorkout) {
      return res.status(404).json({ error: 'Target workout not found' });
    }

    const exerciseType = db.prepare('SELECT * FROM exercise_types WHERE id = ?').get(exercise.exercise_type_id);
    
    const targetExercises = db.prepare(`
      SELECT e.*, et.complexity
      FROM exercises e
      JOIN exercise_types et ON e.exercise_type_id = et.id
      WHERE e.workout_id = ?
    `).all(target_workout_id);

    const currentTotalComplexity = targetExercises.reduce((sum, ex) => sum + ex.complexity, 0);
    const currentTotalTime = targetExercises.reduce((sum, ex) => sum + ex.time_minutes, 0);
    const workoutTotalMinutes = (targetWorkout.duration_hours * 60) + targetWorkout.duration_minutes;

    const newTotalComplexity = currentTotalComplexity + exerciseType.complexity;
    const newTotalTime = currentTotalTime + exercise.time_minutes;

    const complexityExceeded = newTotalComplexity > 10;
    const timeExceeded = newTotalTime > workoutTotalMinutes;

    if (complexityExceeded || timeExceeded) {
      return res.status(400).json({
        error: 'Cannot move exercise',
        complexityExceeded,
        timeExceeded,
        currentTotalComplexity,
        newTotalComplexity,
        currentTotalTime,
        newTotalTime,
        workoutTotalMinutes
      });
    }

    db.prepare('UPDATE exercises SET workout_id = ? WHERE id = ?').run(target_workout_id, req.params.id);

    const updatedExercise = db.prepare(`
      SELECT e.*, et.name as exercise_type_name, et.complexity
      FROM exercises e
      JOIN exercise_types et ON e.exercise_type_id = et.id
      WHERE e.id = ?
    `).get(req.params.id);
    
    res.json(updatedExercise);
  } catch (error) {
    res.status(500).json({ error: 'Failed to move exercise' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM exercises WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

export default router;

