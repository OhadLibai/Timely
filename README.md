# Timely - AI-Powered Grocery Shopping Platform

## Overview
Timely is a full-stack e-commerce application that automates weekly grocery shopping using advanced machine learning algorithms. The platform predicts users' next basket based on historical purchase data, preferences, and shopping patterns.

### **Key Architectural Features**

- **Live ML Integration**: Two-stage prediction model with real database integration
- **Admin Demo System**: Configurable Instacart user seeding and prediction validation  
- **Enhanced Service Layer**: Dedicated ML service abstraction in backend
- **Comprehensive Frontend**: Complete admin dashboard with metrics and demo capabilities
- **Database-Driven Features**: ML predictions stored and tracked in PostgreSQL
- **Performance Monitoring**: Real-time model evaluation 
- **Flexible Demo Architecture**: Supports both live database and CSV-based demonstrations

## 🚀 Deployment Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for ML development)
- Git

1. **Clone the repository**:
```bash
git clone https://github.com/OhadLibai/timely.git
cd timely
```

2. **Download Instacart Dataset**:
   - Download from: https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis
   - Extract to `ml-service/training-data/` directory

### Quick Start with Docker

1. **Build and Start All Services**:
   ```bash
   docker-compose up --build -d
   ```

   This will:
   - Create PostgreSQL database
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
  - Password: password

- **Test User Account**:
  - Email: test@timely.com
  - Password: password

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

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### ML Service Development
```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn src.api.main:app --reload
```

### Database Setup
```bash
# Run migrations
npm run migrate

# Seed database
npm run seed
```

## Testing

### Run All Tests
```bash
docker-compose -f docker-compose.test.yml up
```

### Frontend Tests
```bash
cd frontend && npm test
```

### Backend Tests
```bash
cd backend && npm test
```

### ML Tests
```bash
cd ml-service && pytest
```

### **Maintenance**

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

## API Documentation

### Authentication
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

### Products
```http
GET /api/products?search=...
GET /api/products/:id
GET /api/products/search
GET /api/products/categories
```

### Cart & Orders
```http
GET /api/cart
POST /api/cart/add
PUT /api/cart/items/:itemId
DELETE /api/cart/items/:itemId
POST /api/orders/create
GET /api/orders
```

### Predictions
```http
GET /api/predictions/current-basket
POST /api/predictions/feedback
GET /api/predictions/metrics/online
```

### User Profile
```http
GET /api/users/profile
PUT /api/users/preferences
GET /api/users/favorites
POST /api/users/favorites/add
```

## 📊 Data & ML Pipeline

1. **Data Ingestion**: Instacart dataset (6 CSV files) processed in ml-service/training-data/
2. **Preprocessing & Feature Engineering**: Creates history, future, and feature datasets (internally)
3. **Model Training**: Two-stage stacked model: a LightGBM model + A Scikit-learn GradientBoostingClassifier
4. **Prediction Service**: Real-time predictions via FastAPI endpoints
5. **Performance Monitoring**: Metrics tracking with Precision@K, Recall@K, NDCG, F1
6. **Feedback Loop**: User interactions improve future predictions - Architecturely laid, further enhancements to be deployed

## ML Model Details

### Model Architecture
- **Internal Processing**: Advanced feature engineering and data preprocessing
- **Stage 1**: Candidate generation using ensemble methods
- **Stage 2**: Basket optimization and ranking
- **Output**: Personalized product recommendations with confidence scores

### Training Data
- Dataset: Instacart Market Basket Analysis
- Users: 200,000+
- Orders: 3.4M+
- Products: 50,000+

### Features
- User purchase history
- Product popularity
- Temporal patterns (day of week, time since last purchase)
- Category preferences
- Price sensitivity
- Seasonal trends

### Model Performance
- Precision@10:
- Recall@10:
- Hit Rate:
- NDCG: 
- F1: 

## ✨ Key Features

### User Features
- **Automated Weekly Cart Generation**: ML-powered predictions for weekly groceries
- **Smart Shopping**: Add items to cart with intelligent suggestions
- **Favorites Management**: Save and organize favorite products
- **Order History**: View past purchases and reorder easily
- **Personalized Dashboard**: Track spending, preferences, and recommendations
- **Delivery Scheduling**: Flexible delivery options

### Admin Features
- **Analytics Dashboard**: Real-time metrics and model performance
- **Model Evaluation**: On-demand performance assessment  
- **ML Model Monitoring**: Track prediction accuracy and performance metrics
- **Demo Simulation**: Interactive prediction demonstrations
- **User Management**: Monitor user activity and preferences

### ML Features
- **Real-time Predictions**: Dynamic basket recommendations
- **Adaptive Learning**: Continuously improves with user feedback - To be tailored in the future
- **Performance Metrics**: Precision@K, Recall@K, Hit Rate, NDCG, F1

## 🛠️ Technology Stack

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for global state
- **Data Fetching**: React Query for API management
- **Charts**: Recharts for analytics visualization

### Backend Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **ORM**: Sequelize for PostgreSQL interaction
- **Authentication**: JWT with refresh token rotation
- **Validation**: Express-validator for input sanitization
- **Logging**: Winston with structured logging
- **Testing**: Jest with Supertest for API testing

### ML Service Stack
- **Framework**: FastAPI with async/await support
- **ML Library**: LightGBM for gradient boosting + Scikit-learn GradientBoostingClassifier
- **Data Processing**: Pandas, NumPy for data manipulation
- **Database**: SQLAlchemy for PostgreSQL access
- **Performance**: Optimized database queries for fast responses
- **Evaluation**: Scikit-learn for metrics calculation
- **Testing**: Pytest with fixtures

### Infrastructure Stack
- **Database**: PostgreSQL 13+ with optimized indexes
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **Reverse Proxy**: Nginx (development)
- **Monitoring**: Health checks and metrics endpoints