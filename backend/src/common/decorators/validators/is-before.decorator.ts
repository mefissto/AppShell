import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isBefore', async: false })
class IsBeforeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as Record<string, unknown>)[
      relatedPropertyName
    ];

    if (value == null || relatedValue == null) return true; // let other decorators handle required fields

    const current = new Date(value as string).getTime();
    const related = new Date(relatedValue as string).getTime();

    if (Number.isNaN(current) || Number.isNaN(related)) return false;
    return current < related; // use <= if you want to allow same date/time
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must be earlier than ${relatedPropertyName}`;
  }
}

export function IsBefore(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isBefore',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: IsBeforeConstraint,
    });
  };
}
