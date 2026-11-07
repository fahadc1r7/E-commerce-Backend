# E-Commerce Backend System

A secure REST API for an online store, built with **Node.js, Express and MongoDB**. It covers JWT authentication, role-based access control (RBAC), CRUD for products, orders and user profiles, product search/filter/sort, and a **RapidMiner-powered product recommendation system**.

- **Live API:** `<paste your Render URL here>`
- **Repository:** https://github.com/fahadc1r7/E-commerce-Backend

---

## Tech stack

| Area | Tools |
|---|---|
| Server | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Security | bcryptjs (password hashing), jsonwebtoken (JWT), helmet, cors, express-validator |
| Recommendations | RapidMiner (Altair AI Studio), FP-Growth association rules |
| Tooling | nodemon, Postman, Git and GitHub |

---

## Folder structure

```
ecommerce-backend/
├── index.js                     # Express server entry point
├── config/
│   └── dbConnection.js          # MongoDB connection
├── models/
│   ├── user.js
│   ├── product.js
│   └── order.js
├── controllers/
│   ├── authentication.js        # register, login, JWT
│   ├── userProfile.js           # profile CRUD + admin user management
│   ├── productController.js     # product CRUD, search, filter, sort
│   ├── orderController.js       # place, list, track, cancel, update orders
│   └── analyticsController.js   # recommendations + CSV export for RapidMiner
├── routes/
│   ├── authenticationRoutes.js
│   ├── userProfileRoutes.js
│   ├── productRoutes.js
│   ├── orderRoutes.js
│   └── analyticsRoutes.js
├── middleware/
│   ├── authMiddleware.js        # protect, optionalAuth, authorize (RBAC)
│   ├── validate.js              # express-validator result handler
│   └── errorHandler.js          # centralised JSON error responses
├── scripts/
│   ├── seed.js                  # sample users, products and orders
│   └── buildRecommendations.js  # RapidMiner output -> data/recommendations.csv
├── rapidminer/
│   ├── recommendations.rmp      # RapidMiner process
│   ├── orders_export.csv        # input exported from the API
│   └── rules_output.csv         # output written by RapidMiner
├── data/
│   └── recommendations.csv      # file served by the recommendations endpoint
└── docs/screenshots/            # test and RapidMiner screenshots
```

---

## Getting started

### 1. Install

```bash
git clone https://github.com/fahadc1r7/E-commerce-Backend.git
cd E-commerce-Backend
npm install
```

### 2. Environment variables

Create a `.env` file in the project root (see `.env.example`):

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ecommerce?retryWrites=true&w=majority
JWT_SECRET=<a long random string>
JWT_EXPIRES_IN=1d
```

`.env` is listed in `.gitignore` and is never committed.

### 3. Run

```bash
npm run dev     # development with nodemon
npm start       # production
```

The server prints `Server on 5000` and `MongoDB connected` when it is ready.

### 4. Optional: load sample data

```bash
node scripts/seed.js
```

This creates six sample users (`seed1@test.com` to `seed6@test.com`, password `123456`), eight products and six orders with realistic buying patterns. These accounts are for testing only.

### 5. Create an admin

Register normally, then change `role` to `"admin"` for that user in MongoDB Atlas (Browse Collections, then `users`). An existing admin can also promote users with `PUT /api/users/:id/role`.

---

## Roles and permissions

| Role | How it is identified | What it can do |
|---|---|---|
| **Guest** | No token sent | List, search, filter and view products |
| **User** | Valid JWT, role `user` | Everything a guest can, plus own profile, place and cancel own orders, view own orders, get recommendations |
| **Admin** | Valid JWT, role `admin` | Everything, plus create, update and delete products, view and manage all orders and users, export order data |

The guest role is implemented as the absence of a token (`optionalAuth` middleware sets `req.user = { role: "guest" }`). A token that is present but invalid is always rejected with `401`. The `role` field can never be set through register or profile-update requests.

---

## API endpoints

All responses are JSON in the form `{ "success": true/false, ... }`. Send tokens as `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create an account, returns a JWT |
| POST | `/api/auth/login` | Public | Log in, returns a JWT |

### User profiles

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users/me` | User | Own profile |
| PUT | `/api/users/me` | User | Update name or email |
| PUT | `/api/users/me/password` | User | Change password (current password required) |
| DELETE | `/api/users/me` | User | Delete own account |
| GET | `/api/users` | Admin | List users (paginated) |
| GET | `/api/users/:id` | Admin | One user |
| PUT | `/api/users/:id/role` | Admin | Change a user's role |
| DELETE | `/api/users/:id` | Admin | Delete a user |

### Products

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/products` | Guest and above | List with search, filter, sort and pagination |
| GET | `/api/products/:id` | Guest and above | One product |
| POST | `/api/products` | Admin | Create |
| PUT | `/api/products/:id` | Admin | Update |
| DELETE | `/api/products/:id` | Admin | Delete |

Query parameters for `GET /api/products`:

| Parameter | Example | Meaning |
|---|---|---|
| `search` | `search=phone` | Name contains the text (case-insensitive) |
| `category` | `category=electronics` | Exact category |
| `minPrice`, `maxPrice` | `minPrice=50&maxPrice=900` | Price range |
| `sort` | `sort=-price` or `sort=name,price` | Sort fields (prefix `-` for descending) |
| `page`, `limit` | `page=2&limit=10` | Pagination (limit is capped at 100) |

