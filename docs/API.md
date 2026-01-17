# Adocavo API Documentation

Complete API reference for Adocavo endpoints including authentication, request/response formats, rate limiting, and error handling.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Public Endpoints](#public-endpoints)
4. [Protected Endpoints](#protected-endpoints)
5. [Admin Endpoints](#admin-endpoints)
6. [Rate Limiting](#rate-limiting)
7. [Error Responses](#error-responses)
8. [Webhooks](#webhooks)

---

## Overview

### Base URL

- **Production:** `https://adocavo.net`
- **Preview:** `https://preview.adocavo.net`
- **Development:** `http://localhost:3000`

### API Versioning

The API does not currently use explicit versioning. All endpoints are at the root path level.

### Content Type

All requests should use `Content-Type: application/json`.

```bash
curl -X POST https://adocavo.net/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}'
```

### Response Format

All API responses follow a consistent format:

**Success Response:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

---

## Authentication

### Session-based Authentication

Adocavo uses NextAuth.js for session management with OAuth providers (Google, GitHub).

#### Session Format

Sessions are stored in HTTP-only cookies and include:

- User ID
- Email
- Name
- Credits balance
- Expiration time

#### Authentication Check

```typescript
// Server-side check
import { auth } from "@/auth";

const session = await auth();
if (!session) {
  return new Response("Unauthorized", { status: 401 });
}
```

#### Guest Access

Some endpoints allow guest access with limited functionality:

- Anonymous users get 3 free credits (stored in cookie)
- IP-based rate limiting applies
- No persistent data storage

---

## Public Endpoints

### Health Check

Check the health status of the service and its dependencies.

**Endpoint:** `GET /api/health`

**Authentication:** None required

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T10:00:00.000Z",
  "runtime": "edge",
  "latency": 123,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 45
    },
    "ai": {
      "status": "healthy",
      "latency": 78
    }
  }
}
```

**Status Codes:**

- `200` - All systems operational
- `503` - One or more systems degraded

---

### List Hooks

Retrieve a paginated list of video hooks with optional filtering.

**Endpoint:** `GET /api/hooks`

**Authentication:** None required

**Query Parameters:**

| Parameter       | Type   | Default | Description                                                     |
| --------------- | ------ | ------- | --------------------------------------------------------------- |
| `category`      | string | -       | Filter by category (beauty, tech, finance, pets, fitness, food) |
| `search`        | string | -       | Search in hook text                                             |
| `minEngagement` | number | 0       | Minimum engagement score (0-100)                                |
| `page`          | number | 1       | Page number                                                     |
| `limit`         | number | 20      | Results per page (max 50)                                       |

**Example Request:**

```bash
curl "https://adocavo.net/api/hooks?category=beauty&page=1&limit=20"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "hooks": [
      {
        "id": "hook_abc123",
        "text": "Stop scrolling if you have acne...",
        "category": "beauty",
        "engagementScore": 85,
        "isActive": true,
        "createdAt": "2025-01-16T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMore": true
    }
  }
}
```

---

### Get Hook by ID

Retrieve details for a specific hook.

**Endpoint:** `GET /api/hooks/{id}`

**Authentication:** None required

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Hook ID     |

**Example Request:**

```bash
curl "https://adocavo.net/api/hooks/hook_abc123"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "hook_abc123",
    "text": "Stop scrolling if you have acne...",
    "category": "beauty",
    "engagementScore": 85,
    "source": "tiktok/@creatore",
    "productTypes": ["skincare", "acne treatment"],
    "isActive": true,
    "createdAt": "2025-01-16T10:00:00.000Z"
  }
}
```

---

### Add to Waitlist

Join the waitlist for early access.

**Endpoint:** `POST /api/waitlist`

**Authentication:** None required

**Request Body:**

```json
{
  "email": "user@example.com",
  "interests": ["unlimited", "team", "api", "spy"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "You're on the list! We'll notify you when we launch.",
    "position": 1234
  }
}
```

---

### Track Feature Interest

Track user interest in unreleased features (fake door tracking).

**Endpoint:** `POST /api/track-fake-door`

**Authentication:** None required

**Request Body:**

```json
{
  "feature": "analyze_url",
  "referrer": "/homepage"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tracked": true
  }
}
```

---

## Protected Endpoints

These endpoints require authentication (session or guest).

### Analyze Product URL

Analyze a product URL to extract information and AI-powered selling points.

**Endpoint:** `POST /api/analyze-product`

**Authentication:** Required

**Rate Limit:**

- Guests: 3/hour
- Free users: 10/hour
- Pro users: 30/hour

**Request Body:**

```json
{
  "url": "https://www.amazon.com/product-page"
}
```

**Supported Platforms:**

- TikTok (video/product links)
- Amazon (product pages)
- Shopify stores
- Generic web pages (Open Graph meta tags)

**Request Validation:**

- `url`: Required, string, max 500 characters
- Must be valid HTTP/HTTPS URL
- Private IP addresses are blocked (SSRF prevention)

**Response:**

```json
{
  "success": true,
  "data": {
    "title": "Product Name",
    "description": "Product description extracted from page",
    "price": "$29.99",
    "imageUrl": "https://example.com/image.jpg",
    "source": "amazon",
    "formatted": "Product Name. Product description... Price: $29.99",
    "aiAnalysis": "This product solves acne problems with natural ingredients. Target audience: adults 18-45 with skin concerns. Key benefits: 2-week results, no harsh chemicals."
  }
}
```

**Error Responses:**

| Code                  | HTTP | Description                    |
| --------------------- | ---- | ------------------------------ |
| `VALIDATION_ERROR`    | 400  | Invalid URL format             |
| `SCRAPE_ERROR`        | 400  | Failed to extract product info |
| `RATE_LIMIT_EXCEEDED` | 429  | Too many analysis requests     |

**Security Features:**

- Private IP blocking (10.x, 172.16-31.x, 192.168.x)
- URL format validation
- 10-second timeout for scraping
- 24-hour result caching

---

### Generate Scripts

Generate video ad scripts using AI based on a hook and product description.

**Endpoint:** `POST /api/generate`

**Authentication:** Required (deducts 1 credit)

**Rate Limit:**

- Guests: 3 per day
- Authenticated: 10 per minute

**Request Body:**

```json
{
  "hookId": "hook_abc123",
  "productDescription": "A revolutionary skincare product that clears acne in 2 weeks using natural ingredients like tea tree oil and niacinamide.",
  "tone": "professional",
  "duration": 30
}
```

**Request Validation:**

- `hookId`: Required, string, must exist
- `productDescription`: Required, 20-500 characters
- `tone`: Optional, one of: professional, casual, enthusiastic
- `duration`: Optional, number in seconds (15-60)

**Response:**

```json
{
  "success": true,
  "data": {
    "generationId": "gen_xyz789",
    "scripts": [
      {
        "angle": "Pain Point",
        "script": "[Visual: Close-up of frustrated person looking at mirror]\n(Audio: \"Tired of acne ruining your confidence?\")\n..."
      },
      {
        "angle": "Benefit",
        "script": "[Visual: Before/after transformation]\n(Audio: \"Clear skin is just 2 weeks away...\")\n..."
      },
      {
        "angle": "Social Proof",
        "script": "[Visual: User testimonials]\n(Audio: \"Over 10,000 people have already discovered...\")\n..."
      }
    ],
    "creditsRemaining": 9,
    "hook": {
      "id": "hook_abc123",
      "text": "Stop scrolling if you have acne..."
    }
  }
}
```

**Error Responses:**

| Code                   | HTTP | Description                        |
| ---------------------- | ---- | ---------------------------------- |
| `INSUFFICIENT_CREDITS` | 402  | No credits remaining               |
| `HOOK_NOT_FOUND`       | 404  | Hook does not exist or is inactive |
| `AI_UNAVAILABLE`       | 503  | AI service temporarily unavailable |
| `RATE_LIMIT_EXCEEDED`  | 429  | Too many requests                  |

---

### Regenerate Script

Regenerate a specific script from a previous generation.

**Endpoint:** `POST /api/scripts/{id}/regenerate`

**Authentication:** Required

**Path Parameters:**

- `id`: Generation ID

**Request Body:**

```json
{
  "angleIndex": 0
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "script": {
      "angle": "Pain Point",
      "script": "Updated script content..."
    }
  }
}
```

---

### Favorite Hook

Add or remove a hook from user's favorites.

**Endpoint:** `POST /api/hooks/{id}/favorite`

**Authentication:** Required

**Path Parameters:**

- `id`: Hook ID

**Request Body:**

```json
{
  "favorite": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isFavorite": true
  }
}
```

---

### Rate Script

Submit a rating for a generated script.

**Endpoint:** `POST /api/scripts/{id}/rate`

**Authentication:** Required

**Path Parameters:**

- `id`: Generation/script ID

**Request Body:**

```json
{
  "rating": 5,
  "feedback": "Very helpful, used it for my campaign!"
}
```

**Validation:**

- `rating`: Required, number 1-5
- `feedback`: Optional, string, max 500 characters

**Response:**

```json
{
  "success": true,
  "data": {
    "averageRating": 4.5,
    "totalRatings": 23
  }
}
```

---

### Get Favorites

Retrieve user's favorited hooks.

**Endpoint:** `GET /api/scripts/favorites`

**Authentication:** Required

**Query Parameters:**

- `page`: Page number (default 1)
- `limit`: Results per page (default 20, max 50)

**Response:**

```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "hook": {
          "id": "hook_abc123",
          "text": "...",
          "category": "beauty"
        },
        "favoritedAt": "2025-01-16T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "hasMore": false
    }
  }
}
```

---

### Analyze Competitor

Analyze a competitor's URL (feature in development).

**Endpoint:** `POST /api/analyze`

**Authentication:** Required

**Request Body:**

```json
{
  "url": "https://example.com/product"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "analysis": {
      "hook": "Extracted or generated hook...",
      "angle": "Detected marketing angle...",
      "suggestions": ["Improvement suggestion 1", "..."]
    }
  }
}
```

---

### Get User Stats

Get current user's statistics and credits.

**Endpoint:** `GET /api/stats`

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "credits": {
      "remaining": 9,
      "limit": 10,
      "resetsAt": "2025-01-17T00:00:00.000Z"
    },
    "stats": {
      "generationsThisWeek": 5,
      "totalGenerations": 42,
      "favoritesCount": 8
    }
  }
}
```

