// export const imaginary = 0;
const text = "import fake from 'not-real'";
const local = 1;
export { local as renamed };
export const { key: publicKey, nested: { count }, ...rest } = { key: 1, nested: { count: 2 } };
export const [first, , third] = [1, 2, 3];
export function charge(input: string): string { return input; }
export class Account { internal() {} }
export interface Request { amount: number }
export type Amount = number;
export default function () { return text; }
import type { Input } from './types.ts';
import { value, type Shape } from './types.ts';
import './side-effect.mjs';
import { join } from 'node:path';
import external from 'uninstalled-package';
void import('./side-effect.mjs');
