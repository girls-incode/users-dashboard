import * as jestExtended from 'jest-extended';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();
expect.extend(jestExtended as any);

// jsdom doesn't implement window.scrollTo; TanStack Virtual's window-scroll strategy
// (UserListComponent) calls it internally on init/scroll reconciliation. A no-op stub avoids
// "Not implemented: window.scrollTo" console noise on every spec run without changing behavior —
// tests already pass without it, this only cleans up the output.
window.scrollTo = () => {};