---

## Admin Endpoints

These endpoints require admin authentication.

### Get Admin Metrics

Retrieve system-wide metrics.

**Endpoint:** `GET /api/admin/metrics`

**Authentication:** Admin required

**Response:**

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1234,
      "activeThisWeek": 456,
      "newToday": 12
    },
    "generations": {
      "total": 5678,
      "today": 234,
      "thisWeek": 1234
    },
    "credits": {
      "totalIssued": 12345,
      "totalUsed": 9876
    },
    "hooks": {
      "total": 500,
      "active": 450
    }
  }
}
```

---

### Get Review Queue

Get hooks pending admin review.

**Endpoint:** `GET /api/admin/review-queue`

**Authentication:** Admin required

**Query Parameters:**

- `status`: pending, approved, rejected (default: pending)
- `page`: Page number
- `limit`: Results per page

**Response:**

```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "id": "hook_pending_1",
        "text": "...",
        "category": "beauty",
        "submittedBy": "user_123",
        "submittedAt": "2025-01-16T10:00:00.000Z",
        "status": "pending"
      }
    ],
    "pagination": {
      "page": 1,
      "total": 25
    }
  }
}
```

---

### Approve/Reject Hook

Moderate a user-submitted hook.

**Endpoint:** `POST /api/admin/review-queue/{id}`

**Authentication:** Admin required

**Request Body:**

```json
{
  "action": "approve",
  "notes": "Great hook, fits the beauty category well."
}
```

**Actions:** `approve`, `reject`

**Response:**

```json
{
  "success": true,
  "data": {
    "hook": {
      "id": "hook_123",
      "status": "approved"
    }
  }
}
```

---

### Update Hook

Edit an existing hook.

**Endpoint:** `PUT /api/admin/hooks/{id}`

**Authentication:** Admin required

**Request Body:**

```json
{
  "text": "Updated hook text...",
  "category": "tech",
  "isActive": true,
  "engagementScore": 90
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "hook": {
      "id": "hook_123",
      "text": "Updated hook text...",
      "category": "tech",
      "isActive": true,
      "engagementScore": 90,
      "updatedAt": "2025-01-16T11:00:00.000Z"
    }
  }
}
```

---

### Delete Hook

Delete a hook from the database.

**Endpoint:** `DELETE /api/admin/hooks/{id}`

**Authentication:** Admin required

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

## Rate Limiting

### Rate Limits by Endpoint

| Endpoint                      | Guest       | Authenticated |
| ----------------------------- | ----------- | ------------- |
| `POST /api/generate`          | 3/day       | 10/minute     |
| `POST /api/waitlist`          | 3/5 minutes | -             |
| `GET /api/hooks`              | 100/minute  | 100/minute    |
| `POST /api/analyze-product`   | 3/hour      | 10/hour       |
| `POST /api/analyze`           | -           | 8/hour        |
| `POST /api/scripts/{id}/rate` | -           | 20/minute     |
| `POST /api/scripts/favorites` | -           | 30/minute     |

### Rate Limit Response Format

When rate limited:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 45
  }
}
```

