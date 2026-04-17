import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'confirmarSenha', async: false })
export class ConfirmarSenhaConstraint implements ValidatorConstraintInterface {
  validate(confirmarSenha: string, args: ValidationArguments) {
    const obj = args.object as { novaSenha?: string };
    return confirmarSenha === obj.novaSenha;
  }

  defaultMessage() {
    return 'As senhas não coincidem.';
  }
}
