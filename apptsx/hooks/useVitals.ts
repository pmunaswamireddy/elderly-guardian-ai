
import { useState } from 'react';

export function useVitals() {
  const [vitals] = useState({
    bp: '120/80',
    sugar: '98',
    heart_rate: '72'
  });
  return { vitals };
}
