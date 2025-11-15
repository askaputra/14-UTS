const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { teams, users } = require('../db/inMemoryDb');
const { validateTeam } = require('../middleware/validation');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(teams);
});

router.post('/', validateTeam, (req, res) => {
  const { name } = req.body;
  const newTeam = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString()
  };
  teams.push(newTeam);
  res.status(201).json(newTeam);
});

router.get('/:id', (req, res) => {
  const team = teams.find(t => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  res.json(team);
});

router.get('/:id/users', (req, res) => {
  const teamUsers = users
    .filter(u => u.teamId === req.params.id)
    .map(u => ({ id: u.id, name: u.name, email: u.email }));
  res.json(teamUsers);
});

module.exports = router;