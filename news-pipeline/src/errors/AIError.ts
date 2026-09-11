import { AppError } from "./AppError.js";

export class AIError extends AppError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, "AI_ERROR", options);
  }
}