**Headers:**

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705423200
Retry-After: 45
```

---

## Error Responses

### Standard Error Codes

| Code                   | HTTP | Description               |
| ---------------------- | ---- | ------------------------- |
| `VALIDATION_ERROR`     | 400  | Request validation failed |
| `AUTHENTICATION_ERROR` | 401  | Not authenticated         |
| `AUTHORIZATION_ERROR`  | 403  | Insufficient permissions  |
| `NOT_FOUND`            | 404  | Resource not found        |
| `INSUFFICIENT_CREDITS` | 402  | Not enough credits        |
| `RATE_LIMIT_EXCEEDED`  | 429  | Rate limit exceeded       |
| `DATABASE_ERROR`       | 500  | Database operation failed |
| `AI_SERVICE_ERROR`     | 503  | AI service unavailable    |
| `INTERNAL_ERROR`       | 500  | Unexpected server error   |

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "productDescription": ["Must be at least 20 characters"],
      "hookId": ["Hook not found"]
    }
  }
}
```

---

## Webhooks

### Webhook Configuration

Webhooks can be configured for deployment notifications.

**Environment Variables:**

- `WEBHOOK_URL`: Generic webhook URL
- `SLACK_WEBHOOK_URL`: Slack incoming webhook
- `DISCORD_WEBHOOK_URL`: Discord webhook

