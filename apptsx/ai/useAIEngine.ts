
import { User } from '../hooks/useAuth';

export type Intent =
  | { type:'CHECK_VITALS' }
  | { type:'SET_REMINDER'; payload:string }
  | { type:'UNKNOWN' };

export function parseIntent(text:string): Intent {
  if (text.includes('vitals')) return { type:'CHECK_VITALS' };
  if (text.includes('remind')) return { type:'SET_REMINDER', payload:text };
  return { type:'UNKNOWN' };
}

export function useAIEngine(user:User|null) {
  return {
    handle(text:string) {
      const intent = parseIntent(text);
      console.log('Intent:', intent, 'User:', user?.name);
    }
  };
}
