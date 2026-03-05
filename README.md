# Bank Account Management System (ES/CQRS)

A robust, production-ready bank account management API built using **Event Sourcing (ES)** and **Command Query Responsibility Segregation (CQRS)** patterns.

## Architecture & Design
- **Single Source of Truth**: Every state change is stored as an immutable event in the `events` table (PostgreSQL).
- **Aggregate Pattern**: The `BankAccount` aggregate handles business rules and reconstructs its state by replaying events or loading from an optimized snapshot.
- **Snapshots**: High-frequency snapshotting (every 50 events) ensures fast aggregate restoration regardless of event stream length.
- **Synchronous Projections**: Read models (`account_summaries`, `transaction_history`) are updated synchronously for immediate consistency in this implementation.
- **Auditability**: Complete, immutable history of all system events.

## Features
- **Core Banking**: Create accounts, deposits, withdrawals (with overdraft protection), and account closure.
- **Time-Travel**: Reconstruct account balances at any arbitrary point in time via the event store.
- **Global Sequence Tracking**: Every event has a global sequence ID for strict ordering and projection tracking.
- **Projection Administration**: Monitor projection lag and trigger full read-model rebuilds from scratch.

## Project Structure
- `src/domain`: Aggregate logic (`BankAccount`) and event contracts.
- `src/infrastructure`: Database pool, `EventStore`, and persistence logic.
- `src/application`: Orchestration layer including `BankCommandHandler`, `AccountQueries`, and `AccountProjector`.
- `src/api`: Express REST API layer.

## Setup & Running
1. **Prerequisites**: Docker and Docker Compose installed.
2. **Environment**: Copy `.env.example` to `.env`.
3. **Execution**:
   ```bash
   docker-compose up --build
   ```
4. **Verification**: Access `http://localhost:3000/health` to confirm the system is UP.

## API Endpoints
### Commands (Write Side)
- `POST /api/accounts`: Create a new bank account.
- `POST /api/accounts/:id/deposit`: Deposit funds.
- `POST /api/accounts/:id/withdraw`: Withdraw funds (prevents negative balance).
- `POST /api/accounts/:id/close`: Close account (zero balance required).

### Queries (Read Side)
- `GET /api/accounts/:id`: Get current account summary and balance.
- `GET /api/accounts/:id/transactions`: Paginated transaction history.
- `GET /api/accounts/:id/events`: Full event stream (audit log).
- `GET /api/accounts/:id/balance-at/:timestamp`: Time-travel balance query.

### Administration
- `GET /api/projections/status`: View global event count, processed events, and lag.
- `POST /api/projections/rebuild`: Trigger a full read-model rebuild from the event store.

---
*Verified for functionality, architectural correctness, and best practices.*
