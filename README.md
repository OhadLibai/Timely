# Timely - AI-Powered Grocery Shopping Platform

## Overview
Timely is a full-stack e-commerce application that automates weekly grocery shopping using advanced machine learning algorithms. The platform predicts users' next basket based on historical purchase data, preferences, and shopping patterns.

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
   - Extract to `dataset` directory (under the root directory)

### Quick Start (with Docker)

1. **Build and Start**:
   ```bash
   docker-compose up
   ```

   This will:
   - Create PostgreSQL database
   - Seed initial data and prepare the ML engine
   - Build and start the backend 
   - Build and start the frontend

2. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Credentials

- **Admin Account**:
  - Email: admin@timely.com
  - Password: admin_123

- **Test User Account**:
  - Email: user@timely.com
  - Password: user_123

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
pip install -r requirements.txt
python app.py
```


### Database Setup
```bash
# Initialize database with Docker
docker-compose up database

# Database will be automatically seeded on first run
```

### Troubleshooting

1. **Database Connection Issues**:
   ```bash
   # Check PostgreSQL status
   docker-compose ps postgres
   
   # View database logs
   docker-compose logs postgres
   ```

2. **ML Engine Issues**:
   ```bash
   # Check backend logs for ML engine status
   docker-compose logs backend
   ```

3. **Clear All Data and Start Fresh**:
   ```bash
   docker-compose down -v
   docker-compose up --build # If you made changes to the src code
   ```

## 📊 Data & ML Pipeline

### Real world data
- Dataset: Instacart Market Basket Analysis
- Users: 200,000+
- Orders: 3.4M+
- Products: 50,000+

1. **Data Ingestion**: Instacart dataset (6 CSV files) processed in ml_engine
2. **Preprocessing**: Creates the necessary CSVs and JSONs for ML consumption
3. **Model Setup**: Pre-compute user vectors and loading it to memory.
4. **Prediction Service**: Real-time predictions via Flask endpoints
5. **Performance Monitoring**: Metrics tracking with Precision@K, Recall@K, NDCG, F1-Score, Jaccard Similarity

## ✨ Key Features

### Admin Features
- **Analytics Dashboard**: Real-time metrics and model performance
- **Model Evaluation**: On-demand performance assessment  
- **ML Model Monitoring**: Track prediction accuracy and performance metrics
- **Demo Simulation**: Interactive prediction demonstrations
- **User Management**: Monitor user activity and preferences

### User Features
- **Automated Weekly Cart Generation**: ML-powered predictions for weekly groceries
- **Smart Shopping**: Add items to cart with intelligent suggestions
- **Favorites Management**: Save and organize favorite products
- **Order History**: View past purchases and reorder easily

## 🛠️ Technology Stack

### Frontend Stack
- **Framework**: React 18.2 with TypeScript 5.0
- **Build Tool**: Parcel 2.9 with hot module replacement
- **Styling**: Tailwind CSS 3.3 + Framer Motion animations
- **UI Components**: Headless UI + Lucide React icons
- **State Management**: Zustand 4.0 for global state
- **Data Fetching**: React Query v3 for API caching and synchronization
- **Forms**: React Hook Form 7.45 with validation
- **Charts**: Recharts 2.7 for analytics visualization
- **Notifications**: React Hot Toast for user feedback
- **Image Loading**: React Lazy Load Image Component for performance
- **Routing**: React Router DOM 6.0

### Backend Stack
- **Runtime**: Python 3.9+ with Flask 2.3.3
- **Framework**: Flask with Blueprint architecture (8 endpoints)
- **CORS**: Flask-CORS 4.0.0 for cross-origin requests
- **ML Engine**: Custom TIFUKNN algorithm implementation
- **Database**: PostgreSQL with psycopg2-binary 2.9.7 connection pooling
- **Authentication**: bcrypt 4.0.1 + passlib 1.7.4 for password hashing
- **Data Processing**: Pandas 2.0.3 + NumPy 1.24.4 for ML computations
- **ML Library**: scikit-learn 1.3.0 for KNN and vector operations
- **JSON Processing**: ujson 5.8.0 for performance
- **Environment**: python-dotenv 1.0.0 for configuration
- **Progress Tracking**: tqdm 4.66.1 for long-running operations
- **Testing**: pytest framework

### Database Stack
- **Database**: PostgreSQL 13+ with ACID compliance
- **Connection**: SimpleConnectionPool (1-20 connections)
- **Optimization**: Indexed queries, foreign key constraints
- **Schema**: Users, products, orders, favorites, categories
- **Seeding**: Automated initialization with sample data
- **Health Checks**: Connection monitoring and status endpoints

### TIFUKNN ML Engine
- **Algorithm**: Temporal Item Frequency with User-based KNN
- **Vector Operations**: Pre-computed user vectors with cosine similarity
- **Configuration**: All parameters for the algorithm are configuarble via docker-compose.yml file
- **Data Sources**: Live PostgreSQL + Instacart CSV dataset
- **Evaluation**: Precision@K, Recall@K, F1-Score, NDCG, Jaccard Similarity
- **Optimization**: Vector caching, connection pooling, memory management

### Infrastructure Stack
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose with 3 services
  - `database`: PostgreSQL with initialization scripts
  - `backend`: Python Flask + TIFUKNN engine (port 5000)
  - `frontend`: React with Parcel bundling (port 3000)
- **Networking**: Internal Docker network with health checks
- **Volumes**: Persistent data storage + shared dataset access
- **Environment**: Configurable via environment variables
- **Monitoring**: Service health checks and restart policies

### Development Tools
- **Frontend**: ESLint, Prettier, TypeScript compiler
- **Backend**: Python type hints, error handling, logging
- **Debugging**: Docker logs, health check endpoints