import { GameError } from "./GameError";

export interface ErrorStats {
  consecutive: number;
  total: number;
  lastError: string;
}

export class ErrorReporter {
  private errorsInCurrentFrame = 0;
  private consecutiveErrorFrames = 0;
  private totalErrors = 0;
  private lastErrorMessage = "";

  report(error: unknown, context?: string): void {
    const message = this.format(error, context);
    console.error(message, error);
    this.errorsInCurrentFrame += 1;
    this.totalErrors += 1;
    this.lastErrorMessage = message;
  }

  beginFrame(): void {
    this.errorsInCurrentFrame = 0;
  }

  endFrame(): number {
    if (this.errorsInCurrentFrame > 0) {
      this.consecutiveErrorFrames += 1;
    } else {
      this.consecutiveErrorFrames = 0;
    }
    return this.consecutiveErrorFrames;
  }

  getConsecutiveErrorFrames(): number {
    return this.consecutiveErrorFrames;
  }

  resetConsecutive(): void {
    this.consecutiveErrorFrames = 0;
  }

  getStats(): ErrorStats {
    return {
      consecutive: this.consecutiveErrorFrames,
      total: this.totalErrors,
      lastError: this.lastErrorMessage,
    };
  }

  private format(error: unknown, context?: string): string {
    const prefix = context ? `[${context}] ` : "";
    if (error instanceof GameError) {
      return `${prefix}${error.code}: ${error.message}`;
    }
    if (error instanceof Error) {
      return `${prefix}${error.message}`;
    }
    return `${prefix}${String(error)}`;
  }
}
