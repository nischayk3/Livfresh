import { PixelEvent } from './pixel.types';

/**
 * Base file for TypeScript module resolution.
 * Metro bundler resolves to pixel.native.ts or pixel.web.ts at runtime.
 */
export const trackPixelEvent = async (_event: PixelEvent, _data?: Record<string, any>): Promise<void> => { };
export const trackCustomPixelEvent = async (_eventName: string, _data?: Record<string, any>): Promise<void> => { };
