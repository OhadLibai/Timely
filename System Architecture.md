# System Architecture - Timely E-commerce Platform

## Overview
Timely is an AI-powered grocery shopping platform implementing the TIFUKNN (Temporal Item Frequency with User-based KNN) algorithm for personalized basket prediction.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                TIMELY SYSTEM                                   │
│                         AI-Powered Grocery Shopping                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React +      │    │   (Flask +      │    │ (PostgreSQL)    │
│   TypeScript)   │    │   TIFUKNN)      │    │                 │
│                 │    │                 │    │                 │
│ • User Pages    │◄──►│ • REST APIs     │◄──►│ • Products      │
│ • Admin Panel   │    │ • ML Engine     │    │ • Orders        │
│ • Visualizations│    │ • Predictions   │    │ • Users         │
│ • Cart/Checkout │    │ • Evaluations   │    │ • Baskets       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌─────────────────┐
                       │  TIFUKNN Engine │
                       │                 │
                       │ • Vector Cache  │
                       │ • KNN Search    │
                       │ • Temporal Decay│
                       │ • CSV/DB Data   │
                       └─────────────────┘
```

## Component Details

### Frontend (React + TypeScript)
- **Framework**: React 18.2 with TypeScript 5.0
- **Bundler**: Parcel 2.9 with hot module replacement
- **Styling**: Tailwind CSS + Framer Motion animations
- **State Management**: Zustand stores + React Query v3
- **Key Features**:
  - Responsive design with mobile support
  - Real-time cart updates
  - Admin dashboard with analytics
  - Prediction visualization

### Backend (Python Flask + TIFUKNN)
- **Framework**: Flask 2.3.3 with Flask-CORS
- **ML Engine**: Custom TIFUKNN implementation
- **Database**: PostgreSQL with psycopg2 connection pooling
- **Key Components**:
  - REST API endpoints for all functionality
  - Integrated ML prediction engine
  - Real-time performance evaluation
  - Admin tools and metrics

### TIFUKNN ML Engine
- **Algorithm**: Temporal Item Frequency with User-based KNN
- **Features**:
  - Temporal decay for basket recency
  - Within-basket item grouping
  - Pre-computed recommender vectors
  - Cosine similarity KNN search
  - Support for both database and CSV data sources
- **Configuration**:
  Through docker-compose.yml

### Database (PostgreSQL)
- **Core Tables**: users, products, orders, order_items, carts
- **ML Tables**: predicted_baskets, model_metrics
- **Features**:
  - ACID compliance
  - Connection pooling
  - Optimized indexes
  - Health checks

## Data Flow

### 1. User Prediction Flow
```
User Request → Frontend → Backend API → TIFUKNN Engine → Database Query
           ← JSON      ← Predictions ← Vector Calc   ← Order History
```

### 2. Admin Evaluation Flow
```
Admin Input → Frontend → Backend API → Evaluation Engine → CSV Dataset
          ← Dashboard ← Metrics    ← Performance Calc ← Ground Truth
```

### 3. Real-time Basket Prediction
```
Shopping Session → Cart Updates → ML Prediction → Recommended Items
               ← UI Updates   ← API Response  ← TIFUKNN Engine
```

## Infrastructure

### Docker Compose Services
- **database**: PostgreSQL with initialization scripts
- **backend**: Flask application with TIFUKNN engine
- **frontend**: React application with Parcel bundling

### Network Configuration
- Frontend: Port 3000
- Backend API: Port 5000
- Database: Port 5432 (internal)
- Health checks and restart policies

## Key Features

### Core Demands Implementation
1. **Basket Prediction**: Real-time ML predictions for logged-in users
2. **Admin Dashboard**: Performance metrics, user management, analytics
3. **CSV Evaluation**: Direct prediction from Instacart dataset
4. **Model Evaluation**: Precision@K, Recall@K, F1, NDCG metrics

### Production Optimizations
- Vector caching for recommender data
- Connection pooling for database
- Memory-efficient KNN search
- Configurable performance limits
- Docker containerization

### Security & Performance
- Password hashing with bcrypt
- CORS configuration
- Input validation
- Error handling and logging
- Resource limits and health checks