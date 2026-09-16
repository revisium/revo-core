# Feature modules

Feature modules keep a service understandable by giving each capability one public application
boundary and keeping framework and storage details behind it. The boundary is architectural, not
ceremonial: it prevents transport, persistence, and use-case mechanics from becoming a second
public API.

## Target shape

```text
feature/
├── feature.module.ts
├── feature-api.service.ts
├── contracts/
│   ├── feature.types.ts
│   └── feature.enums.ts
├── commands/
│   ├── handlers/
│   └── impl/
├── queries/
│   ├── handlers/
│   └── impl/
├── domain/
└── integration-or-storage-boundary/
```

Only directories that carry a current responsibility should exist. The feature root contains the
module, API facade, and an optional explicitly public entrypoint. Names such as `engine`, `prisma`,
or `filesystem` are preferable when they truthfully identify an adapter; generic `utils`, `helpers`,
`common`, `shared`, `constants`, and `types` directories hide ownership and should not become
catch-all locations.

## Dependency direction

Transport adapters and other features depend on an imported feature module, its exported API
service, and explicitly public contracts. The API facade dispatches only its own commands and
queries. Handlers own use cases and may depend on domain policy and honest integration or storage
adapters. Domain code depends only on domain code and framework-independent public contracts.

Public application error contracts are an explicit Nest integration exception: feature-owned
constructors may extend `PublicHttpException` and define HTTP status and public payload fields.
Their messages live in `contracts/errors.en.ts`. They must not import API adapters, and domain
code must not import these Nest-dependent error contracts. The shared GraphQL filter serializes
the already prepared response without feature knowledge.

Dependencies between features must remain acyclic. A handler may synchronously call another
feature's exported API when it needs that result and accepts its consistency and error semantics.
Events are the default for fan-out and eventual work. Work that requires one transaction or one
snapshot stays behind a single explicit owning boundary.

Project responses contain only Project data. Clients obtain Workspace previews and counts from
Workspace pagination, for example with `first: 3`. Project does not depend on Workspace;
the existing Workspace-to-Project dependency remains one-way.

Storage representations are private to their owning adapter. Public APIs expose typed application
contracts instead. Runtime validation belongs at untrusted transport, persistence, library, file,
and JSON boundaries and runs before mutation; typed internal calls do not repeat validation owned
elsewhere.

## Examples

Good:

```ts
constructor(private readonly accounts: AccountsApiService) {}

const account = await this.accounts.getAccount(accountId);
```

The consumer imports `AccountsModule`, calls its exported application API, and receives a public
contract.

Bad:

```ts
constructor(private readonly queryBus: QueryBus) {}

const account = await this.queryBus.execute(new GetAccountQuery(accountId));
```

The consumer now knows another feature's message and handler topology. Importing another feature's
repository, ORM client, transport DTO, or persistence mapper has the same problem.

Good API facades are bus-only. Good handlers own one use case and may call another exported feature
API. Handlers do not call handlers, dispatch another feature's messages, recursively call their own
API, or hide transaction and snapshot ownership across several modules.