### Deployment Webhook Payload

**Success Event:**

```json
{
  "environment": "production",
  "status": "success",
  "branch": "main",
  "commit_sha": "abc123",
  "commit_message": "Add new feature",
  "commit_author": "developer",
  "timestamp": "2025-01-16T10:00:00.000Z",
  "app_url": "https://adocavo.net",
  "health_url": "https://adocavo.net/api/health"
}
```

**Failure Event:**

```json
{
  "environment": "production",
  "status": "failed",
  "error": "Health check failed",
  "branch": "main",
  "commit_sha": "abc123",
  "timestamp": "2025-01-16T10:00:00.000Z"
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// API client wrapper
class AdocavoAPI {
  constructor(private baseURL: string) {}

  async generateScript(hookId: string, productDescription: string) {
    const response = await fetch(`${this.baseURL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Send cookies
      body: JSON.stringify({ hookId, productDescription }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
}

const api = new AdocavoAPI("https://adocavo.net");
const result = await api.generateScript(
  "hook_123",
  "My product description...",
);
```

### cURL

```bash
# Generate script
curl -X POST "https://adocavo.net/api/generate" \
  -H "Content-Type: application/json" \
  --cookie "session=..." \
  -d '{
    "hookId": "hook_abc123",
    "productDescription": "A revolutionary skincare product..."
  }'

# Get hooks
curl "https://adocavo.net/api/hooks?category=beauty&limit=20"

# Health check
curl "https://adocavo.net/api/health"
```

---

## Changelog

### Version 1.0.0 (2025-01-16)

- Initial API documentation
- Public endpoints: health, hooks, waitlist
- Protected endpoints: generate, favorites, ratings
- Admin endpoints: metrics, review queue

---

**Last Updated:** 2025-01-16
**API Base URL:** https://adocavo.net
**Maintained By:** Adocavo Team
