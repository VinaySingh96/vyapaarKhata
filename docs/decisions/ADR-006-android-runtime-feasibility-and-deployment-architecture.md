# ADR-006: Android Embedded Runtime Feasibility Spike & Windows Laptop Deployment Architecture

## Status
Approved / Frozen

## Context
vyapaarKhata is designed as an offline-first commercial platform for Indian SMBs that must operate in two distinct physical deployment topologies without code bifurcation:
1. **Windows Laptop Target (High Volume / Multi-Terminal):** Heavy-duty desktop/counter deployments running Windows 10/11 64-bit with multi-user LAN access, barcode scanners, and thermal receipt printers.
2. **Android Tablet Target (Stand-Alone Counter / Mobile POS):** Lightweight retail deployments where the Android tablet itself serves as the primary local server and database for counter billing and local mobile billing over Wi-Fi.

This decision record publishes the results of the Phase 0 technical feasibility spike for running the Node.js backend engine on Android tablets and defines the production packaging architecture for Windows 10/11 laptops.

---

## Part 1: Android Embedded Runtime Feasibility Spike

### 1. Architectural Mandate
- **Single Business Engine:** The application must run the exact same TypeScript/Node domain modules and Fastify HTTP routes on Android as it does on desktop/laptop.
- **Zero Code Duplication:** No re-implementation of business rules or accounting logic in Java/Kotlin.
- **Persistence Target:** SQLite engine with identical 97 tables, foreign key constraints, and seed data validated in DB-06.

### 2. Runtime Evaluation & Comparison Matrix

| Runtime Approach | Architecture | Native SQLite Compatibility | Background Stability | Packaging Complexity | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Node.js for Mobile Apps (`nodejs-mobile`)** | Shared library (`libnode.so`) embedded directly into APK JNI layer | Full C++ N-API and SQLite C library support | Excellent with Android Foreground Service | Low (standard Gradle AAR dependency) | **RECOMMENDED & ADOPTED** |
| **Termux / PRoot Userland** | Emulated Linux userland on Android | Standard Linux Node binary | Poor (frequently killed by OS, high permission friction) | Unacceptable for commercial end-users | **REJECTED** |
| **Hermes / QuickJS Engine** | JS bytecode engine embedded in Android app | Limited to JS APIs; no Node.js `fs`, `stream`, `http`, `crypto` | Native Android process | Requires rewriting Fastify and HTTP server stack | **REJECTED** |

### 3. Android Runtime Architecture & OS Lifecycle Guarantees

#### A. Foreground Service Execution Model
Android OS aggressive battery optimization (Doze mode, App Standby buckets) will terminate background TCP listeners within minutes unless explicitly configured as a Foreground Service:
- **Foreground Service Type:** `android:foregroundServiceType="connectedDevice|dataSync"`
- **Persistent Notification:** Non-dismissible status bar notification displaying server status: *"vyapaarKhata Store Server is Active — Serving Local Counter & LAN Clients"*.
- **Battery Optimization Whitelist:** Application triggers `android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` during initialization so Doze maintenance windows do not pause the local HTTP server.
- **Wake Locks:** Acquisition of `PowerManager.PARTIAL_WAKE_LOCK` and `WifiManager.WifiLock` (`WIFI_MODE_FULL_HIGH_PERF`) to guarantee uninterrupted socket handling and TCP keep-alives during peak retail hours.

#### B. Storage & SQLite Persistence
- Database stored in app-private directory: `/data/user/0/com.vyapaarkhata.app/databases/vyapaarkhata.sqlite`.
- SQLite configured with `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL;`.
- Automatic snapshotting to Android Scoped Storage (`Download/vyapaarkhata_backups/`) for user-managed offline pendrive/SD-card backups.

#### C. Local & LAN Networking
- Fastify server binds to `0.0.0.0:8080`.
- Loopback interface (`127.0.0.1:8080`) serves the embedded Android `WebView` running the pre-compiled React 19 SPA (`apps/web/dist`).
- Wi-Fi interface (`192.168.x.x:8080`) serves mobile billing clients and secondary terminals on the same local retail network.
- Zero cloud dependency required for local checkout, receipt generation, and cash collection.

---

## Part 2: Windows Laptop Deployment Architecture

### 1. Requirements & Operational Constraints
- **Target OS:** Windows 10 (Version 21H2+ 64-bit) and Windows 11.
- **Licensing Constraint:** Must NOT require Docker Desktop (due to commercial subscription fees for SMBs).
- **Zero User Command-Line Knowledge:** Retail store operators must not be required to know PowerShell, bash, or container commands.
- **Single-Click Installer:** Standard MSI or Inno Setup executable that installs prerequisites, configures network firewall, and registers background services.

