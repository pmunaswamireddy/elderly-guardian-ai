
import { API_BASE_URL } from '../config';
import type { User } from '../types';
import { UIAutomation } from '../utils/uiAutomation';

export function useAIEngine(user: User | null) {
  return {
    async handleChat(text: string, options: any = {}) {
      if (!user) return null;
      try {
        const res = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            user_id: user.id,
            language: options.language || user.ai_language || 'en',
            gender: user.ai_voice_gender || 'Female'
          })
        });
        const data = await res.json();

        // Handle UI intents
        if (data.intent && data.intent !== 'chat') {
          console.log(`[AI_ENGINE] Executing intent: ${data.intent}`, data.parameters);
        }

        if (data.intent === 'navigate' || data.intent === 'ui_navigate') {
          const target = data.parameters?.target || data.parameters?.destination;
          if (target) UIAutomation.navigate(target);
        } else if (data.intent === 'ui_click') {
          UIAutomation.clickElement(data.parameters?.identifier || data.parameters?.target);
        } else if (data.intent === 'ui_fill_form') {
          UIAutomation.fillField(data.parameters?.field_name, data.parameters?.value);
        } else if (data.intent === 'change_setting') {
          UIAutomation.changeSetting(data.parameters?.key, data.parameters?.value);
        } else if (data.intent === 'toggle_feature') {
          UIAutomation.toggleFeature(data.parameters?.feature, data.parameters?.state);
        } else if (data.intent === 'ui_action') {
          UIAutomation.performAction(data.parameters?.action, data.parameters?.target);
        } else if (data.intent === 'read_content') {
          const text = UIAutomation.readContent(data.parameters?.target);
          if (text) return { ...data, response_text: `Reading content: ${text}` };
        }

        return data;
      } catch (err) {
        console.error("AI Chat Error:", err);
        return { response_text: "Sorry, I encountered an error." };
      }
    }
  };
}
