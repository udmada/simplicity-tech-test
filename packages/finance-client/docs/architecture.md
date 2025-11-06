# @udmada/finance-client Architecture

```mermaid
graph TD
  PackageEntry["src/index.ts
  (package public surface)"]

  subgraph Facade Layer
    FacadeAPI["facade/
    (planned facade services)"]
  end

  subgraph Application Layer
    ApplicationUseCases["application/index.ts
    (Effect-based use cases)"]
  end

  subgraph Domain Layer
    subgraph SharedKernel["domain/shared"]
      MoneyVO["money.ts
      Value object helpers"]
      BrandedIds["ids.ts
      Branded identifiers"]
      DomainEvents["events.ts
      Domain events"]
    end
    AccountAggregate["domain/banking/account.ts
    Account aggregate root"]
  end

  subgraph Infrastructure Layer
    subgraph PlaidIntegration["infrastructure/plaid"]
      PlaidClientService["client.ts
      PlaidClientService interface"]
      PlaidClientLive["client.ts
      Plaid Client"]
      PlaidLayer["layer.ts
      Plaid Client Layer"]
      PlaidMappers["mappers.ts
      Plaid -> domain mappers"]
      PlaidErrors["errors.ts
      Plaid error mapping"]
    end
  end

  PlaidSDK[(Plaid SDK)]

  PackageEntry --> FacadeAPI
  PackageEntry --> ApplicationUseCases


  FacadeAPI -. planned orchestration .-> ApplicationUseCases
  ApplicationUseCases -. use cases .-> AccountAggregate
  ApplicationUseCases -. Effect deps .-> PlaidClientService

  AccountAggregate --> MoneyVO
  AccountAggregate --> BrandedIds
  AccountAggregate --> DomainEvents

  PlaidClientService --> PlaidClientLive
  PlaidClientLive --> PlaidMappers
  PlaidClientLive --> PlaidErrors
  PlaidClientLive --> PlaidLayer
  PlaidLayer --> PlaidSDK

  PlaidMappers --> AccountAggregate
  PlaidMappers --> MoneyVO
  PlaidMappers --> BrandedIds
  PlaidMappers --> PlaidErrors
```

## Notes

- **Domain** holds value objects and aggregates used across the package.
- **Infrastructure** wraps the Plaid SDK with typed errors, mappers, and Effect-based services.
- **Effect/Application/Facade** folders are scaffolds for future use cases and orchestrations.
- `index.ts` re-exports domain and infrastructure so consumers have a single entry point.
