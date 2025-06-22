## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                TIMELY PLATFORM                                 │
│                         AI-Powered Grocery Shopping                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                    │
│                     React 18 + TypeScript + Vite 4                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Pages Architecture:                                                             │
│ ├── Public Pages: Home, Products, Login, Register, Cart, Checkout             │
│ ├── User Pages: Orders, Profile, Favorites, PredictedBasket                   │
│ └── Admin Pages: Dashboard, Metrics, DemoPredictionPage, UserSeeding          │
│                                                                                │
│ Component Organization (60+ components):                                       │
│ ├── /common: LoadingSpinner, ErrorBoundary, Pagination, EmptyState           │
│ ├── /products: ProductCard, CategoryFilter, PriceRangeFilter, SortDropdown    │
│ ├── /predictions: ConfidenceIndicator, PredictionExplanation                  │
│ ├── /admin: MetricCard, DateRangePicker, MetricExplanation                    │
│ ├── /auth: ProtectedRoute, AdminRoute                                         │
│ ├── /navigation: MobileMenu, SearchModal                                      │
│ ├── /cart: CartDropdown                                                       │
│ ├── /notifications: NotificationDropdown                                      │
│ └── /home: Hero, FeatureCard                                                  │
│                                                                                │
│ State Management:                                                              │
│ ├── Zustand Stores: auth.store.ts, cart.store.ts                            │
│ ├── React Query v3: API caching, mutations, and synchronization              │
│ └── Service Layer: 7 dedicated API services with axios                       │
│                                                                                │
│ Path Aliases & Build Optimization:                                            │
│ ├── @/ path mapping for clean imports (Vite + tsconfig)                      │
│ ├── Code splitting: vendor, router, ui, charts, utils chunks                 │
│ ├── Proxy setup: /api -> localhost:5000                                      │
│ └── Source maps + chunk size optimization                                     │
│                                                                                │
│ Key Features:                                                                  │
│ ├── Layout system: MainLayout, AuthLayout, AdminLayout                       │
│ ├── Tailwind CSS + Framer Motion animations + Headless UI                    │
│ ├── Mobile-responsive design with intersection observer                       │
│ ├── Lazy image loading with react-lazy-load-image-component                  │
│ └── Hot toast notifications + React Hook Form                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │ HTTP/REST API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND LAYER                                     │
│                    Node.js 18+ + Express 4.18 + TypeScript 5                 │
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
│ Database Models (Sequelize-TypeScript ORM):                                   │
│ ├── Core: User, Product, Category, Cart, Order                               │
│ ├── Relations: CartItem, OrderItem, Favorite                                 │
│ ├── ML: PredictedBasket, PredictedBasketItem, ModelMetric                   │
│ └── Analytics: UserPreference, ProductView                                    │
│                                                                                │
│ Path Aliases & Build System:                                                  │
│ ├── @/ path mapping for clean imports (tsc-alias + module-alias)             │
│ ├── TypeScript compilation with decorators support                           │
│ ├── ESLint + Jest testing framework                                          │
│ └── Nodemon dev server with ts-node                                          │
│                                                                                │
│ Dependencies & Tools:                                                          │
│ ├── Security: Helmet, CORS, bcryptjs, express-rate-limit                    │
│ ├── Auth: JWT, express-validator                                             │
│ ├── Database: PostgreSQL, pg, sequelize-typescript                          │
│ ├── Utilities: axios, date-fns, csv-parser, compression, morgan              │
│ └── Logging: Winston structured logging                                       │
│                                                                                │
│ Services Integration:                                                          │
│ ├── ml.service.ts: ML API client (axios-based)                              │
│ └── email.service.ts: Transactional emails                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │ HTTP API Calls
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ML SERVICE LAYER                                    │
│                     Python 3.9+ + FastAPI 0.103 + ML Stack                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ API Endpoints:                                                                 │
│ ├── /predict/from-database: Live predictions using user's DB history         │
│ ├── /predict/for-demo: Demo predictions from Instacart CSV data              │
│ ├── /evaluate/model: On-demand model performance evaluation                   │
│ ├── /model/feature-importance: Model interpretability                        │
│ └── /demo-data/*: CSV-based demo utilities for admin functions               │
│                                                                                │
│ Two-Stage ML Architecture:                                                     │
│ ├── Stage 1: CandidateGenerator (LightGBM 4.0)                              │
│ │   └── Generates 3 candidate baskets + meta-features                        │
│ └── Stage 2: BasketSelector (scikit-learn GradientBoostingClassifier)        │
│     └── Selects optimal basket from candidates                               │
│                                                                                │
│ Feature Engineering:                                                           │
│ ├── UnifiedFeatureEngineer: Standardized feature pipeline                    │
│ ├── EnhancedFeatureEngineer: Advanced pattern analysis                       │
│ ├── DatabaseFeatureEngineer: Live database features                          │
│ └── 50+ engineered features: temporal, behavioral, product-based             │
│                                                                                │
│ ML Dependencies & Tools:                                                       │
│ ├── Core ML: scikit-learn 1.3, LightGBM 4.0, NumPy 1.24, Pandas 2.0       │
│ ├── Optimization: Optuna 3.3 for hyperparameter tuning                      │
│ ├── Interpretability: SHAP 0.42 for model explanations                      │
│ ├── Database: PostgreSQL via psycopg2, SQLAlchemy 2.0                       │
│ ├── API: FastAPI, Uvicorn, Pydantic 2.3                                     │
│ └── Utils: python-dotenv, httpx, loguru, pytest                             │
│                                                                                │
│ Model Components:                                                              │
│ ├── StackedBasketModel: Orchestrates 2-stage prediction                      │
│ ├── PredictionService: Business logic wrapper                                │
│ ├── BasketPredictionEvaluator: Performance metrics (Precision@K, NDCG)      │
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
│ NEW: Advanced Demo User Seeding System:                                       │
│ ├── UserSeeding.tsx: Dedicated interface for demo user creation             │
│ ├── Instacart user ID input (1-206,209 range)                              │
│ ├── Quick-seed popular user profiles with descriptions                       │
│ ├── Complete order history population from CSV data                          │
│ ├── Generated credentials display with login instructions                    │
│ ├── Temporal field mapping for realistic historical data                     │
│ └── Real-time seeding progress with detailed statistics                      │
│                                                                                │
│ Demo Workflow Features:                                                        │
│ ├── Animated UI with Framer Motion progress indicators                      │
│ ├── Toast notifications for seeding status updates                          │
│ ├── Recent seeding results display (last 5 users)                           │
│ ├── Usage instructions and complete demo workflow guide                      │
│ └── Integration with existing admin dashboard metrics                        │
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