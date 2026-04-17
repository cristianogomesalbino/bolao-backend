export interface EmailService {
  enviarRecuperacaoSenha(email: string, token: string): Promise<void>;
}
