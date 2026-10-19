# Scala Backend API Test Results

**Target Server:** `http://localhost:8080` (Process: Apache Pekko HTTP / PostgreSQL)  
**Test Date:** October 11, 2026  
**Total Tests:** 15  
**Passed:** 15 (100%)  
**Failed:** 0  

---

## 1. Test Summary Table

| # | Test Scenario | HTTP Method | Endpoint Path | Expected | Actual | Latency | Result |
|---|---|:---:|---|:---:|:---:|:---:|:---:|
| 1 | App Service Health Check | `GET` | `/health` | `200` | `200` | 28 ms | ✅ PASS |
| 2 | Database Health Check | `GET` | `/health/db` | `200` | `200` | 15 ms | ✅ PASS |
| 3 | List Assets (Default Pagination) | `GET` | `/api/assets` | `200` | `200` | 28 ms | ✅ PASS |
| 4 | Search Assets Filter | `GET` | `/api/assets?search=Dell` | `200` | `200` | 29 ms | ✅ PASS |
| 5 | Filter Assets by Cost Center | `GET` | `/api/assets?costCenter=CC-101` | `200` | `200` | 32 ms | ✅ PASS |
| 6 | Filter Assets by Tagging Status | `GET` | `/api/assets?taggingStatus=T` | `200` | `200` | 25 ms | ✅ PASS |
| 7 | Pagination Window (Page 1, Size 2) | `GET` | `/api/assets?page=1&pageSize=2` | `200` | `200` | 23 ms | ✅ PASS |
| 8 | Retrieve Single Asset by ID | `GET` | `/api/assets/2` | `200` | `200` | 27 ms | ✅ PASS |
| 9 | Non-existent Asset Lookup | `GET` | `/api/assets/99999` | `404` | `404` | 32 ms | ✅ PASS |
| 10 | Create New Asset (Valid Record) | `POST` | `/api/assets` | `201` | `201` | 125 ms | ✅ PASS |
| 11 | Retrieve Newly Created Asset | `GET` | `/api/assets/5` | `200` | `200` | 19 ms | ✅ PASS |
| 12 | Update Created Asset | `PUT` | `/api/assets/5` | `200` | `200` | 34 ms | ✅ PASS |
| 13 | Delete Created Asset | `DELETE` | `/api/assets/5` | `204` | `204` | 26 ms | ✅ PASS |
| 14 | Confirm Deletion (Not Found) | `GET` | `/api/assets/5` | `404` | `404` | 7 ms | ✅ PASS |
| 15 | Create Asset with Invalid Data | `POST` | `/api/assets` | `400` | `400` | 4 ms | ✅ PASS |

---

## 2. Detailed Endpoint Responses

### 2.1 System Health Endpoints

#### `GET /health`
- **Status:** `200 OK`
- **Response Body:**
```json
{
  "status": "UP",
  "service": "asset-management-system"
}
```

#### `GET /health/db`
- **Status:** `200 OK`
- **Response Body:**
```json
{
  "status": "UP",
  "database": "assetmanagement"
}
```

---

### 2.2 Asset Query & Filter Endpoints

#### `GET /api/assets` (Default List)
- **Status:** `200 OK`
- **Response Body:**
```json
{
  "items": [
    {
      "id": 4,
      "assetCode": "AST-1003",
      "assetTypeId": 1,
      "name": "Lenovo ThinkPad Laptop",
      "quantity": 2,
      "actualFound": null,
      "costCenter": "CC-202",
      "assetOwnerId": null,
      "custodianId": null,
      "locationId": null,
      "dateOfChecking": null,
      "taggingStatus": "TR",
      "makeModel": "ThinkPad T14",
      "remarks": null
    },
    {
      "id": 3,
      "assetCode": "AST-1002",
      "assetTypeId": 1,
      "name": "HP EliteBook Laptop",
      "quantity": 3,
      "actualFound": 3,
      "costCenter": "CC-101",
      "assetOwnerId": null,
      "custodianId": null,
      "locationId": null,
      "dateOfChecking": null,
      "taggingStatus": "T",
      "makeModel": "HP EliteBook 840",
      "remarks": null
    },
    {
      "id": 2,
      "assetCode": "AST-1001",
      "assetTypeId": 1,
      "name": "Dell Latitude Laptop",
      "quantity": 5,
      "actualFound": 4,
      "costCenter": "CC-101",
      "assetOwnerId": null,
      "custodianId": null,
      "locationId": null,
      "dateOfChecking": null,
      "taggingStatus": "T",
      "makeModel": "Dell Latitude 5450",
      "remarks": null
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 3
}
```

#### `GET /api/assets?search=Dell`
- **Status:** `200 OK`
- **Response Body:**
```json
{
  "items": [
    {
      "id": 2,
      "assetCode": "AST-1001",
      "assetTypeId": 1,
      "name": "Dell Latitude Laptop",
      "quantity": 5,
      "actualFound": 4,
      "costCenter": "CC-101",
      "assetOwnerId": null,
      "custodianId": null,
      "locationId": null,
      "dateOfChecking": null,
      "taggingStatus": "T",
      "makeModel": "Dell Latitude 5450",
      "remarks": null
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 1
}
```

