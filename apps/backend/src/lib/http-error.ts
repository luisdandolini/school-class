/** Erro com status HTTP. O tratador global devolve { error: message } com esse status. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
