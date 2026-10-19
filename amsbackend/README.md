# Asset Management System (AMS) Backend

Backend service for the Landis+Gyr Asset Management System (AMS). Built with Scala 2.13, Apache Pekko HTTP, Slick, PostgreSQL, Flyway, Jackson, JJWT, BCrypt, and Apache POI.

---

## 1. Technology Stack

- **Language:** Scala 2.13.18
- **Runtime:** JVM (Java 17)
- **Build Tool:** Gradle 9.6.1 (Groovy DSL)
- **HTTP Server & Routing:** Apache Pekko HTTP 1.4.1 / Pekko Typed 1.7.1
- **Database:** PostgreSQL 16+
- **Database Access & ORM:** Slick 3.6.1
- **Connection Pool:** HikariCP 6.3.0
- **Database Migrations:** Flyway 11.10.5
- **JSON Serialization:** Jackson 2.19.2 (Scala Module + JSR310 Java Time)
- **Password Security:** BCrypt 0.10.2 (Cost factor 12)
- **Authentication:** JWT via JJWT 0.12.6 (HMAC-SHA256)
- **Excel Export:** Apache POI 5.4.0 (`poi`, `poi-ooxml`)
- **Testing:** ScalaTest 3.2.19, Pekko HTTP Testkit, Pekko Actor Testkit Typed

---

## 2. Configuration & Environment Variables

The application reads configuration from `app/src/main/resources/application.conf` with full environment variable overrides:

| Variable | Default Value | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/assetmanagement` | PostgreSQL JDBC connection URL |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `root` | Database password |
| `HTTP_HOST` | `127.0.0.1` | HTTP binding host |
| `HTTP_PORT` | `8080` | HTTP binding port |
| `JWT_SECRET` | *(64-byte secure default for dev)* | Secret key for signing and validating JWT tokens (min 256-bit) |

### Setting Environment Variables (PowerShell)

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/assetmanagement"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "your_secure_password"
$env:JWT_SECRET = "your-at-least-32-byte-long-secret-key-for-jwt-signing"
$env:HTTP_PORT = "8080"
```

---

## 3. Database Schema & Migrations

Database migrations are managed automatically by Flyway upon application startup from `app/src/main/resources/db/migration/`.

### Schema Summary:
- **`roles`**: `id` (PK), `name` (`SUPER_ADMIN`, `ADMIN`, `GENERAL`)
- **`departments`**: `id` (PK), `name` (Unique)
- **`users`**: `id` (PK), `employee_id` (Unique), `name`, `email` (Unique), `password_hash`, `role_id` (FK to roles), `department_id` (FK to departments), `status` (`ACTIVE`, `INACTIVE`)
- **`asset_types`**: `id` (PK), `name` (Unique)
- **`locations`**: `id` (PK), `name`, `address`, `city`, `country`, `floor`, `room_location`
- **`assets`**: `id` (PK), `asset_code` (Unique), `asset_type_id` (FK), `name`, `quantity`, `actual_found`, `cost_center`, `asset_owner_id` (FK), `custodian_id` (FK), `location_id` (FK), `date_of_checking`, `tagging_status`, `make_model`, `remarks`
- **`asset_items`**: `id` (PK), `asset_id` (FK), `asset_tag` (Unique), `serial_number`, `serial_number_found`, `status`, `custodian_id` (FK), `location_id` (FK), `verification_status`, `tagging_status`, `date_of_checking`, `gate_pass_number`

---

## 4. Security & Role-Based Access Control (RBAC)

The system enforces strict server-side authorization on all routes:

- **`GENERAL`**: Read-only inventory access. Can search, filter, paginate, retrieve assets and asset items, and download Excel exports. Cannot create, modify, or delete any data.
- **`ADMIN`**: Operational administrator. Can manage assets, asset items, reference data, and ordinary (`GENERAL`) user accounts. Cannot elevate users to `ADMIN` or `SUPER_ADMIN`. Cannot modify or delete other administrators.
- **`SUPER_ADMIN`**: Elevated system administrator. Can manage all resources including granting/revoking administrative roles.

