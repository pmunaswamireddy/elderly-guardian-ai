
import { useState } from 'react';

export interface User {
  id: number;
  name: string;
  ai_language?: string;
  theme?: 'light' | 'dark';
  font_size_scale?: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>({ id:1, name:'Demo User', ai_language:'en' });
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loading] = useState(false);

  return {
    user,
    isLoggedIn,
    loading,
    login: async () => {},
    logout: () => setIsLoggedIn(false)
  };
}
