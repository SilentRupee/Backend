import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRoutes } from './Auth';
import { errorHandler } from './Auth/validationMiddleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} is not a valid route` 
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
});

export default app;
