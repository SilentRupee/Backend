import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRoutes } from './modules/auth';
import customerRoutes from './modules/customer/routes/customerRoutes';
import { errorHandler } from './modules/shared/validation/validationMiddleware';
import { productRoute } from './modules/product/routes/productRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/check", (req: express.Request, res: express.Response) => {
  console.log("dasd");
  const che = "dasda";
   res.json("asdasd");
});
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use("/api",productRoute)

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


app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`👤 Customer endpoints: http://localhost:${PORT}/api/customer`);
});

export default app;
