const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken'); // Ini yang menyebabkan error 'Cannot find module'
const axios = require('axios'); // Ini juga diperlukan
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
// Menggunakan variabel lingkungan BARU dari file .env Anda
const USER_SERVICE_URL = process.env.USER_SERVICE_URL;
const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL;

let PUBLIC_KEY = null;

// Fungsi untuk mengambil Public Key dari User Service
const fetchPublicKey = async () => {
  try {
    // Memanggil rute public-key di user-service
    console.log(`Fetching public key from ${USER_SERVICE_URL}/api/auth/public-key`);
    const response = await axios.get(`${USER_SERVICE_URL}/api/auth/public-key`);
    PUBLIC_KEY = response.data.publicKey;
    console.log('Public key fetched successfully.');
  } catch (error) {
    // Ini akan gagal jika user-service juga crash, tapi akan terus mencoba
    console.error('Failed to fetch public key. Retrying in 5 seconds...', error.message);
    setTimeout(fetchPublicKey, 5000);
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3002', // Frontend
    'http://frontend-app:3000' // Docker frontend
  ],
  credentials: true
}));
app.use(express.json()); // Penting untuk fixRequestBody

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Middleware Verifikasi JWT
const checkJwt = (req, res, next) => {
  if (!PUBLIC_KEY) {
    // Ini adalah error yang Anda lihat
    return res.status(503).json({ error: 'Service unavailable. Public key not yet fetched.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Malformed token' });
  }

  try {
    const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: [process.env.JWT_ALGORITHM || 'RS256'] });
    req.user = decoded; // Melampirkan data user ke request
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      'user-service': USER_SERVICE_URL,
      'task-service': TASK_SERVICE_URL
    }
  });
});

// Proxy Options (DIPERBARUI)
const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    if (req.user) {
      // TERUSKAN SEMUA DATA USER
      proxyReq.setHeader('X-User-Id', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
      proxyReq.setHeader('X-User-Name', req.user.name || ''); // TAMBAHKAN INI
      proxyReq.setHeader('X-User-TeamId', req.user.teamId || '');
      proxyReq.setHeader('X-User-Role', req.user.role || 'user');
    }
    if (req.body) {
      fixRequestBody(proxyReq, req);
    }
  },
  onError: (err, req, res) => {
    console.error(`Proxy Error to ${target}:`, err.message);
    res.status(502).json({ error: 'Service unavailable', message: err.message });
  }
});

// --- PERUTEAN PROXY (DIPERBARUI) ---

// 1. Rute Auth Publik
const publicAuthProxy = createProxyMiddleware({
  target: USER_SERVICE_URL, // Menggunakan variabel BARU
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
     console.log(`[AUTH-PUBLIC] ${req.method} ${req.url} -> ${proxyReq.path}`);
     if (req.body) {
        fixRequestBody(proxyReq, req);
     }
  },
  onError: (err, req, res) => {
    console.error('Auth Proxy Error:', err.message);
    res.status(502).json({ error: 'Auth service unavailable', message: err.message });
  }
});
app.use('/api/auth/login', publicAuthProxy);
app.use('/api/auth/register', publicAuthProxy);
app.use('/api/auth/public-key', publicAuthProxy);

// 2. Rute Auth Privat (membutuhkan token yang valid)
app.use('/api/auth/check-token', checkJwt, createProxyMiddleware(proxyOptions(USER_SERVICE_URL)));

// 3. Rute Lain yang Diproteksi
app.use('/api/users', checkJwt, createProxyMiddleware(proxyOptions(USER_SERVICE_URL)));
app.use('/api/teams', checkJwt, createProxyMiddleware(proxyOptions(USER_SERVICE_URL)));
app.use('/graphql', checkJwt, createProxyMiddleware({
  ...proxyOptions(TASK_SERVICE_URL),
  ws: true 
}));

// --- AKHIR PERUTEAN ---

// Catch-all
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Mulai server
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  fetchPublicKey(); // Ambil public key saat startup
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated');
  });
});