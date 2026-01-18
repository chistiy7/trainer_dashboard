-- SQL запрос для получения списка всех упражнений
-- Выводит упражнения с информацией о типе упражнения и тренировке

SELECT 
    e.id,
    e.description,
    e.time_minutes,
    e.workout_id,
    et.name as exercise_type_name,
    et.complexity,
    w.description as workout_description
FROM exercises e
JOIN exercise_types et ON e.exercise_type_id = et.id
JOIN workouts w ON e.workout_id = w.id
ORDER BY e.id;

-- Альтернативный вариант: только основные поля упражнений
-- SELECT * FROM exercises ORDER BY id;

-- Вариант с группировкой по типу упражнения
-- SELECT 
--     et.name as exercise_type_name,
--     COUNT(e.id) as exercise_count,
--     SUM(e.time_minutes) as total_time_minutes
-- FROM exercises e
-- JOIN exercise_types et ON e.exercise_type_id = et.id
-- GROUP BY et.id, et.name
-- ORDER BY et.name;

