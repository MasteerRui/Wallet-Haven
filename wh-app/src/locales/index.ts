import { en } from './en';
import { pt } from './pt';

export type Language = 'english' | 'portuguese';

export const translations = {
  english: en,
  portuguese: pt,
};

export { en, pt };
