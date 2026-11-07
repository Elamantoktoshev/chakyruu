import { z } from 'zod';
import { PHONE_PATTERN } from './phone.js';

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_PATTERN, 'Phone must be in the format +996XXXXXXXXX');
