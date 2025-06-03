# Timely - AI-Powered Grocery Shopping Platform

## Overview
Timely is a full-stack e-commerce application that automates weekly grocery shopping using advanced machine learning algorithms. The platform predicts users' next basket based on historical purchase data, preferences, and shopping patterns.

## Architecture

```
timely/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── context/        # React context for state management
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                # Node.js/Express backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Custom middleware
│   │   └── services/       # Business logic
│   └── package.json
├── ml-service/             # Python ML service
│   ├── src/
│   │   ├── models/         # ML models
│   │   ├── preprocessing/  # Data preprocessing
│   │   ├── training/       # Model training scripts
│   │   └── api/           # FastAPI endpoints
│   ├── data/              # Dataset storage
│   └── requirements.txt
├── database/              # Database setup
│   ├── migrations/        # Database migrations
│   └── seeds/            # Seed data
├── docker-compose.yml     # Docker orchestration
└── README.md
```

## Features

### User Features
- **Automated Weekly Cart Generation**: ML-powered predictions for weekly groceries
- **Smart Shopping**: Add items to cart with intelligent suggestions
- **Favorites Management**: Save and organize favorite products
- **Order History**: View past purchases and reorder easily
- **Personalized Dashboard**: Track spending, preferences, and recommendations
- **Delivery Scheduling**: Flexible delivery options

### Admin Features
- **Analytics Dashboard**: Real-time metrics and model performance
- **Product Management**: Add, edit, and categorize products
- **User Management**: Monitor user activity and preferences
- **ML Model Monitoring**: Track prediction accuracy and performance metrics
- **Sales Analytics**: Revenue tracking and trend analysis

### ML Features
- **LightGBM Implementation**: State-of-the-art gradient boosting
- **Real-time Predictions**: Dynamic basket recommendations
- **Adaptive Learning**: Continuously improves with user feedback
- **Performance Metrics**: Precision@K, Recall@K, Hit Rate, NDCG

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Recharts
- **Backend**: Node.js, Express, TypeScript
- **ML Service**: Python, FastAPI, LightGBM, Pandas, NumPy
- **Database**: PostgreSQL
- **Cache**: Redis
- **Container**: Docker, Docker Compose
- **Authentication**: JWT

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for ML development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/timely.git
cd timely
```

2. Start the application with Docker:
```bash
docker-compose up --build
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- ML Service: http://localhost:8000
- Admin Dashboard: http://localhost:3000/admin

### Default Credentials
- Admin: admin@timely.com / admin123
- Test User: user@timely.com / user123

## Data Pipeline

1. **Data Ingestion**: Instacart dataset is processed and loaded into PostgreSQL
2. **Feature Engineering**: User behavior patterns, temporal features, product attributes
3. **Model Training**: LightGBM trained on historical purchase data
4. **Prediction Service**: Real-time predictions via REST API
5. **Feedback Loop**: User interactions update model performance

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

## ML Model Details

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
- Precision@10: 0.42
- Recall@10: 0.38
- Hit Rate: 0.65
- NDCG: 0.48

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

## Deployment

### Production Build
```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Environment Variables
Create `.env` files in each service directory with required configurations.

## Monitoring

- **Application Metrics**: Prometheus + Grafana
- **ML Metrics**: MLflow tracking
- **Logs**: ELK Stack integration
- **Error Tracking**: Sentry

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/timely/issues
- Email: support@timely.com
- Documentation: https://docs.timely.com