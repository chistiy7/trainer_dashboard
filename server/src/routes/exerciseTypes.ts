import express from 'express';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const types = db.prepare('SELECT * FROM exercise_types ORDER BY name').all();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exercise types' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const type = db.prepare('SELECT * FROM exercise_types WHERE id = ?').get(req.params.id);
    if (!type) {
      return res.status(404).json({ error: 'Exercise type not found' });
    }
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exercise type' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, complexity } = req.body;
    
    if (!name || complexity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (complexity < 1 || complexity > 5) {
      return res.status(400).json({ error: 'Complexity must be between 1 and 5' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO exercise_types (id, name, complexity)
      VALUES (?, ?, ?)
    `).run(id, name, complexity);

    const type = db.prepare('SELECT * FROM exercise_types WHERE id = ?').get(id);
    res.status(201).json(type);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Exercise type with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create exercise type' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, complexity } = req.body;
    
    if (!name || complexity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (complexity < 1 || complexity > 5) {
      return res.status(400).json({ error: 'Complexity must be between 1 and 5' });
    }

    const result = db.prepare(`
      UPDATE exercise_types 
      SET name = ?, complexity = ?
      WHERE id = ?
    `).run(name, complexity, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Exercise type not found' });
    }

    const type = db.prepare('SELECT * FROM exercise_types WHERE id = ?').get(req.params.id);
    res.json(type);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Exercise type with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update exercise type' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const exercises = db.prepare('SELECT COUNT(*) as count FROM exercises WHERE exercise_type_id = ?').get(req.params.id);
    if (exercises.count > 0) {
      return res.status(400).json({ error: 'Cannot delete exercise type that is used in exercises' });
    }

    const result = db.prepare('DELETE FROM exercise_types WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Exercise type not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exercise type' });
  }
});

export default router;

