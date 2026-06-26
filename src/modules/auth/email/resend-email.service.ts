import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailService } from './email.service.interface';

@Injectable()
export class ResendEmailService implements EmailService, OnModuleInit {
  private readonly logger = new Logger(ResendEmailService.name);
  private resend: Resend;
  private remetente: string;

  onModuleInit() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY não configurada — emails não serão enviados',
      );
      return;
    }

    this.resend = new Resend(apiKey);
    this.remetente = process.env.RESEND_FROM ?? 'Bolão <onboarding@resend.dev>';
  }

  async enviarRecuperacaoSenha(email: string, token: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Email de recuperação não enviado para ${email} — RESEND_API_KEY ausente`,
      );
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/resetar-senha?token=${token}`;

    await this.resend.emails.send({
      from: this.remetente,
      to: email,
      subject: 'Recuperação de senha — Bolão',
      html: `
        <h2>Recuperação de senha</h2>
        <p>Você solicitou a recuperação de senha. Clique no link abaixo para criar uma nova senha:</p>
        <p><a href="${link}">Resetar minha senha</a></p>
        <p>Este link expira em 1 hora.</p>
        <p>Se você não solicitou, ignore este email.</p>
      `,
    });

    this.logger.log(`Email de recuperação enviado para ${email}`);
  }
}