### Safeguards:
1. **Super Admin Protection**: An `ADMIN` cannot modify, deactivate, or delete a `SUPER_ADMIN` or another `ADMIN`.
2. **Last Super Admin Safeguard**: Deactivating or demoting the last active `SUPER_ADMIN` in the database is blocked with `409 Conflict`.
3. **Database-Backed Token Verification**: Every authenticated request validates token signature and checks database status. Inactive or deleted accounts are immediately rejected with `401 Unauthorized`.
4. **Credential Privacy**: Passwords are never returned in DTOs or logged. Password hashes use BCrypt with 12 salt rounds.
5. **Formula Injection Defense**: Excel exports sanitize any user input starting with `=`, `+`, `-`, `@`, `\t`, or `\r` to prevent CSV/Spreadsheet injection attacks.

---

## 5. API Endpoint Reference

### System & Health
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Application health status |
| `GET` | `/health/db` | Public | Database connection health status |

### Authentication
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate via employee ID or email |

### User Management
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/users` | `ADMIN`, `SUPER_ADMIN` | List users with pagination and filters (`search`, `roleId`, `departmentId`, `status`) |
| `GET` | `/api/users/{id}` | `ADMIN`, `SUPER_ADMIN` | Retrieve single user by ID |
| `POST` | `/api/users` | `ADMIN`, `SUPER_ADMIN` | Create user (Admins can only create `GENERAL`) |
| `PUT` | `/api/users/{id}` | `ADMIN`, `SUPER_ADMIN` | Update user details (name, email, department) |
| `PATCH` | `/api/users/{id}/status` | `ADMIN`, `SUPER_ADMIN` | Activate or deactivate user account |
| `PATCH` | `/api/users/{id}/role` | `SUPER_ADMIN` only | Change user role |
| `DELETE` | `/api/users/{id}` | `ADMIN`, `SUPER_ADMIN` | Safe delete user (blocked if referenced by assets/items) |

### Asset Management
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/assets` | `GENERAL`, `ADMIN`, `SUPER_ADMIN` | Search & filter assets with pagination & sorting |
| `GET` | `/api/assets/{id}` | `GENERAL`, `ADMIN`, `SUPER_ADMIN` | Retrieve asset by ID |
| `POST` | `/api/assets` | `ADMIN`, `SUPER_ADMIN` | Create new asset |
| `PUT` | `/api/assets/{id}` | `ADMIN`, `SUPER_ADMIN` | Update asset details |
| `DELETE` | `/api/assets/{id}` | `ADMIN`, `SUPER_ADMIN` | Safe delete asset (blocked if asset items exist) |
| `GET` | `/api/assets/export` | `GENERAL`, `ADMIN`, `SUPER_ADMIN` | Export filtered inventory to `.xlsx` Excel workbook |

### Individual Asset Items
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/asset-items` | `GENERAL`, `ADMIN`, `SUPER_ADMIN` | List asset items with pagination and filters |
| `GET` | `/api/asset-items/{id}` | `GENERAL`, `ADMIN`, `SUPER_ADMIN` | Retrieve asset item by ID |
| `POST` | `/api/asset-items` | `ADMIN`, `SUPER_ADMIN` | Create asset item (validates parent asset quantity) |
| `PUT` | `/api/asset-items/{id}` | `ADMIN`, `SUPER_ADMIN` | Update asset item details |
| `DELETE` | `/api/asset-items/{id}` | `ADMIN`, `SUPER_ADMIN` | Delete asset item |
| `PATCH` | `/api/asset-items/{id}/verification` | `ADMIN`, `SUPER_ADMIN` | Update verification & tagging status |

### Reference Data (Departments, Asset Types, Locations)
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/departments` | Authenticated | List all departments |
| `GET` | `/api/departments/{id}` | Authenticated | Retrieve department by ID |
| `POST` | `/api/departments` | `ADMIN`, `SUPER_ADMIN` | Create department |
| `PUT` | `/api/departments/{id}` | `ADMIN`, `SUPER_ADMIN` | Update department |
| `DELETE` | `/api/departments/{id}` | `ADMIN`, `SUPER_ADMIN` | Safe delete department |
| `GET` | `/api/asset-types` | Authenticated | List all asset types |
| `GET` | `/api/asset-types/{id}` | Authenticated | Retrieve asset type by ID |
| `POST` | `/api/asset-types` | `ADMIN`, `SUPER_ADMIN` | Create asset type |
| `PUT` | `/api/asset-types/{id}` | `ADMIN`, `SUPER_ADMIN` | Update asset type |
| `DELETE` | `/api/asset-types/{id}` | `ADMIN`, `SUPER_ADMIN` | Safe delete asset type |
| `GET` | `/api/locations` | Authenticated | List locations (supports `floor`, `search`) |
| `GET` | `/api/locations/{id}` | Authenticated | Retrieve location by ID |
| `POST` | `/api/locations` | `ADMIN`, `SUPER_ADMIN` | Create location |
| `PUT` | `/api/locations/{id}` | `ADMIN`, `SUPER_ADMIN` | Update location |
| `DELETE` | `/api/locations/{id}` | `ADMIN`, `SUPER_ADMIN` | Safe delete location |

