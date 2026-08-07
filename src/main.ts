import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    console.error('[Bootstrap Error] Application failed to start', {
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err
    });
  });
