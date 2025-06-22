# Timely - AI-Powered Grocery Shopping Platform

## Overview
Timely is a full-stack e-commerce application that automates weekly grocery shopping using advanced machine learning algorithms. The platform predicts users' next basket based on historical purchase data, preferences, and shopping patterns.

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                TIMELY PLATFORM                                 │
│                         AI-Powered Grocery Shopping                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                    │
│                        React TypeScript + Vite                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Pages Architecture:                                                             │
│ ├── Public Pages: Home, Products, Login, Register, Cart, Checkout             │
│ ├── User Pages: Orders, Profile, Favorites, PredictedBasket                   │
│ └── Admin Pages: Dashboard, Metrics, DemoPredictionPage, Management           │
│                                                                                │
│ Component Organization:                                                         │
│ ├── /common: LoadingSpinner, ErrorBoundary, Pagination, EmptyState           │
│ ├── /products: ProductCard, CategoryFilter, PriceRangeFilter, SortDropdown    │
│ ├── /predictions: ConfidenceIndicator, PredictionExplanation                  │
│ ├── /admin: MetricCard, DateRangePicker, MetricExplanation                    │
│ ├── /auth: ProtectedRoute, AdminRoute                                         │
│ └── /navigation: MobileMenu, CartDropdown, NotificationDropdown              │
│                                                                                │
│ State Management:                                                              │
│ ├── Zustand Stores: auth.store.ts, cart.store.ts                            │
│ ├── React Query: API caching and synchronization                             │
│ └── Service Layer: 7 dedicated API services                                   │
│                                                                                │
│ Key Features:                                                                  │
│ ├── Lazy loading with React.lazy                                             │
│ ├── Layout system: MainLayout, AuthLayout, AdminLayout                       │
│ ├── Tailwind CSS + Framer Motion animations                                  │
│ └── Mobile-responsive design                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │ HTTP/REST API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND LAYER                                     │
│                         Node.js + Express + TypeScript                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Controllers (RESTful APIs):                                                     │
│ ├── auth.controller.ts: Authentication, JWT tokens                           │
│ ├── user.controller.ts: Profile management, preferences                      │
│ ├── product.controller.ts: CRUD, search, categories                         │
│ ├── cart.controller.ts: Shopping cart operations                             │
│ ├── order.controller.ts: Order management, history                           │
│ ├── prediction.controller.ts: ML prediction endpoints                        │
│ └── admin.controller.ts: Dashboard, metrics, demo operations                 │
│                                                                                │
│ Database Models (Sequelize ORM):                                              │
│ ├── Core: User, Product, Category, Cart, Order                               │
│ ├── Relations: CartItem, OrderItem, Favorite                                 │
│ ├── ML: PredictedBasket, PredictedBasketItem, ModelMetric                   │
│ └── Analytics: UserPreference, ProductView                                    │
│                                                                                │
│ Middleware Stack:                                                              │
│ ├── Security: Helmet, CORS, Rate limiting                                    │
│ ├── Auth: JWT validation, role-based access                                  │
│ ├── Validation: Express-validator                                            │
│ ├── Logging: Winston structured logging                                       │
│ └── Error: Global error handling, async wrapper                              │
│                                                                                │
│ Services Integration:                                                          │
│ ├── ml.service.ts: ML API client (axios-based)                              │
│ └── email.service.ts: Transactional emails                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │ HTTP API Calls
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ML SERVICE LAYER                                    │
│                           Python FastAPI + ML Stack                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ API Endpoints:                                                                 │
│ ├── /predict/from-database: Live predictions using user's DB history         │
│ ├── /predict/for-demo: Demo predictions from Instacart CSV data              │
│ ├── /evaluate/model: On-demand model performance evaluation                   │
│ ├── /model/feature-importance: Model interpretability                        │
│ └── /demo-data/*: CSV-based demo utilities for admin functions               │
│                                                                                │
│ Two-Stage ML Architecture:                                                     │
│ ├── Stage 1: CandidateGenerator (LightGBM)                                   │
│ │   └── Generates 3 candidate baskets + meta-features                        │
│ └── Stage 2: BasketSelector (GradientBoostingClassifier)                     │
│     └── Selects optimal basket from candidates                               │
│                                                                                │
│ Feature Engineering:                                                           │
│ ├── DatabaseFeatureEngineer: Live database features                          │
│ ├── EnhancedFeatureEngineer: Historical pattern analysis                     │
│ └── 50+ engineered features: temporal, behavioral, product-based             │
│                                                                                │
│ Model Components:                                                              │
│ ├── StackedBasketModel: Orchestrates 2-stage prediction                      │
│ ├── PredictionService: Business logic wrapper                                │
│ ├── BasketPredictionEvaluator: Performance metrics                           │
│ └── Trained models: stage1_lgbm.pkl, stage2_gbm.pkl                         │
│                                                                                │
│ Data Sources:                                                                  │
│ ├── Live Database: Real user interactions                                     │
│ └── Instacart Dataset: 200K+ users, 3.4M+ orders, 50K+ products            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │ SQL Connections
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                      │
│                              PostgreSQL 13+                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Core Tables:                                                                   │
│ ├── users: Authentication, profile, preferences                              │
│ ├── products: Catalog, pricing, categories, metadata                         │
│ ├── orders: Transaction history, order management                             │
│ ├── carts: Active shopping sessions                                          │
│ └── categories: Product organization, hierarchy                               │
│                                                                                │
│ ML-Specific Tables:                                                            │
│ ├── predicted_baskets: AI recommendations storage                            │
│ ├── model_metrics: Performance tracking                                       │
│ ├── user_preferences: Personalization data                                   │
│ └── product_views: Behavioral analytics                                       │
│                                                                                │
│ Features:                                                                      │
│ ├── Optimized indexes for performance                                        │
│ ├── Foreign key constraints for data integrity                               │
│ ├── Health checks and connection pooling                                     │
│ └── Automated migrations and seeding                                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          INFRASTRUCTURE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Docker Compose Orchestration:                                                 │
│ ├── db: PostgreSQL database container                                        │
│ ├── init-db: Database seeding service                                        │
│ ├── backend: Node.js API server                                              │
│ ├── frontend: React production build                                         │
│ └── ml-service: Python FastAPI ML server                                     │
│                                                                                │
│ Network Architecture:                                                          │
│ ├── timely-network: Internal Docker network                                  │
│ ├── Port mapping: Frontend:3000, Backend:5000, ML:8000, DB:5432             │
│ └── Health checks and restart policies                                       │
│                                                                                │
│ Development Tools:                                                             │
│ ├── Testing scripts: deploy.sh, system_validation_script.sh                 │
│ ├── Environment management: .env configuration                               │
│ └── Multi-stage Dockerfiles for optimization                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN CAPABILITIES                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Dashboard Analytics:                                                           │
│ ├── Real-time metrics: Users, orders, revenue                               │
│ ├── Performance charts with Recharts                                         │
│ └── Date range filtering and trend analysis                                   │
│                                                                                │
│ ML Model Management:                                                           │
│ ├── On-demand model evaluation (Precision@K, Recall@K, F1, NDCG)           │
│ ├── Feature importance visualization                                         │
│ └── Live prediction demonstrations                                            │
│                                                                                │
│ Demo System:                                                                   │
│ ├── Configurable user seeding from Instacart data                           │
│ ├── Live prediction vs ground truth comparison                               │
│ └── Interactive ML performance validation                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│ User Prediction Flow:                                                          │
│ Frontend → Backend → ML Service → Database → Feature Engineering → Model      │
│ ←─────── ←─────── ←─────────── ←──────── ←────────────────── ←─────           │
│                                                                                │
│ Admin Demo Flow:                                                               │
│ Admin Input → CSV Processing → Feature Generation → ML Prediction             │
│ ←────────── ←─────────────── ←─────────────────── ←─────────────             │
│                                                                                │
│ Model Evaluation Flow:                                                         │
│ Admin Request → ML Evaluator → Instacart Dataset → Performance Metrics        │
│ ←──────────── ←───────────── ←─────────────────── ←──────────────           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### **Key Architectural Features**

- **Live ML Integration**: Two-stage prediction model with real database integration
- **Admin Demo System**: Configurable Instacart user seeding and prediction validation  
- **Enhanced Service Layer**: Dedicated ML service abstraction in backend
- **Comprehensive Frontend**: Complete admin dashboard with metrics and demo capabilities
- **Database-Driven Features**: ML predictions stored and tracked in PostgreSQL
- **Performance Monitoring**: Real-time model evaluation and feature importance
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

3. **Retrain ML Model**:
   ```bash
   docker-compose exec ml-service python -m src.training.train_model
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
GET /api/products
GET /api/products/:id
GET /api/products/search
GET /api/products/categories
```

### Cart & Orders
```http
GET /api/cart
POST /api/cart/add
PUT /api/cart/update
DELETE /api/cart/remove
POST /api/orders/create
GET /api/orders/history
```

### Predictions
```http
GET /api/predictions/next-basket
POST /api/predictions/feedback
GET /api/predictions/metrics
```

### User Profile
```http
GET /api/user/profile
PUT /api/user/preferences
GET /api/user/favorites
POST /api/user/favorites/add
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
- **Product Management**: Add, edit, and categorize products
- **User Management**: Monitor user activity and preferences

### ML Features
- **Real-time Predictions**: Dynamic basket recommendations
- **Adaptive Learning**: Continuously improves with user feedback
- **Performance Metrics**: Precision@K, Recall@K, Hit Rate, NDCG, F1

## 🛠️ Technology Stack

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for global state
- **Data Fetching**: React Query for API management
- **Charts**: Recharts for analytics visualization
- **Testing**: Vitest + React Testing Library

### Backend Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **ORM**: Sequelize for PostgreSQL interaction
- **Authentication**: JWT with refresh token rotation
- **Validation**: Express-validator for input sanitization
- **File Upload**: Multer with size/type restrictions
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
- **Reverse Proxy**: Nginx (production)
- **Monitoring**: Health checks and metrics endpoints

## Monitoring
- **Application Metrics**: Prometheus + Grafana
- **ML Metrics**: MLflow tracking
- **Logs**: ELK Stack integration
- **Error Tracking**: Sentry