# Enterprise Asset Management System (AMS) — Frontend

> **“Intelligent Energy Delivered”**  
> Modern, energy-inspired enterprise frontend for managing company hardware, smart metering equipment, field tools, and IT assets.

---

## 1. Overview & Brand Identity

This application provides a centralized operational platform for asset tracking, inventory auditing, and physical verification. It is themed around intelligent energy infrastructure and sustainable technology:

- **Primary Forest Green (`#176B4D`)**: Primary actions, active navigation, and key indicators.
- **Deep Green (`#104C38`)**: Brand titles and headers.
- **Fresh Energy Green (`#79B84A`)**: Energy accents and positive verification markers.
- **Pale Green Surface (`#EAF4E7`)**: Active navigation pill background and badge backgrounds.
- **Main Background (`#F7F9F6`)**: High-readability warm off-white.
- **Card Background (`#FFFFFF`)**: Clean white surfaces with `#E1E8E1` borders.

---

## 2. Tech Stack

- **Framework**: React 18 with Vite
- **Language**: JavaScript & JSX
- **Styling**: Tailwind CSS with custom enterprise design tokens
- **Routing**: React Router v6
- **State & Data Fetching**: TanStack Query v5 + Axios
- **Charts & Visualization**: Recharts
- **Icons**: Lucide React
- **Forms & Validation**: Controlled React forms with inline validation

---

## 3. Installation & Getting Started

### Prerequisites

- **Node.js** v18+ (tested with Node v24)
- **Scala Backend**: Running on `http://localhost:8080`

### Setup

```bash
# Navigate to the frontend directory
cd amsfrontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will start at `http://localhost:5173`.

Vite is pre-configured with a reverse proxy for `/api` and `/health` requests pointing directly to `http://localhost:8080`, eliminating browser CORS issues during local development.

---

## 4. Backend Contracts & Integration

### Implemented Endpoints
- `GET /health`: App health check
- `GET /health/db`: Database connection health check
- `GET /api/assets`: Paginated & filtered inventory search
- `GET /api/assets/:id`: Single asset record retrieval
- `POST /api/assets`: Create asset
- `PUT /api/assets/:id`: Update asset
- `DELETE /api/assets/:id`: Delete asset

### Pending Backend Endpoints
- `POST /api/auth/login`: Real session authentication (currently supported via explicit dev mock simulator)
- `GET /api/asset-types`: Lookup API for asset types
- `GET /api/locations`: Lookup API for physical sites
- `GET /api/users`: User management & role assignment
- `GET /api/assets/export`: Full inventory Excel export endpoint
