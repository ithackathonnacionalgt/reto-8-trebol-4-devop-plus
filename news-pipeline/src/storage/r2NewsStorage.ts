import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandInput,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import type { R2Config } from "../config/env.js";
import type { NewsFile } from "../domain/newsFile.js";
import { StorageError } from "../errors/StorageError.js";
import { validateNewsFile } from "../validation/validateNewsFile.js";
import type { NewsStorage } from "./newsStorage.js";

interface R2CommandClient {
  send(command: GetObjectCommand | PutObjectCommand): Promise<unknown>;
}

interface R2ObjectBody {
  transformToString(): Promise<string>;
}

interface R2GetOutput {
  Body?: R2ObjectBody;
}

export class R2NewsStorage implements NewsStorage {
  private readonly config: R2Config;
  private readonly client: R2CommandClient;

  public constructor(config: R2Config, client?: R2CommandClient) {
    this.config = config;
    this.client =
      client ??
      new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
  }

  public async load(): Promise<NewsFile | null> {
    const input: GetObjectCommandInput = {
      Bucket: this.config.bucketName,
      Key: this.config.objectKey,
    };

    let output: R2GetOutput;
    try {
      output = (await this.client.send(new GetObjectCommand(input))) as R2GetOutput;
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw new StorageError("No fue posible descargar el histórico desde Cloudflare R2", {
        cause: error,
      });
    }

    if (output.Body === undefined) {
      throw new StorageError("Cloudflare R2 devolvió un objeto histórico vacío");
    }

    let serialized: string;
    try {
      serialized = await output.Body.transformToString();
    } catch (error) {
      throw new StorageError("No fue posible leer el objeto histórico de Cloudflare R2", {
        cause: error,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch (error) {
      throw new StorageError("El objeto histórico de Cloudflare R2 no contiene JSON válido", {
        cause: error,
      });
    }

    try {
      return validateNewsFile(parsed);
    } catch (error) {
      throw new StorageError("El histórico de Cloudflare R2 no cumple el esquema esperado", {
        cause: error,
      });
    }
  }

  public async save(newsFile: NewsFile): Promise<void> {
    let validated: NewsFile;
    try {
      validated = validateNewsFile(newsFile);
    } catch (error) {
      throw new StorageError("No se publicará un archivo inválido en Cloudflare R2", {
        cause: error,
      });
    }

    const input: PutObjectCommandInput = {
      Bucket: this.config.bucketName,
      Key: this.config.objectKey,
      Body: `${JSON.stringify(validated, null, 2)}\n`,
      ContentType: "application/json; charset=utf-8",
    };

    try {
      await this.client.send(new PutObjectCommand(input));
    } catch (error) {
      throw new StorageError("No fue posible publicar noticias.json en Cloudflare R2", {
        cause: error,
      });
    }
  }
}

function isNotFound(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate.name === "NoSuchKey" ||
    candidate.name === "NotFound" ||
    candidate.$metadata?.httpStatusCode === 404
  );
}
