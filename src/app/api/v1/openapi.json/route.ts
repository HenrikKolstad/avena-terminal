/**
 * Alias of /api/openapi.json under the versioned /api/v1/* prefix.
 * Re-exports the same handler so docs links and SDK generators that assume
 * the v1 prefix (consistent with the rest of the public API surface) resolve.
 */
export { GET } from '../../openapi.json/route';
export const dynamic = 'force-dynamic';
