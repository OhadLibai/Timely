## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                TIMELY PLATFORM                                 │
│                         AI-Powered Grocery Shopping                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                    │
│                     React 18.2 + TypeScript 5.1 + Vite 4.4                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Pages Architecture:                                                             │
│ ├── Public Pages: Home, Products, Login, Register, Cart, Checkout             │
│ ├── Auth Pages: ForgotPassword, ResetPassword                                 │
│ ├── User Pages: Orders, OrderDetail, Profile, Favorites, PredictedBasket      │
│ └── Admin Pages: Dashboard, Metrics, DemoPredictionPage, UserSeeding,         │
│     Orders, Products, Settings, Users                                         │
│                                                                                │
│ Component Organization (60+ components):                                       │
│ ├── /common: LoadingSpinner, ErrorBoundary, Pagination, EmptyState           │
│ ├── /products: ProductCard, ProductImage, ProductListItem, CategoryFilter,   │
│ │   PriceRangeFilter, SortDropdown                                            │
│ ├── /predictions: ConfidenceIndicator, PredictionExplanation                  │
│ ├── /admin: MetricCard, DateRangePicker, MetricExplanation                    │
│ ├── /auth: ProtectedRoute, AdminRoute                                         │
│ ├── /navigation: MobileMenu                                                   │
│ ├── /search: SearchModal                                                      │
│ ├── /cart: CartDropdown                                                       │
│ ├── /notifications: NotificationDropdown                                      │
│ └── /home: Hero, FeatureCard                                                  │
│                                                                                │
│ State Management:                                                              │
│ ├── Zustand Stores: auth.store.ts, cart.store.ts                            │
│ ├── React Query v3: API caching, mutations, and synchronization              │
│ └── Service Layer: 7 dedicated API services (auth, cart, favorite, order,    │
│     prediction, product, admin) with axios                                   │
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
│                    Node.js 18+ + Express 4.18 + TypeScript 5.1               │
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
│ ├── Database: PostgreSQL, pg 8.11, sequelize 6.33, sequelize-typescript    │
│ ├── Utilities: axios, date-fns, csv-parser, compression, morgan              │
│ ├── Logging: Winston structured logging                                       │
│ └── Module System: module-alias, tsc-alias for path resolution               │
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
│ Restructured Architecture (core/, data/, features/, models/, services/):      │
│                                                                                │
│ API Layer (/api/):                                                            │
│ └── main.py: FastAPI application with prediction endpoints                    │
│                                                                                │
│ Core Components (/core/):                                                     │
│ ├── evaluator.py: Model performance evaluation and metrics                   │
│ └── logger.py: Centralized logging configuration                             │
│                                                                                │
│ Data Layer (/data/):                                                          │
│ ├── connection.py: Database connection management                             │
│ ├── csv_loader.py: Instacart dataset loading utilities                       │
│ └── models.py: SQLAlchemy database models                                     │
│                                                                                │
│ Feature Engineering (/features/):                                             │
│ └── engineering.py: Unified feature extraction and processing                │
│                                                                                │
│ ML Models (/models/):                                                         │
│ ├── stacked_basket_model.py: Main orchestrator for 2-stage prediction       │
│ ├── stage1_candidate_generator.py: LightGBM-based candidate generation       │
│ └── stage2_basket_selector.py: GradientBoosting final selection              │
│                                                                                │
│ Services (/services/):                                                        │
│ └── prediction.py: Business logic for prediction workflows                   │
│                                                                                │
│ Artifacts & Training:                                                          │
│ ├── /artifacts/: Trained model storage (PKL files)                          │
│ └── /training/: Model training notebooks and scripts                         │
│                                                                                │
│ ML Dependencies & Tools:                                                       │
│ ├── Core ML: scikit-learn 1.3.0, LightGBM 4.0.0, NumPy 1.24.3, Pandas 2.0.3│
│ ├── Optimization: Optuna 3.3.0 for hyperparameter tuning                   │
│ ├── Interpretability: SHAP 0.42.1 for model explanations                    │
│ ├── Database: PostgreSQL via psycopg2-binary 2.9.7, SQLAlchemy 2.0.20      │
│ ├── API: FastAPI 0.103.1, Uvicorn 0.23.2, Pydantic 2.3.0                  │
│ ├── Auth & Security: python-jose, passlib                                   │
│ ├── Testing: pytest 7.4.0, pytest-asyncio 0.21.1, pytest-cov 4.1.0        │
│ └── Utils: python-dotenv, httpx, loguru, marshmallow, black, mypy            │
│                                                                                │
│ Data Sources:                                                                  │
│ ├── Live Database: Real user interactions via PostgreSQL                     │
│ └── Instacart Dataset: 200K+ users, 3.4M+ orders, 50K+ products            │
│     └── Raw CSV files: orders, products, aisles, departments, order_products │
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
│ Path Aliases Integration:                                                      │
│ All layers use @/ path mapping for clean imports and maintainable code       │
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