### 2. Technology Stack & Component Responsibilities

```
+--------------------------------------------------------------------------+
|                       Windows 10/11 Host Machine                         |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  |     vyapaarkhata-supervisor.exe (Windows Service - Written in Go)  |  |
|  |     - Manages WSL2 lifecycle, nerdctl containers, and health probes|  |
|  |     - Automates Windows Firewall rule creation (port 80/443/3000)  |  |
|  |     - Coordinates scheduled pg_dump backups to local/USB path      |  |
|  +--------------------------------------------------------------------+  |
|                                     | (Manages)                          |
|                                     v                                    |
|  +--------------------------------------------------------------------+  |
|  |                     WSL2 Lightweight Distribution                  |  |
|  |  +---------------------+   +------------------------------------+  |  |
|  |  | containerd / nerdctl|   | Nginx Reverse Proxy (Container)    |  |  |
|  |  | container runtime   |-->| - Serves React 19 static build     |  |  |
|  |  +---------------------+   | - Proxies /api/* to Fastify app    |  |  |
|  |             |              +------------------------------------+  |  |
|  |             v                                |                     |  |
|  |  +------------------------------------+      v                     |  |
|  |  | vyapaarkhata-server (Node.js App)  |   Local Desktop Browser    |  |
|  |  | - Fastify 5 API engine             |   and LAN Mobile Devices   |  |
|  |  | - Unit of Work & sync worker       |                            |  |
|  |  +------------------------------------+                            |  |
|  |             |                                                      |  |
|  |             v                                                      |  |
|  |  +------------------------------------+                            |  |
|  |  | PostgreSQL 16 (Container)          |                            |  |
|  |  | - Named Volume: pgdata             |                            |  |
|  |  | - Port 5432 (isolated in WSL net)  |                            |  |
|  |  +------------------------------------+                            |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```

### 3. Key Windows Subsystems

#### A. Container Engine: `nerdctl` + `containerd` in WSL2
- A pre-configured minimal Alpine-based WSL2 distribution bundle (`vyapaarkhata-runtime.tar.gz`) is imported into WSL2 via `wsl.exe --import vyapaarkhata-runtime C:\vyapaarkhata\wsl C:\vyapaarkhata\bundle.tar.gz`.
- `containerd` runs natively inside the distribution; containers are orchestrated using standard Compose syntax via `nerdctl compose up -d`.

#### B. Nginx Reverse Proxy & Static Caching
- Listens on `0.0.0.0:80` (HTTP) and optionally `0.0.0.0:443` (self-signed LAN SSL).
- Static assets (`apps/web/dist`) are mounted read-only and served with gzip/brotli compression and 1-year immutable cache headers for hashed bundles.
- API traffic `/api/*` is load-balanced / reverse-proxied to `vyapaarkhata-server:3000`.

#### C. Windows Supervisor Service (`vyapaarkhata-supervisor`)
- Written in Go using `golang.org/x/sys/windows/svc`.
- Compiles to a single zero-dependency native 64-bit Windows binary (`vyapaarkhata-supervisor.exe`).
- **Startup Sequence:**
  1. Verifies WSL2 feature is installed; launches distribution.
  2. Executes `nerdctl compose -f /opt/vyapaarkhata/docker-compose.nerdctl.yaml up -d`.
  3. Probes `http://localhost:3000/ready` until backend reports healthy.
  4. Configures Windows Advanced Firewall rule:
     `netsh advfirewall firewall add rule name="vyapaarKhata LAN" dir=in action=allow protocol=TCP localport=80,443`
- **Shutdown & Failure Handling:**
  - On OS shutdown signal, issues graceful shutdown (`SIGTERM`) to Fastify and executes clean `nerdctl compose stop`.
  - Automatically restarts failed containers with exponential backoff up to 5 attempts before notifying user via Windows Toast notification.

---

## Consequences
- **Positive:**
  - Guaranteed cross-platform architectural parity: identical domain models, types, and REST APIs on both Windows laptops and Android tablets.
  - Zero cloud licensing lock-in and zero Docker Desktop subscription fees for SMB owners.
  - High resilience against power failures and offline network drops.
- **Negative / Trade-offs:**
  - Android APK size increases by ~35MB to bundle native Node.js binaries and SQLite shared libraries.
  - Windows installer requires initial WSL2 configuration on unprovisioned Windows 10 machines.