---

## 6. Build and Run Commands

Execute commands from the repository root (`C:\Users\SrivasAm\Downloads\AMS\amsbackend`):

### 1. Compile the Project
```powershell
.\gradlew.bat compileScala
```

### 2. Run All Automated Tests
```powershell
.\gradlew.bat test
```

### 3. Run Clean Build & Assemble Artifacts
```powershell
.\gradlew.bat clean build
```

### 4. Start the Application Locally
```powershell
.\gradlew.bat :app:run
```

Once started, the backend binds to `http://127.0.0.1:8080`.

---

## 7. Example API Requests

### 1. Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "employeeIdOrEmail": "TEST_ADMIN",
    "password": "TestPassword123!"
  }'
```
**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### 2. Search & Filter Assets
```bash
curl -X GET "http://localhost:8080/api/assets?search=Dell&page=1&pageSize=10&sortBy=asset_code&sortDir=ASC" \
  -H "Authorization: Bearer <TOKEN>"
```

### 3. Export Filtered Assets to Excel
```bash
curl -X GET "http://localhost:8080/api/assets/export?costCenter=CC-101" \
  -H "Authorization: Bearer <TOKEN>" \
  --output assets_export.xlsx
```

### 4. Create an Asset
```bash
curl -X POST http://localhost:8080/api/assets \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "assetCode": "AST-2026-001",
    "assetTypeId": 1,
    "name": "Dell Precision Workstation",
    "quantity": 5,
    "actualFound": 5,
    "costCenter": "CC-ENG-101",
    "taggingStatus": "T",
    "makeModel": "Precision 5570",
    "remarks": "Assigned to Engineering"
  }'
```

### 5. Create an Asset Item
```bash
curl -X POST http://localhost:8080/api/asset-items \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": 1,
    "assetTag": "TAG-DEL-001",
    "serialNumber": "SN-987654321",
    "status": "IN_USE",
    "verificationStatus": "VERIFIED",
    "taggingStatus": "T"
  }'
```

### 6. Create User (Admin/Super Admin)
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP1099",
    "name": "Jane Doe",
    "email": "jane.doe@landisgyr.com",
    "password": "SecurePassword123!",
    "roleId": 3,
    "status": "ACTIVE"
  }'
```

---

## 8. Automated Test Results

The backend contains a complete suite of 60 tests across 8 test suites:

- **`AuthRoutesSpec`** (11 tests): Login scenarios, invalid credentials, case-insensitivity, inactive rejection, Bearer token validations.
- **`UserRoutesSpec`** (10 tests): User CRUD, role boundaries, Admin vs Super Admin safeguards, duplicate detection.
- **`AssetRoutesSpec`** (9 tests): Asset CRUD, filters, sorting, page size bounds, foreign keys, duplicate code checks.
- **`AssetItemRoutesSpec`** (6 tests): Item CRUD, parent quantity checks, unique tag checks, verification PATCH.
- **`ReferenceDataRoutesSpec`** (10 tests): Departments, asset types, and locations CRUD, permissions, unique constraints.
- **`ExcelExportServiceSpec`** (4 tests): Excel generation, row population, formula injection sanitization.
- **`PasswordServiceSpec`** (5 tests): BCrypt hashing, verification, password complexity, null/blank defenses.
- **`JwtServiceSpec`** (3 tests): Round-trip token generation and validation, tampering defense, malformed token handling.
- **`DbSmokeTest`** (2 tests): Database connectivity, role and user seed validation.

All 60 tests execute cleanly in under 15 seconds:
```
BUILD SUCCESSFUL in 24s
60 tests completed, 0 failed
```
