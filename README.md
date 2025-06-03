# Timely - AI-Powered Grocery Shopping Platform

## 🌟 Overview
Timely is a full-stack e-commerce application designed to revolutionize your weekly grocery shopping experience. By leveraging advanced machine learning algorithms, Timely predicts your next basket based on historical purchase data, individual preferences, and evolving shopping patterns, automating a significant part of your routine and saving you valuable time.

## 🏗️ Project Architecture

The Timely application is structured into three main services, containerized using Docker for ease of deployment and scalability:

timely/
├── frontend/                    # React TypeScript Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components (common, products, cart, etc.)
│   │   ├── pages/             # Page components (Home, Products, Cart, Admin, etc.)
│   │   ├── layouts/           # Layout components (MainLayout, AuthLayout, AdminLayout)
│   │   ├── services/          # API service integrations (productService, authService, etc.)
│   │   ├── stores/            # Zustand state management (authStore, cartStore)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Utility functions
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static assets (images, icons)
│   ├── vite.config.ts         # Vite configuration
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   ├── package.json           # Frontend dependencies and scripts
│   ├── .env.example           # Environment variable template for frontend
│   └── Dockerfile             # Docker configuration for frontend service
│
├── backend/                    # Node.js/Express Backend API
│   ├── src/
│   │   ├── routes/            # API route definitions (auth, products, cart, orders, etc.)
│   │   ├── controllers/       # Route controllers (handling request logic)
│   │   ├── models/            # Sequelize ORM models (User, Product, Order, etc.)
│   │   ├── middleware/        # Express middleware (auth, validation, error handling)
│   │   ├── services/          # Business logic services
│   │   ├── config/            # Configuration files (database, redis)
│   │   ├── jobs/              # Background jobs (e.g., cart generation, metrics)
│   │   └── utils/             # Utility functions (logger, etc.)
│   ├── uploads/               # Directory for file uploads (e.g., product images)
│   ├── package.json           # Backend dependencies and scripts
│   ├── .env.example           # Environment variable template for backend
│   └── Dockerfile             # Docker configuration for backend service
│
├── ml-service/                 # Python ML Service (FastAPI)
│   ├── src/
│   │   ├── api/               # FastAPI endpoints (predict, metrics, train)
│   │   ├── models/            # ML model implementations (e.g., LightGBM)
│   │   ├── preprocessing/     # Data preprocessing and feature engineering scripts
│   │   ├── training/          # Model training scripts
│   │   ├── evaluation/        # Model evaluation scripts
│   │   ├── services/          # ML-specific services (prediction, metrics)
│   │   └── utils/             # Utility functions (logger, redis client)
│   ├── data/                  # Storage for datasets (e.g., Instacart CSVs)
│   ├── models/                # Storage for trained ML models (e.g., .pkl files)
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment variable template for ML service
│   └── Dockerfile             # Docker configuration for ML service
│
├── database/                   # Database configuration and scripts
│   ├── init.sql              # Database initialization script (schema creation)
│   ├── migrations/            # Folder for database migration scripts (e.g., using Sequelize CLI or Alembic)
│   └── seeds/                 # Folder for database seed scripts (though seeding is currently handled by backend/src/database/database-seed.ts)
│
├── docker-compose.yml         # Docker Compose for orchestrating all services
├── .gitignore                 # Specifies intentionally untracked files
└── README.md                  # This file: Project overview and documentation


## ✨ Features

### User Features
* **Automated Weekly Cart Generation**: AI-powered predictions for your weekly grocery needs.
* **Smart Shopping**: Easily add items to your cart with intelligent suggestions and a seamless Browse experience.
* **Favorites Management**: Save and organize your favorite products for quick access.
* **Comprehensive Order History**: View past purchases, track current orders, and easily reorder items.
* **Personalized Dashboard**: Get insights into your spending, manage preferences, and discover personalized recommendations.
* **Flexible Delivery Scheduling**: Choose delivery options that fit your lifestyle.

### Admin Features
* **Analytics Dashboard**: Access real-time metrics on sales, user activity, and overall platform performance.
* **Product Management**: Efficiently add, edit, categorize, and manage product inventory.
* **User Management**: Monitor user activity, manage accounts, and view user preferences.
* **ML Model Monitoring**: Track the accuracy and performance of the prediction models with detailed metrics.
* **Sales Analytics**: Deep dive into revenue trends, best-selling products, and customer behavior.

