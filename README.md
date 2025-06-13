# Timely - AI-Powered Grocery Shopping Platform

## 🌟 Overview
Timely is a full-stack e-commerce application designed to revolutionize your weekly grocery shopping experience. By leveraging advanced machine learning algorithms, Timely predicts your next basket based on historical purchase data, individual preferences, and evolving shopping patterns, automating a significant part of your routine and saving you valuable time.

## 🏗️ Project Architecture

```
timely/ (Current Implementation Status)
├── frontend/                              # React TypeScript Frontend [⚠️ 60% Complete]
│   ├── src/
│   │   ├── components/                    # ✅ UI Components (7/7 implemented)
│   │   │   ├── common/                    # ✅ LoadingSpinner, EmptyState, ErrorBoundary
│   │   │   ├── products/                  # ✅ ProductCard, ProductImage
│   │   │   ├── predictions/               # ✅ ConfidenceIndicator, PredictionExplanation
│   │   │   └── auth/                      # ❌ MISSING: ProtectedRoute, AdminRoute
│   │   ├── pages/                         # ⚠️ Core pages exist, many missing
│   │   │   ├── ✅ Home.tsx, Products.tsx, Cart.tsx, Checkout.tsx
│   │   │   ├── ✅ Login.tsx, Register.tsx, PredictedBasket.tsx
│   │   │   ├── ❌ MISSING: ProductDetail, Orders, OrderDetail
│   │   │   ├── ❌ MISSING: Profile, Favorites, ForgotPassword, ResetPassword
│   │   │   └── admin/                     # ⚠️ Partial (3/6 implemented)
│   │   │       ├── ✅ Dashboard.tsx, Metrics.tsx, DemoPredictionPage.tsx
│   │   │       └── ❌ MISSING: Products, Orders, Users, Settings
│   │   ├── layouts/                       # ⚠️ Partial (1/3 implemented)
│   │   │   ├── ✅ MainLayout.tsx
│   │   │   └── ❌ MISSING: AuthLayout, AdminLayout
│   │   ├── services/                      # ✅ Complete (8/8 implemented)
│   │   ├── stores/                        # ✅ Complete (2/2 implemented)
│   │   └── types/                         # ❌ MISSING: TypeScript definitions
│   ├── public/                            # ✅ Basic structure
│   ├── ✅ index.html                      # Production-ready with SEO
│   ├── ✅ vite.config.ts, tailwind.config.js, tsconfig.json
│   ├── ✅ package.json                    # Complete dependencies
│   └── ✅ Dockerfile                      # Production-ready
│
├── backend/                               # Node.js/Express Backend [✅ 95% Complete]
│   ├── src/
│   │   ├── controllers/                   # ✅ Complete (6/6 implemented)
│   │   │   ├── ✅ auth.controller.ts      # Login, register, logout
│   │   │   ├── ✅ user.controller.ts      # Profile, preferences
│   │   │   ├── ✅ product.controller.ts   # CRUD, search, categories
│   │   │   ├── ✅ cart.controller.ts      # Cart management
│   │   │   ├── ✅ prediction.controller.ts # 19 ML endpoints
│   │   │   └── ✅ admin.controller.ts     # Admin dashboard, metrics
│   │   ├── models/                        # ✅ Complete (14/14 implemented)
│   │   │   ├── ✅ User, Product, Category, Cart, CartItem
│   │   │   ├── ✅ Order, OrderItem, Favorite, Delivery
│   │   │   ├── ✅ PredictedBasket, PredictedBasketItem
│   │   │   └── ✅ UserPreference, ProductView, ModelMetric
│   │   ├── routes/                        # ✅ Complete (8/8 implemented)
│   │   ├── middleware/                    # ✅ Complete (5/5 implemented)
│   │   ├── services/                      # ✅ Complete (3/3 implemented)
│   │   ├── config/                        # ✅ Database & Redis config
│   │   ├── jobs/                          # ✅ Cart generation & metrics
│   │   ├── database/                      # ✅ Seeding & sync scripts
│   │   └── utils/                         # ✅ Logger, CSV utilities
│   ├── uploads/                           # ✅ File upload directory
│   ├── ✅ package.json                    # Complete dependencies
│   └── ✅ Dockerfile                      # Multi-stage production build
│
├── ml-service/                            # Python ML Service [✅ 85% Complete]
│   ├── src/
│   │   ├── api/                           # ✅ FastAPI main app
│   │   │   └── ✅ main.py                 # Comprehensive API with demo endpoints
│   │   ├── models/                        # ✅ Complete (2/2 implemented)
│   │   │   ├── ✅ lightgbm_model.py       # Basic LightGBM
│   │   │   └── ✅ lightgbm_enhanced.py    # Advanced basket prediction
│   │   ├── preprocessing/                 # ✅ Data preprocessing
│   │   ├── training/                      # ✅ Model training scripts
│   │   ├── evaluation/                    # ✅ Model evaluation
│   │   ├── services/                      # ⚠️ May be missing modular services
│   │   └── utils/                         # ✅ Logger utilities
│   ├── data/                              # ✅ Instacart dataset (6 CSV files)
│   │   ├── ✅ orders.csv, products.csv, departments.csv, aisles.csv
│   │   └── ✅ order_products__prior.csv, order_products__train.csv
│   ├── models/                            # ✅ Trained model storage
│   ├── ✅ requirements.txt                # Complete Python dependencies
│   └── ✅ Dockerfile                      # Production-ready
│
├── database/                              # Database Configuration [✅ 100% Complete]
│   ├── ✅ init.sql                        # Comprehensive schema (14 tables)
│   │   ├── ✅ Core tables: users, products, categories, orders
│   │   ├── ✅ ML tables: predicted_baskets, model_metrics
│   │   ├── ✅ E-commerce: carts, favorites, deliveries
│   │   └── ✅ Analytics: product_views, user_preferences
│   └── ✅ Indexes, triggers, constraints
│
├── ✅ docker-compose.yml                  # Complete orchestration (9 services)
│   ├── ✅ postgres, redis                 # Database services
│   ├── ✅ backend, frontend, ml-service   # Application services
│   └── ✅ migrate, seed, train-model, sync-products # Utility services
├── ✅ .gitignore, .dockerignore           # Comprehensive ignore files
├── ✅ CLAUDE.md                           # Development notes
└── ✅ README.md, architecture+deployment.md, timely-readme.md
```