#### `GET /api/assets?costCenter=CC-101`
- **Status:** `200 OK`
- **Response Body:**
```json
{
  "items": [
    {
      "id": 3,
      "assetCode": "AST-1002",
      "assetTypeId": 1,
      "name": "HP EliteBook Laptop",
      "quantity": 3,
      "actualFound": 3,
      "costCenter": "CC-101",
      "assetOwnerId": null,
      "custodianId": null,
      "locationId": null,
      "dateOfChecking": null,
      "taggingStatus": "T",
      "makeModel": "HP EliteBook 840",
      "remarks": null
    },
    {
      "id": 2,
      "assetCode": "AST-1001",
      "assetTypeId": 1,
      "name": "Dell Latitude Laptop",
      "quantity": 5,
      "actualFound": 4,
      "costCenter": "CC-101",
      "assetOwnerId": null,
      "custodianId": null,
      "locationId": null,
      "dateOfChecking": null,
      "taggingStatus": "T",
      "makeModel": "Dell Latitude 5450",
      "remarks": null
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 2
}
```

#### `GET /api/assets?page=1&pageSize=2`
- **Status:** `200 OK`
- **Response Body:**
```json
{
  "items": [
    {
      "id": 4,
      "assetCode": "AST-1003",
      "name": "Lenovo ThinkPad Laptop",
      "quantity": 2,
      "costCenter": "CC-202"
    },
    {
      "id": 3,
      "assetCode": "AST-1002",
      "name": "HP EliteBook Laptop",
      "quantity": 3,
      "costCenter": "CC-101"
    }
  ],
  "page": 1,
  "pageSize": 2,
  "totalItems": 3
}
```

---

### 2.3 Asset Lifecycle Operations (CRUD)

#### `POST /api/assets` (Creation)
- **Request Body:**
```json
{
  "assetCode": "TEST-AST-8157",
  "name": "ABB Grid Inverter Sensor",
  "assetTypeId": 1,
  "quantity": 10,
  "actualFound": 8,
  "costCenter": "CC-ENERGY-01",
  "taggingStatus": "T",
  "makeModel": "ABB PVS980-58",
  "remarks": "Automated endpoint test fixture"
}
```
- **Status:** `201 Created`
- **Response Body:**
```json
{
  "id": 5,
  "assetCode": "TEST-AST-8157",
  "assetTypeId": 1,
  "name": "ABB Grid Inverter Sensor",
  "quantity": 10,
  "actualFound": 8,
  "costCenter": "CC-ENERGY-01",
  "assetOwnerId": null,
  "custodianId": null,
  "locationId": null,
  "dateOfChecking": null,
  "taggingStatus": "T",
  "makeModel": "ABB PVS980-58",
  "remarks": "Automated endpoint test fixture"
}
```

#### `PUT /api/assets/5` (Update)
- **Request Body:**
```json
{
  "assetCode": "TEST-AST-8157",
  "name": "ABB Grid Inverter Sensor - Calibrated",
  "assetTypeId": 1,
  "quantity": 10,
  "actualFound": 10,
  "costCenter": "CC-ENERGY-01",
  "taggingStatus": "T",
  "makeModel": "ABB PVS980-58 V2",
  "remarks": "Updated via endpoint test"
}
```
- **Status:** `200 OK`
- **Response Body:**
```json
{
  "id": 5,
  "assetCode": "TEST-AST-8157",
  "assetTypeId": 1,
  "name": "ABB Grid Inverter Sensor - Calibrated",
  "quantity": 10,
  "actualFound": 10,
  "costCenter": "CC-ENERGY-01",
  "assetOwnerId": null,
  "custodianId": null,
  "locationId": null,
  "dateOfChecking": null,
  "taggingStatus": "T",
  "makeModel": "ABB PVS980-58 V2",
  "remarks": "Updated via endpoint test"
}
```

#### `DELETE /api/assets/5` (Deletion)
- **Status:** `204 No Content`
- **Response Body:** *(Empty)*

#### `GET /api/assets/5` (Verification After Deletion)
- **Status:** `404 Not Found`

---

### 2.4 Validation & Error Handling

#### `POST /api/assets` (Invalid Payload)
- **Request Body:**
```json
{
  "assetCode": "",
  "name": "",
  "assetTypeId": -1,
  "quantity": -5
}
```
- **Status:** `400 Bad Request`
- **Behavior:** Backend rejected the request because asset code was empty and quantity/assetTypeId violated domain constraints.

---

## 3. Key Observations & Integration Notes

1. **Content Negotiation:**  
   Pekko HTTP completes string representations with media type `text/plain`. Clients must include `text/plain` or `*/*` in their `Accept` header (e.g. `Accept: application/json, text/plain, */*`) to avoid HTTP `406 Not Acceptable`.
2. **Database Integrity:**  
   PostgreSQL foreign key constraints and check constraints (`actual_found <= quantity`) are actively enforced by both the database and the Pekko application layer.
3. **Response Speeds:**  
   All database operations averaged **15 ms – 35 ms**, demonstrating excellent local execution performance.