### Orders

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/orders` | User | Place an order |
| GET | `/api/orders` | User or Admin | Users see their own orders, admins see all |
| GET | `/api/orders/:id` | Owner or Admin | One order (tracking) |
| PUT | `/api/orders/:id/status` | Admin | Update status |
| PUT | `/api/orders/:id/cancel` | Owner | Cancel a pending order |
| DELETE | `/api/orders/:id` | Admin | Delete an order |

Order totals and prices are always calculated on the server from the database. Stock is reduced atomically, which prevents overselling, and it is restored when an order is cancelled.

### Analytics

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/analytics/recommendations` | User | Product recommendations for the logged-in user |
| GET | `/api/analytics/export/orders` | Admin | CSV of user-product purchases, the RapidMiner input |

---

## Security practices

- **Passwords** are hashed with bcryptjs (cost factor 10) and are excluded from query results (`select: false`).
- **JWT** tokens are signed with a secret from the environment and expire after `JWT_EXPIRES_IN` (1 day by default). Expired or tampered tokens return `401`.
- **Token lifecycle:** tokens are short-lived and are not refreshed. After expiry the user logs in again. The middleware loads the user from the database on every request, so a deleted user's token stops working immediately.
- **RBAC:** `protect` verifies the token, and `authorize(...roles)` enforces the role. Insufficient role returns `403`.
- **Validation and sanitisation:** express-validator checks and sanitises request bodies, route ids and query values. Search text is escaped before it is used in a regular expression, query parameters are cast to the expected types, and update endpoints accept only whitelisted fields. This blocks NoSQL injection and mass assignment.
- **Other:** `helmet` security headers, CORS, a central error handler with consistent `400/401/403/404/500` responses, and CSV export cells protected against formula injection.

---

## Predictive analytics: product recommendations with RapidMiner

Recommendations are built from **user behaviour** (what each user bought, and how much) and **product attributes** (product id and category in the exported data) using **association rules** in RapidMiner.

### Pipeline

```
MongoDB orders
  -> GET /api/analytics/export/orders  (admin)  ->  rapidminer/orders_export.csv
  -> RapidMiner process (rapidminer/recommendations.rmp)
  -> rapidminer/rules_output.csv
  -> node scripts/buildRecommendations.js
  -> data/recommendations.csv
  -> GET /api/analytics/recommendations
```

### RapidMiner process

1. **Retrieve** the exported orders, then **Select Attributes** (`userId`, `productId`, `quantity`).
2. **Pivot** into one row per user and one column per product (sum of quantity).
3. **Replace Missing Values** (zero) and **Numerical to Binominal**, so each cell says whether the user bought the product.
4. **Set Role**: `userId` becomes `id`, so it is not used as an item.
5. **Multiply** the data into two branches.
6. **FP-Growth** finds frequent product sets, and **Create Association Rules** produces rules such as "bought iPhone 15, also bought Wireless Earbuds" (min support 0.1, min confidence 0.5).
7. **Apply Association Rules** scores every product for every user.
8. **Write CSV** saves the scored table to `rapidminer/rules_output.csv`.

The process file is `rapidminer/recommendations.rmp`. The path in its Write CSV operator points to the author's machine, so change it to your own folder before running it.

![RapidMiner process](docs/screenshots/05-rapidminer-process.png)

![Association rules](docs/screenshots/06-association-rules.png)

### From rules to API results

`scripts/buildRecommendations.js` reads `rules_output.csv`, removes products the user already owns, ranks the rest by rule confidence, keeps the top five per user and writes `data/recommendations.csv` (`userId,productId,rank`).

The endpoint then works like this:

1. If the user appears in `data/recommendations.csv`, return those products with `"source": "rapidminer"`.
2. Otherwise use a fallback (so new users still get suggestions): other products from categories the user bought from (`fallback-category`), then best sellers (`fallback-popular`), then newest products (`fallback-newest`).

### Regenerate the recommendations

1. Log in as an admin and download `GET /api/analytics/export/orders` to `rapidminer/orders_export.csv`.
2. Import that file in RapidMiner, run the process, and let Write CSV save `rapidminer/rules_output.csv`.
3. Run `node scripts/buildRecommendations.js`.

### Example results

| User | Already bought | Recommended |
|---|---|---|
| fahad@test.com | iPhone 15 | Wireless Earbuds |
| seed1@test.com | iPhone 15, Wireless Earbuds, Phone Charger | Smart Watch, Laptop |

![Recommendations for the first user](docs/screenshots/01-recommendations-fahad.png)

![Recommendations for seed1](docs/screenshots/02-recommendations-seed1.png)

---

## Testing

Everything was tested with Postman.

| Test | Expected |
|---|---|
| `POST /api/auth/register`, then `/login` | `201`, then `200` with a token |
| `GET /api/products?search=iphone&sort=-price` with no token | `200` |
| `POST /api/products` with no token | `401` |
| `POST /api/products` as a normal user | `403` |
| `POST /api/products` as an admin | `201` |
| `POST /api/orders` with `quantity` above stock | `400`, stock unchanged |
| `GET /api/orders/:id` for another user's order | `403` |
| Expired or tampered token | `401` |
| `GET /api/analytics/recommendations` | `200`, `"source": "rapidminer"` |

![Invalid token](docs/screenshots/03-invalid-token-401.png)

![Normal user forbidden](docs/screenshots/04-user-forbidden-403.png)

---

## Known limitations

- Stock reduction and order creation are not wrapped in one database transaction. Manual rollback covers normal failures, and MongoDB transactions would be the production solution.
- Recommendations are generated offline and served from a file. They are refreshed by re-running the RapidMiner process.
- There is no refresh-token or logout mechanism. Tokens simply expire.

---

## Author

Fahad, Entri Full Stack Development V8, Module 4 assignment.
