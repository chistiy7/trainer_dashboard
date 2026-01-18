import express from 'express';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const workouts = db.prepare('SELECT * FROM workouts ORDER BY id').all();
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json(workout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

router.post('/', (req, res) => {
  try {
    const { description, duration_hours, duration_minutes } = req.body;
    
    if (!description || duration_hours === undefined || duration_minutes === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO workouts (id, description, duration_hours, duration_minutes)
      VALUES (?, ?, ?, ?)
    `).run(id, description, duration_hours || 0, duration_minutes || 0);

    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);
    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { description, duration_hours, duration_minutes } = req.body;
    
    if (!description || duration_hours === undefined || duration_minutes === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = db.prepare(`
      UPDATE workouts 
      SET description = ?, duration_hours = ?, duration_minutes = ?
      WHERE id = ?
    `).run(description, duration_hours, duration_minutes, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
    res.json(workout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM workouts WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

router.get('/:id/validation', (req, res) => {
  try {
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const exercises = db.prepare(`
      SELECT e.*, et.name as exercise_type_name, et.complexity
      FROM exercises e
      JOIN exercise_types et ON e.exercise_type_id = et.id
      WHERE e.workout_id = ?
    `).all(req.params.id);

    const totalComplexity = exercises.reduce((sum, ex) => sum + ex.complexity, 0);
    const totalTime = exercises.reduce((sum, ex) => sum + ex.time_minutes, 0);
    const workoutTotalMinutes = (workout.duration_hours * 60) + workout.duration_minutes;

    res.json({
      workout,
      exercises,
      totalComplexity,
      totalTime,
      workoutTotalMinutes,
      complexityExceeded: totalComplexity > 10,
      timeExceeded: totalTime > workoutTotalMinutes
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout validation' });
  }
});

export default router;

