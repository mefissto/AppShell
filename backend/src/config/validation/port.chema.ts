import Joi from 'joi';

// Port range constants
const minPortValue = 0;
const maxPortValue = 65535;

const portValidation = (value: string) => {
  const num = parseInt(value, 10);
  if (num < minPortValue || num > maxPortValue) {
    throw new Error(`Port must be between ${minPortValue} and ${maxPortValue}`);
  }
  return num;
};

export const portSchema = Joi.string()
  .pattern(/^\d+$/, 'Port must be a plain number without scientific notation')
  .custom(portValidation)
  .default(3000);
