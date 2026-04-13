export abstract class DomainError extends Error {
  abstract readonly statusCode: number;

  constructor(public readonly mensagem: string) {
    super(mensagem);
    this.name = this.constructor.name;
  }
}
