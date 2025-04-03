# Schema Type Separation

This codebase separates type definitions from ORM-specific schema definitions:

## Files Overview

1. `shared/types.ts`: Pure TypeScript interfaces that can be safely used in both client and server code.
   - Contains type definitions but no Drizzle ORM imports or implementation details.
   - Safe to import in client-side code.

2. `server/db/schema.ts`: Server-side Drizzle ORM schema definitions.
   - Imports from `drizzle-orm/pg-core` and defines the actual database tables.
   - Contains validation schemas and other ORM-specific logic.
   - Should be imported only by server-side code.

## Usage Guidelines

### Client-Side Code

In client-side code, always import types from `@shared/types` instead of directly from schema:

```typescript
// GOOD
import { User, ApiKey } from '@shared/types';

// BAD - don't do this in client code
import { users, apiKeys } from '@shared/schema'; 
```

### Server-Side Code

In server-side code, import the types from `@shared/types` and the table definitions from `server/db/schema`:

```typescript
// Import types
import { User, ApiKey } from '@shared/types';

// Import table definitions and schemas
import { users, apiKeys, insertUserSchema } from './db/schema';
```

## Rationale

This separation:

1. Prevents client code from importing server-side ORM dependencies
2. Makes the client bundle smaller by excluding ORM code
3. Maintains type safety and consistency across the codebase
4. Follows the principle of separating interface from implementation

## Implementation Notes

There may still be some type differences between the Drizzle inferred types and our manually defined types. These issues need to be addressed in specific places where the types are used. 