# ADR-005: Client Architecture and Mobile Strategy

## Status
Accepted

## Context
The user indicated plans to install and set up a React Native project later. The core platform architecture must support desktop browsers, local desktop wrappers, and mobile/tablet clients without code duplication in domain business logic or divergence in API contracts.

## Decision
1. **API-First & OpenAPI Contracts:** All client-facing business logic will be accessed via strongly-typed RESTful endpoints defined in `openapi.yaml`.
2. **Generated Client SDK:** TypeScript client types and API callers will be generated directly from the OpenAPI contract, enabling consumption by both the React Web frontend (`apps/web`) and any future React Native mobile application.
3. **Decoupled Architecture:** The backend server (`apps/server`) and core domain logic (`packages/domain`) remain completely agnostic of whether the consumer is a web browser or a mobile client.

## Consequences
- Clean separation between presentation layer and business/persistence layer.
- Enables seamless integration of future React Native or native mobile clients with zero backend refactoring.
