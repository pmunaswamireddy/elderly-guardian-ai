
import React from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useVitals } from './hooks/useVitals';
import { useSpeech } from './hooks/useSpeech';
import { useAIEngine } from './ai/useAIEngine';

const App: React.FC = () => {
  const { user, isLoggedIn, loading, login, logout } = useAuth();
  const { vitals } = useVitals(user?.id);
  useTheme(user?.theme ?? 'light', user?.font_size_scale ?? 1);

  const ai = useAIEngine(user);

  const speech = useSpeech(
    (text) => ai.handle(text),
    user?.ai_language ?? 'en'
  );

  if (loading) return <div>Loading...</div>;
  if (!isLoggedIn) return <button onClick={() => login('demo','demo')}>Login</button>;

  return (
    <div>
      <h1>Welcome {user?.name}</h1>
      <button onClick={logout}>Logout</button>
      <button onClick={speech.startListening}>🎤 Speak</button>
      <pre>{JSON.stringify(vitals, null, 2)}</pre>
    </div>
  );
};

export default App;
