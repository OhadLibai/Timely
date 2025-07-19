# Timely API Documentation

## Overview
This document provides comprehensive documentation for the Timely e-commerce platform API. The API is built with Flask.

**Base URL:** `http://localhost:5000/api`

## Authentication

All user-specific endpoints expect a user ID parameter. The current implementation uses simplified authentication with bcrypt password hashing.

### Endpoints

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "accessToken": "dummy_token",
  "refreshToken": "dummy_token"
}
```

#### Register
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** Same as login response

#### Logout
```http
POST /api/auth/logout
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
```

**Response:**
```json
{
  "accessToken": "dummy_token",
  "refreshToken": "dummy_token"
}
```

#### Get Current User
```http
GET /api/auth/me
```

**Headers:**
- `X-User-Id`: User ID (optional, defaults to -2)

**Response:**
```json
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "isActive": true
  }
}
```

---

## Products

### Get Products
```http
GET /api/products
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20)
- `search` (string): Search term for name/description
- `categories[]` (array): Filter by category IDs
- `sort` (string): Sort order (`name`, `price`, `price_desc`)

**Response:**
```json
{
  "products": [
    {
      "id": "123",
      "sku": "SKU-123",
      "name": "Product Name",
      "description": "Product description",
      "price": 9.99,
      "brand": "Brand Name",
      "imageUrl": "https://example.com/image.jpg",
      "category": {
        "id": "1",
        "name": "Category Name"
      },
      "stock": 100,
      "isActive": true,
      "metadata": {}
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 8,
  "hasMore": true
}
```

### Get Single Product
```http
GET /api/products/{id}
```

**Response:**
```json
{
  "id": "123",
  "sku": "SKU-123",
  "name": "Product Name",
  "description": "Product description",
  "price": 9.99,
  "brand": "Brand Name",
  "imageUrl": "https://example.com/image.jpg",
  "category": {
    "id": "1",
    "name": "Category Name"
  },
  "stock": 100,
  "isActive": true,
  "metadata": {}
}
```

### Get Categories
```http
GET /api/products/categories
```

**Response:**
```json
[
  {
    "id": "1",
    "name": "Category Name",
    "description": "Category description",
    "imageUrl": "https://example.com/category.jpg"
  }
]
```

---

## Orders

### Create Order
```http
POST /api/orders/create/{user_id}
```

**Request Body:**
```json
{
  "cartId": "cart-123",
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "id": "order-uuid",
  "orderNumber": "ORD-123-abc12345",
  "userId": "123",
  "status": "confirmed",
  "items": [],
  "total": 0.0,
  "paymentMethod": "card",
  "paymentStatus": "paid",
  "metadata": {}
}
```

