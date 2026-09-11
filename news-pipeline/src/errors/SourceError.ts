import { AppError } from "./AppError.js";

export class SourceError extends AppError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, "SOURCE_ERROR", options);
  }
}
