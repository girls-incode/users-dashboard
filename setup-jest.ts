import * as jestExtended from 'jest-extended';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();
expect.extend(jestExtended as any);

// Provide Jasmine-like globals used by some specs
(globalThis as any).fail = (msg?: string) => { throw new Error(msg || 'fail'); };