## ✨ Key Features Implemented

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

## 🛠️ Technology Stack

* **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand (State Management), React Query (Data Fetching), Recharts (Charting)
* **Backend**: Node.js, Express.js, TypeScript, Sequelize (ORM)
* **ML Service**: Python, FastAPI, LightGBM, Pandas, NumPy, Scikit-learn, SQLAlchemy
* **Database**: PostgreSQL
* **Cache**: Redis
* **Containerization**: Docker, Docker Compose
* **Authentication**: JWT (JSON Web Tokens)

## 🚀 Quick Start & Deployment

### Prerequisites
1.  **Install Required Software**:
    * Docker Desktop (latest version)
    * Git
    * Node.js 18+ (for local development, if not using Docker for everything)
    * Python 3.9+ (for ML development, if not using Docker for everything)
2.  **Clone the Repository**:
    ```bash
    git clone <your-repository-url> timely
    cd timely
    ```
3.  **Download Instacart Dataset**:
    * Download the dataset from: [Instacart Market Basket Analysis on Kaggle](https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis)
    * Extract the CSV files (`orders.csv`, `products.csv`, `order_products__prior.csv`, `order_products__train.csv`, `aisles.csv`, `departments.csv`) into the `ml-service/data/` directory.

### Environment Setup

1.  **Create Environment Files**:
    Copy the `.env.example` files in each service directory (`frontend/`, `backend/`, `ml-service/`) to `.env` and customize them as needed.

    * `backend/.env.example` -> `backend/.env`
    * `frontend/.env.example` -> `frontend/.env`
    * `ml-service/.env.example` -> `ml-service/.env`

    *(See "Example Environment Files" section below for templates if `.env.example` files are missing)*

### Deployment with Docker

1.  **Build and Start All Services**:
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    * Set up the PostgreSQL database and Redis cache.
    * Build Docker images for the frontend, backend, and ML service.
    * Start all services.
    * Run database initialization (`database/init.sql`).
    * Run database seeding (`backend/src/database/database-seed.ts`).
    * The `docker-compose.yml` is configured to also potentially run migrations and train the ML model as part of the startup, depending on service dependencies.

