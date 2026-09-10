import { AppError } from "./AppError.js";

export class ValidationError extends AppError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, "VALIDATION_ERROR", options);
  }
}
