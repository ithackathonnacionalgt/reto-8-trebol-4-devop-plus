import { AppError } from "./AppError.js";

export class StorageError extends AppError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, "STORAGE_ERROR", options);
  }
}