### ML Features (Core Engine)
* **LightGBM Implementation**: Utilizes a state-of-the-art gradient boosting framework for robust and accurate predictions.
* **Real-time Predictions**: Dynamically generates next basket recommendations.
* **Adaptive Learning**: The ML model continuously learns and improves its predictions based on user interactions and feedback.
* **Comprehensive Performance Metrics**: Evaluated using Precision@K, Recall@K, F1-Score, Hit Rate, NDCG, and more.

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

* **Admin Account**:
    * Email: `admin@timely.com`
    * Password: `admin123`
* **Test User Account**:
    * Email: `user@timely.com`
    * Password: `user123`

*(These are typically set in `backend/src/database/database-seed.ts`)*

### Production Deployment Considerations

For a production environment, enhance the setup with:
* **Security**: Robust secrets management, HTTPS, stricter CORS, security headers.
* **Scalability**: Orchestration (e.g., Kubernetes), managed database/cache services, CDN.
* **Monitoring**: Prometheus, Grafana, Sentry, ELK stack or similar.
* **CI/CD**: Automated build, test, and deployment pipelines.

## 📊 Data & ML Pipeline

1.  **Data Ingestion**: The Instacart dataset (CSV files in `ml-service/data/`) is processed.
2.  **Preprocessing & Feature Engineering**: Scripts in `ml-service/src/preprocessing/` (e.g., `data-preprocessing.py`, `feature_engineering.py`) transform raw data into features suitable for model training. This includes creating `instacart_history` and `instacart_future` datasets.
3.  **Data Splitting**: Users are split into training, validation, and test sets (e.g., using logic similar to `keyset_fold.py` from the Reality-Check repository, adapted in `data-preprocessing.py`).
4.  **Model Training**: The LightGBM model (`ml-service/src/models/lightgbm_model.py` or `lightgbm_enhanced.py`) is trained using scripts in `ml-service/src/training/` (e.g., `training-script.py`).
5.  **Prediction Service**: The trained model is served via FastAPI endpoints defined in `ml-service/src/api/` for real-time next basket predictions.
6.  **Evaluation**: Model performance is assessed using `ml-service/src/evaluation/evaluation-module.py`, generating metrics like Precision@K, Recall@K, F1-Score, NDCG. These are available via API and displayed on the Admin Dashboard.
7.  **Feedback Loop**: User interactions (e.g., accepting/rejecting predicted baskets, actual purchases) provide data for future model retraining and fine-tuning.

## ⚙️ API Documentation (Key Endpoints)

*(Refer to Swagger/OpenAPI documentation typically available at `/docs` on backend and ML service APIs for full details)*

### Authentication (`/api/auth`)
* `POST /login`: User login.
* `POST /register`: User registration.

### Products (`/api/products`)
* `GET /`: Get all products with filtering.
* `GET /:id`: Get a single product.
* `GET /categories`: Get product categories.

### Cart & Orders (`/api/cart`, `/api/orders`)
* `GET /cart`: Get current user's cart.
* `POST /cart/add`: Add item to cart.
* `POST /orders/create`: Create a new order.
* `GET /orders`: Get user's order history.

### Predictions (Backend: `/api/predictions`, ML Service: `/api/predictions` or `/api/predict`)
* Backend: `GET /current-basket`: Get user's current AI-predicted basket.
* ML Service: `POST /next-basket`: (Internal endpoint called by backend) Predict next basket for a user.
* ML Service: `GET /metrics/model-performance`: Get offline model performance metrics.
* Backend: `GET /metrics/online`: Get online (user engagement) prediction metrics.

## 🔧 Development

Refer to individual service directories (`frontend/`, `backend/`, `ml-service/`) for specific development commands (e.g., `npm run dev`, `python -m uvicorn ...`).

### Database Setup (if not using Docker for everything)
* Ensure PostgreSQL is running.
* Configure `DATABASE_URL` in `backend/.env` and `ml-service/.env`.
* Initialize schema: You can connect to your PostgreSQL instance and run `database/init.sql`.
* Run backend seed: `cd backend && npm run seed` (after `npm install`).

## ✅ Testing
* **Frontend**: `cd frontend && npm test`
* **Backend**: `cd backend && npm test`
* **ML Service**: `cd ml-service && pytest`

## 🤝 Contributing
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a PullRequest.
