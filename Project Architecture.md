## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                TIMELY PLATFORM                                 │
│                         AI-Powered Grocery Shopping                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                    │
│                     React 18.2 + TypeScript 5.0 + Parcel 2.9                │
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
│ Build & Development:                                                           │
│ ├── Parcel 2.9 bundler with TypeScript support                              │
│ ├── Auto bundling and hot module replacement                                │
│ ├── Dev server on port 3000                                                 │
│ └── Production builds with optimization                                      │
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
│                        Python 3.9+ + Flask 2.3 + TIFUKNN                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Flask Blueprints (RESTful APIs):                                               │
│ ├── auth.py: Authentication endpoints, user management                       │
│ ├── user.py: Profile management, preferences                                 │
│ ├── products.py: Product CRUD, search, categories                           │
│ ├── orders.py: Order management, history                                     │
│ ├── predictions.py: ML prediction endpoints (TIFUKNN)                       │
│ ├── admin.py: Dashboard, metrics, demo operations                           │
│ ├── evaluations.py: Model performance evaluation                            │
│ └── favorites.py: User favorites management                                  │
│                                                                                │
│ ML Engine (TIFUKNN Implementation):                                           │
│ ├── TifuKnnEngine: Core TIFUKNN algorithm implementation                    │
│ ├── Temporal decay with within-basket grouping                              │
│ ├── Pre-computed recommender vectors for performance                           │
│ ├── KNN search with cosine similarity                                       │
│ ├── Supports both database and CSV data sources                             │
│ └── Production optimizations (vector caching, search limits)                │
│                                                                                │
│ Database Integration:                                                          │
│ ├── Direct PostgreSQL connections with psycopg2                             │
│ ├── Connection pooling (SimpleConnectionPool)                               │
│ ├── Raw SQL queries for performance                                         │
│ └── Real-time order history integration                                      │
│                                                                                │
│ Dependencies & Tools:                                                          │
│ ├── Core: Flask 2.3.3, Flask-CORS 4.0.0                                   │
│ ├── Database: psycopg2-binary 2.9.7, SQLAlchemy 2.0.21                    │
│ ├── ML: scikit-learn 1.3.0, numpy 1.24.4, pandas 2.0.3                   │
│ ├── Security: passlib 1.7.4, bcrypt 4.0.1                                 │
│ ├── Utilities: ujson 5.8.0, python-dotenv 1.0.0, tqdm 4.66.1             │
│ └── Production: Docker multi-stage builds, health checks                    │
│                                                                                │
│ TIFUKNN Configuration:                                                         │
│ ├── KNN_K: 900 neighbors, ALPHA: 0.9 merge weight                          │
│ ├── Decay rates: 0.9 within-basket, 0.7 temporal                          │
│ ├── Performance limits: 2000 KNN search, 2000 max vectors                  │
│ └── Configurable via environment variables                                   │
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
│ ├── database: PostgreSQL with initialization and seeding                     │
│ ├── backend: Python Flask API server with TIFUKNN ML engine                │
│ └── frontend: React application with Parcel bundling                        │
│                                                                                │
│ Network Architecture:                                                          │
│ ├── timely-network: Internal Docker network                                  │
│ ├── Port mapping: Frontend:3000, Backend:5000, DB:5432                      │
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
│ Frontend → Backend (Flask + TIFUKNN) → Database → Vector Computation          │
│ ←─────── ←───────────────────────── ←──────── ←──────────────────           │
│                                                                                │
│ Admin Dashboard Flow:                                                          │
│ Admin Interface → Backend API → Database Metrics → Performance Analytics      │
│ ←──────────── ←─────────── ←──────────────── ←─────────────────────         │
│                                                                                │
│ CSV-based Prediction Flow (Demand #3):                                        │
│ Admin Input → TIFUKNN Engine → Instacart Dataset → Predicted Basket           │
│ ←────────── ←──────────────── ←─────────────────── ←─────────────            │
│                                                                                │
│ Model Evaluation Flow:                                                         │
│ Admin Request → Evaluation Engine → Ground Truth Data → Performance Metrics   │
│ ←──────────── ←─────────────────── ←─────────────────── ←──────────────     │
└─────────────────────────────────────────────────────────────────────────────────┘
```