### Get User Orders
```http
GET /api/orders/user/{user_id}
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 10)
- `status` (string): Filter by order status

**Response:**
```json
{
  "orders": [
    {
      "id": "order-uuid",
      "orderNumber": "ORD-123-abc12345",
      "userId": "123",
      "status": "completed",
      "items": [
        {
          "id": "item-uuid",
          "orderId": "order-uuid",
          "product": {
            "id": "123",
            "name": "Product Name",
            "price": 9.99,
            "brand": "Brand Name"
          },
          "quantity": 2,
          "price": 9.99,
          "total": 19.98,
          "addToCartOrder": 1,
          "reordered": false
        }
      ],
      "total": 19.98,
      "paymentMethod": "card",
      "paymentStatus": "paid",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "totalPages": 1,
  "hasMore": false
}
```

### Get Single Order
```http
GET /api/orders/{order_id}
```

**Response:** Same structure as single order in user orders array

---

## Predictions

### Get Predicted Basket
```http
POST /api/predictions/predicted-basket/{user_id}
```

**Description:** Generate AI-powered basket prediction using the TIFUKNN algorithm. Requires user to have at least 3 completed orders.

**Response:**
```json
{
  "basket": {
    "id": "basket-uuid",
    "items": [
      {
        "product": {
          "id": "123",
          "sku": "SKU-123",
          "name": "Product Name",
          "description": "Product description",
          "price": 9.99,
          "brand": "Brand Name",
          "imageUrl": "https://example.com/image.jpg",
          "category": {
            "id": "1",
            "name": "Category Name"
          },
          "stock": 100,
          "isActive": true,
          "metadata": {}
        },
        "quantity": 1
      }
    ]
  },
  "success": true
}
```

**Error Response:**
```json
{
  "basket": {},
  "error": "User needs at least 3 orders for predictions",
  "success": false
}
```

---

## User Profile

### Get User Profile
```http
GET /api/user/{user_id}/profile
```

**Response:**
```json
{
  "id": "123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "role": "customer",
  "is_active": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Update User Profile
```http
PUT /api/user/{user_id}/profile
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith"
}
```

**Response:** Updated user profile (same structure as GET)

### Delete User Account
```http
DELETE /api/user/{user_id}/account
```

**Note:** This deactivates the account rather than permanently deleting it.

**Response:**
```json
{
  "message": "Account deleted successfully"
}
```

---

## Favorites

### Get User Favorites
```http
GET /api/favorites/user/{user_id}
```

**Response:**
```json
[
  {
    "id": "favorite-uuid",
    "userId": "123",
    "product": {
      "id": "123",
      "sku": "SKU-123",
      "name": "Product Name",
      "description": "Product description",
      "price": 9.99,
      "brand": "Brand Name",
      "imageUrl": "https://example.com/image.jpg",
      "category": {
        "id": "1",
        "name": "Category Name"
      },
      "stock": 100,
      "isActive": true,
      "metadata": {}
    }
  }
]
```

### Add to Favorites
```http
POST /api/favorites/user/{user_id}/add
```

**Request Body:**
```json
{
  "productId": "123"
}
```

**Response:**
```json
{
  "message": "Added to favorites"
}
```

### Remove from Favorites
```http
DELETE /api/favorites/user/{user_id}/{product_id}
```

**Response:**
```json
{
  "message": "Favorite removed"
}
```

---

## Admin & Demo

### Seed Demo User
```http
POST /api/admin/demo/seed-user/{instacart_user_id}
```

**Description:** Create a demo user account with historical order data from the Instacart dataset. The user ID must exist in the Instacart dataset (1-206,209 range).

**Response:**
```json
{
  "success": true,
  "credentials": {
    "email": "demo123@timely.com",
    "password": "demo_123"
  },
  "userId": "123",
  "ordersImportedNumber": "5",
  "itemsImportNumber": "25",
  "message": "User 123 had 5 historical orders and 25 items"
}
```

**Error Response:**
```json
{
  "error": "Instacart user 123 not found in dataset"
}
```

### Get User Prediction Comparison
```http
GET /api/admin/demo/user-prediction/{user_id}
```

**Description:** Generate prediction comparison between TIFUKNN prediction and ground truth data from Instacart dataset.

**Response:**
```json
{
  "userId": "123",
  "predictedBasket": [
    {
      "id": "123",
      "name": "Product Name",
      "price": 9.99,
      "category": {
        "id": "1",
        "name": "Category Name"
      }
    }
  ],
  "groundTruthBasket": [
    {
      "id": "456",
      "name": "Actual Product",
      "price": 12.99,
      "category": {
        "id": "2",
        "name": "Other Category"
      }
    }
  ]
}
```

---

## Model Evaluation

### Evaluate Model Performance
```http
POST /api/evaluations/metrics/{sample_size}
```

**Description:** Evaluate TIFUKNN model performance using test and validation users from the Instacart dataset.

**Parameters:**
- `sample_size` (integer): Number of users to evaluate (minimum: 1)

**Response:**
```json
{
  "PrecisionAt": 0.4200,
  "RecallAt": 0.3800,
  "F1ScoreAt": 0.4000,
  "NDCGAt": 0.4500,
  "JaccardSimilarity": 0.3500,
  "sampleSize": 100
}
```

**Metrics Explanation:**
- **PrecisionAt**: Percentage of recommended items that were actually purchased
- **RecallAt**: Percentage of purchased items that were recommended
- **F1ScoreAt**: Harmonic mean of precision and recall
- **NDCGAt**: Normalized Discounted Cumulative Gain (ranking quality)
- **JaccardSimilarity**: Set overlap between predicted and actual baskets

---

## Error Handling

### Common HTTP Status Codes

- `200 OK`: Successful request
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication failed
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Error Response Format

```json
{
  "error": "Error description"
}
```

