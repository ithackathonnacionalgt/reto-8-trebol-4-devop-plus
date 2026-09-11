import { AppError } from "./AppError.js";

export class ConfigurationError extends AppError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, "CONFIGURATION_ERROR", options);
  }
}
