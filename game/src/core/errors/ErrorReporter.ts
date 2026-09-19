import type { EventBus } from "../events/EventBus";
import { GameError } from "./GameError";

export class ErrorReporter {
  constructor(private readonly bus: EventBus) {}

  report(error: unknown, context?: string): void {
    const message = this.format(error, context);
    console.error(message, error);
    this.bus.emit("game:error", {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
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
