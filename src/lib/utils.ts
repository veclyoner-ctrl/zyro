import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const CURRENCY = 'PKR';
export const FLAT_SHIPPING_COST = 200;
export const FREE_SHIPPING_THRESHOLD = 5000;
export const APP_NAME = 'Zyro Mall';
export const getAppUrl = () => (typeof window !== 'undefined' ? window.location.origin : '');

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export * from './commerce';
