const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateUser, validateLogin } = require('../middleware/validation');
const { users } = require('../db/inMemoryDb');

const router = express.Router();

const PRIVATE_KEY = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
const PUBLIC_KEY = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'RS256';

router.post('/register', validateUser, async (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already exists' });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const role = (email === 'admin@email.com') ? 'admin' : 'user'; 
  const newUser = {
    id: uuidv4(),
    name,
    email,
    password: hashedPassword,
    teamId: null,
    role: role, 
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  console.log(`User registered: ${newUser.email} (Role: ${newUser.role})`);
  res.status(201).json({
    message: 'User created successfully',
    user: { 
      id: newUser.id, 
      name: newUser.name, 
      email: newUser.email, 
      teamId: newUser.teamId,
      role: newUser.role
    }
  });
});

router.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log('Login failed: user not found', email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.log('Login failed: password mismatch for', email);
    return res.status(401).json({ error: 'Invalid credentials' }); 
  }
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name, 
    teamId: user.teamId,
    role: user.role 
  };
  const token = jwt.sign(payload, PRIVATE_KEY, {
    algorithm: JWT_ALGORITHM,
    expiresIn: '7d'
  });
  console.log('Login successful:', user.email);
  res.json({
    message: 'Login successful',
    token,
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      teamId: user.teamId,
      role: user.role
    }
  });
});

router.get('/public-key', (req, res) => {
  res.json({ publicKey: PUBLIC_KEY });
});

router.get('/check-token', (req, res) => {
  const payload = {
    id: req.headers['x-user-id'],
    email: req.headers['x-user-email'],
    name: req.headers['x-user-name'],
    teamId: req.headers['x-user-teamid'],
    role: req.headers['x-user-role']
  };

  if (!payload.id) {
    return res.status(401).json({ error: 'Invalid token data provided by gateway' });
  }

  const token = jwt.sign(payload, PRIVATE_KEY, {
    algorithm: JWT_ALGORITHM,
    expiresIn: '7d' 
  });

  console.log(`Token refreshed for: ${payload.email}`);

  res.json({
    token,
    user: payload
  });
});

module.exports = router;