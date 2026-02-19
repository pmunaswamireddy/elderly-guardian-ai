
export function useSpeech(onText:(t:string)=>void) {
  return {
    startListening: () => onText('demo command'),
    isListening: false
  };
}