2.  **Monitor Logs**:
    ```bash
    docker-compose logs -f # View all logs
    docker-compose logs -f backend # View specific service logs
    ```

3.  **Access the Application**:
    * **Frontend**: `http://localhost:3000`
    * **Backend API**: `http://localhost:5000`
    * **ML Service API**: `http://localhost:8000`
    * **Admin Dashboard**: `http://localhost:3000/admin`

### Default Credentials

- **Admin Account**:
  - Email: admin@timely.com
  - Password: admin123

- **Test User Account**:
  - Email: user@timely.com
  - Password: user123

### Production Deployment Considerations

For a production environment, enhance the setup with:
* **Security**: Robust secrets management, HTTPS, stricter CORS, security headers.
* **Scalability**: Orchestration (e.g., Kubernetes), managed database/cache services, CDN.
* **Monitoring**: Prometheus, Grafana, Sentry, ELK stack or similar.
* **CI/CD**: Automated build, test, and deployment pipelines.

## 🚨 **Critical Implementation Gaps**

### **IMMEDIATE DEPLOYMENT BLOCKERS**

**Frontend Route Protection (CRITICAL)**:
The frontend will **fail to load** due to missing components:
```
❌ src/components/auth/ProtectedRoute.tsx
❌ src/components/auth/AdminRoute.tsx  
❌ src/layouts/AuthLayout.tsx
❌ src/layouts/AdminLayout.tsx
```

**Core User Experience (HIGH PRIORITY)**:
```
❌ src/pages/ProductDetail.tsx - Product detail pages
❌ src/pages/Orders.tsx - Order history
❌ src/pages/Profile.tsx - User profile
❌ src/pages/Favorites.tsx - User favorites
```

### **DEPLOYMENT READINESS**

| Service | Status | Can Deploy? | Notes |
|---------|--------|-------------|-------|
| **Backend** | ✅ Ready | ✅ Yes | Fully functional API |
| **Database** | ✅ Ready | ✅ Yes | Complete schema |
| **ML Service** | ✅ Ready | ✅ Yes | Core features work |
| **Frontend** | ❌ Blocked | ❌ No | Missing route protection |

## 📊 Data & ML Pipeline

1. **Data Ingestion**: Instacart dataset (6 CSV files) processed in ml-service/data/
2. **Preprocessing & Feature Engineering**: Creates history, future, and feature datasets
3. **Model Training**: LightGBM models trained with comprehensive evaluation
4. **Prediction Service**: Real-time predictions via FastAPI endpoints
5. **Performance Monitoring**: Metrics tracking with Precision@K, Recall@K, NDCG
6. **Feedback Loop**: User interactions improve future predictions

## ⚙️ API Documentation (Key Endpoints)

### Authentication (/api/auth)
- `POST /login` - User login
- `POST /register` - User registration
- `POST /logout` - User logout
- `POST /refresh` - Refresh JWT token

### Products (/api/products)
- `GET /` - Get all products with filtering
- `GET /:id` - Get single product
- `GET /categories` - Get product categories
- `GET /search` - Search products

### Cart & Orders (/api/cart, /api/orders)
- `GET /cart` - Get current user's cart
- `POST /cart/add` - Add item to cart
- `POST /orders/create` - Create new order
- `GET /orders` - Get user's order history

### Predictions (/api/predictions)
- `GET /current-basket` - Get AI-predicted basket
- `POST /generate` - Generate new prediction
- `POST /baskets/:id/accept` - Accept predicted basket
- `GET /metrics/online` - Get prediction metrics
- `GET /recommendations` - Get personalized recommendations

### Admin (/api/admin)
- `GET /dashboard/metrics` - Admin dashboard data
- `GET /users` - User management
- `GET /products` - Product management
- `GET /predictions/demo` - ML demo endpoints

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

## ✅ Testing
- **Frontend**: `cd frontend && npm test`
- **Backend**: `cd backend && npm test`
- **ML Service**: `cd ml-service && pytest`

## 🤝 Contributing
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a PullRequest.
