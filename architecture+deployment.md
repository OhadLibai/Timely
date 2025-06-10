# Timely E-Commerce Application - Architecture & Deployment Guide

## 🏗️ Project Architecture

```
timely/
├── frontend/                    # React TypeScript Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── layouts/           # Layout components
│   │   ├── services/          # API services
│   │   ├── stores/            # Zustand state management
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Utility functions
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static assets
│   ├── vite.config.ts         # Vite configuration
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   ├── package.json           # Frontend dependencies
│   └── Dockerfile             # Frontend container config
│
├── backend/                    # Node.js/Express Backend
│   ├── src/
│   │   ├── routes/            # API route definitions
│   │   ├── controllers/       # Route controllers
│   │   ├── models/            # Sequelize models
│   │   ├── middleware/        # Express middleware
│   │   ├── services/          # Business logic services
│   │   ├── config/            # Configuration files
│   │   ├── jobs/              # Background jobs
│   │   └── utils/             # Utility functions
│   ├── uploads/               # File uploads directory
│   ├── package.json           # Backend dependencies
│   └── Dockerfile             # Backend container config
│
├── ml-service/                 # Python ML Service
│   ├── src/
│   │   ├── api/               # FastAPI endpoints
│   │   ├── models/            # ML model implementations
│   │   ├── preprocessing/     # Data preprocessing
│   │   ├── training/          # Model training scripts
│   │   ├── services/          # ML services
│   │   └── utils/             # Utility functions
│   ├── data/                  # Dataset storage
│   ├── models/                # Trained model storage
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile             # ML service container config
│
├── database/                   # Database configuration
│   ├── init.sql              # Database initialization
│   ├── migrations/            # Database migrations
│   └── seeds/                 # Seed data
│
├── docker-compose.yml         # Docker orchestration
├── .env.example              # Environment variables template
└── README.md                 # Project documentation
```

## 🚀 Deployment Instructions

### Prerequisites

1. **Install Required Software**:
   - Docker Desktop (latest version)
   - Git
   - Node.js 18+ (for local development)
   - Python 3.9+ (for ML development)

2. **Clone the Repository**:
   ```bash
   git clone https://github.com/OhadLibai/timely.git
   cd timely
   ```

3. **Download Instacart Dataset**:
   - Download from: https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis
   - Extract to `ml-service/data/` directory

### Environment Setup

1. **Create Environment Files**:
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   
   # Frontend
   cp frontend/.env.example frontend/.env
   
   # ML Service
   cp ml-service/.env.example ml-service/.env
   ```

2. **Configure Environment Variables**:
   
   **backend/.env**:
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=postgresql://timely_user:timely_password@postgres:5432/timely_db
   REDIS_URL=redis://redis:6379
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
   ML_SERVICE_URL=http://ml-service:8000
   FRONTEND_URL=http://localhost:3000
   ```

   **frontend/.env**:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_ML_API_URL=http://localhost:8000/api
   ```

   **ml-service/.env**:
   ```env
   DATABASE_URL=postgresql://timely_user:timely_password@postgres:5432/timely_db
   REDIS_URL=redis://redis:6379
   MODEL_PATH=/app/models
   ```

### Quick Start with Docker

1. **Build and Start All Services**:
   ```bash
   docker-compose up --build -d
   ```

   This will:
   - Create PostgreSQL database
   - Start Redis cache
   - Build and start the backend API
   - Build and start the ML service
   - Build and start the frontend
   - Run database migrations
   - Seed initial data
   - Train the ML model

2. **Monitor the Progress**:
   ```bash
   # View all logs
   docker-compose logs -f
   
   # View specific service logs
   docker-compose logs -f backend
   docker-compose logs -f ml-service
   ```

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - ML Service API: http://localhost:8000
   - Admin Dashboard: http://localhost:3000/admin

### Default Credentials

- **Admin Account**:
  - Email: admin@timely.com
  - Password: admin123

- **Test User Account**:
  - Email: user@timely.com
  - Password: user123

### Verify Installation

1. **Check Service Health**:
   ```bash
   # Backend health
   curl http://localhost:5000/health
   
   # ML service health
   curl http://localhost:8000/health
   ```

2. **Test Core Features**:
   - Register a new account
   - Browse products
   - Add items to cart
   - View AI predictions (after login)
   - Complete a checkout

### Production Deployment

For production deployment, consider:

1. **Security**:
   - Change all default passwords
   - Use strong JWT secrets
   - Enable HTTPS with SSL certificates
   - Implement rate limiting
   - Add CORS restrictions

2. **Scaling**:
   - Use Kubernetes for orchestration
   - Implement horizontal scaling for services
   - Use managed database services (AWS RDS, etc.)
   - Implement CDN for static assets

3. **Monitoring**:
   - Set up Prometheus + Grafana
   - Implement error tracking (Sentry)
   - Set up log aggregation (ELK stack)
   - Monitor ML model performance

4. **CI/CD Pipeline**:
   ```yaml
   # Example GitHub Actions workflow
   name: Deploy to Production
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Build and push Docker images
           # Build steps here
         - name: Deploy to Kubernetes
           # Deployment steps here
   ```

### Troubleshooting

1. **Database Connection Issues**:
   ```bash
   # Check PostgreSQL status
   docker-compose ps postgres
   
   # View database logs
   docker-compose logs postgres
   ```

2. **ML Model Not Loading**:
   ```bash
   # Retrain model manually
   docker-compose run ml-service python -m src.training.train_model
   ```

3. **Frontend Build Issues**:
   ```bash
   # Rebuild frontend
   docker-compose build --no-cache frontend
   ```

4. **Clear All Data and Start Fresh**:
   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

### Maintenance

1. **Backup Database**:
   ```bash
   docker-compose exec postgres pg_dump -U timely_user timely_db > backup.sql
   ```

2. **Update Dependencies**:
   ```bash
   # Frontend
   cd frontend && npm update
   
   # Backend
   cd backend && npm update
   
   # ML Service
   cd ml-service && pip install -r requirements.txt --upgrade
   ```

3. **Retrain ML Model**:
   ```bash
   docker-compose exec ml-service python -m src.training.train_model
   ```

## 📊 Key Features Implemented

✅ **User Management**
- Registration/Login with JWT authentication
- Role-based access control (User/Admin)
- Profile management
- Password reset functionality

✅ **Product Catalog**
- Advanced search and filtering
- Category navigation
- Product recommendations
- Stock management
- Dynamic pricing with sales

✅ **Shopping Cart**
- Real-time cart updates
- Guest cart support
- Cart persistence
- Stock validation

✅ **ML-Powered Predictions**
- Next basket prediction using LightGBM
- Personalized recommendations
- Confidence scoring
- Prediction explanations
- Continuous learning from user feedback

✅ **Order Management**
- Multiple delivery options
- Order tracking
- Order history
- Reorder functionality

✅ **Admin Dashboard**
- Real-time analytics
- User management
- Product management
- ML model monitoring
- System health metrics

✅ **Additional Features**
- Dark mode support
- Responsive design
- Real-time notifications
- Advanced search
- Favorites management
- Automated weekly baskets

## 🎯 Performance Optimizations

- Redis caching for frequently accessed data
- Lazy loading for images
- Code splitting for optimal bundle sizes
- Database query optimization with indexes
- Background job processing
- WebSocket support for real-time features

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Secure headers

## 📈 Monitoring & Analytics

- Model performance metrics (Precision@K, Recall@K, NDCG)
- Online metrics (acceptance rate, cart value uplift)
- User behavior analytics
- System health monitoring
- Error tracking and logging

This completes the comprehensive e-commerce application with all requested features!