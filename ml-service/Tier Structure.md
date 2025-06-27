ml-service/
├── app/                           # All application code
│   ├── __init__.py
│   ├── main.py                    # FastAPI app
│   ├── config.py                  # Settings & environment vars
│   │
│   ├── api/                       # API endpoints
│   │   ├── __init__.py
│   │   ├── health.py              # Health checks
│   │   ├── predictions.py         # Prediction endpoints
│   │   └── evaluation.py          # Evaluation endpoints
│   │
│   ├── core/                      # Core business logic
│   │   ├── __init__.py
│   │   ├── tifuknn.py            # TIFU-KNN algorithm
│   │   ├── data_loader.py        # CSV data loading
│   │   └── database.py           # Database connections
│   │
│   ├── models/                    # Data models
│   │   ├── __init__.py
│   │   ├── schemas.py            # Pydantic models
│   │   └── types.py              # Type definitions
│   │
│   └── services/                  # Service layer
│       ├── __init__.py
│       ├── prediction.py         # Prediction logic
│       └── evaluation.py         # Evaluation logic
│
├── data/                         # Runtime generated files
│   └── cache/                    # JSON cache files
│
├── dataset/                      # CSV files (git-ignored)
│
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md


🔄 Data Flow

API Request
    ↓
PredictionService.predict_from_csv()
    ↓
DataLoader.get_user_baskets()  [From Memory]
    ↓
TIFUKNN.predict()
    ↓
Response


Database-Based (Demo):

API Request
    ↓
PredictionService.predict_from_database()
    ↓
Database Query  [From PostgreSQL]
    ↓
TIFUKNN.predict_from_baskets()
    ↓
Response