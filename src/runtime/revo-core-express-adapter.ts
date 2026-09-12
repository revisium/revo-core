import { ExpressAdapter } from '@nestjs/platform-express';

interface AdmissionResponse {
  status(code: number): AdmissionResponse;
  json(body: unknown): unknown;
}

export class RevoCoreExpressAdapter extends ExpressAdapter {
  private closing = false;
  private installAfterCoreRoutes: (() => void) | undefined;
  private serverClosePromise: Promise<void> | undefined;

  constructor() {
    super();
    this.use((_request: unknown, response: AdmissionResponse, next: () => void): unknown => {
      if (!this.closing) {
        return next();
      }

      return response.status(503).json({
        statusCode: 503,
        message: 'Revo Core is shutting down.',
      });
    });
  }

  setAfterCoreRoutesInstaller(install: () => void): void {
    this.installAfterCoreRoutes = install;
  }

  override setNotFoundHandler(handler: Function, prefix?: string): unknown {
    this.installAfterCoreRoutes?.();
    this.installAfterCoreRoutes = undefined;

    return super.setNotFoundHandler(handler, prefix);
  }

  beginShutdown(): void {
    this.closing = true;
  }

  beginServerClose(): Promise<void> {
    if (this.serverClosePromise === undefined) {
      this.serverClosePromise = Promise.resolve(super.close()).then(() => undefined);
    }

    return this.serverClosePromise;
  }

  override close(): Promise<void> {
    return this.beginServerClose();
  }
}
