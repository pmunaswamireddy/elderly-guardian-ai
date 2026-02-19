/**
 * UIAutomation Utility
 * Provides methods for the AI to interact with the DOM, navigate tabs, and fill forms.
 */

export const UIAutomation = {
    /**
     * Navigates to a specific tab by triggering its click event
     */
    navigate: (tabId: string): boolean => {
        console.log(`[UI_AUTO] Navigating to: ${tabId}`);
        // Try direct ID, then prefixed IDs
        const tabElement = document.getElementById(tabId) ||
            document.getElementById(`nav-tab-${tabId}`) ||
            document.getElementById(`admin-subtab-${tabId}`);

        if (tabElement) {
            tabElement.click();
            return true;
        }

        // Fallback search for buttons with text matches
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const target = buttons.find(b =>
            b.textContent?.toLowerCase().includes(tabId.toLowerCase()) ||
            b.getAttribute('aria-label')?.toLowerCase().includes(tabId.toLowerCase())
        );

        if (target) {
            (target as HTMLElement).click();
            return true;
        }

        return false;
    },

    /**
     * Clicks an element based on text, aria-label, or ID
     */
    clickElement: (identifier: string): boolean => {
        console.log(`[UI_AUTO] Attempting to click: ${identifier}`);

        // Try by ID first
        const byId = document.getElementById(identifier);
        if (byId) {
            byId.click();
            return true;
        }

        // Search all clickable elements
        const elements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const target = elements.find(el =>
            el.textContent?.toLowerCase().includes(identifier.toLowerCase()) ||
            el.getAttribute('aria-label')?.toLowerCase().includes(identifier.toLowerCase()) ||
            el.getAttribute('title')?.toLowerCase().includes(identifier.toLowerCase())
        );

        if (target) {
            (target as HTMLElement).click();
            return true;
        }

        return false;
    },

    /**
     * Fills a form field by searching for labels or placeholders
     */
    fillField: (fieldName: string, value: string): boolean => {
        console.log(`[UI_AUTO] Filling field "${fieldName}" with: ${value}`);

        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));

        // 1. Try to find input associated with a label
        const labels = Array.from(document.querySelectorAll('label'));
        const targetLabel = labels.find(l => l.textContent?.toLowerCase().includes(fieldName.toLowerCase()));

        let targetInput: HTMLInputElement | null = null;

        if (targetLabel && targetLabel.getAttribute('for')) {
            targetInput = document.getElementById(targetLabel.getAttribute('for')!) as HTMLInputElement;
        } else if (targetLabel) {
            // Sometimes input is inside label or next to it
            targetInput = (targetLabel.querySelector('input') || targetLabel.nextElementSibling?.querySelector('input') || targetLabel.nextElementSibling) as HTMLInputElement;
        }

        // 2. Try by placeholder
        if (!targetInput) {
            targetInput = inputs.find(i =>
                (i as HTMLInputElement).placeholder?.toLowerCase().includes(fieldName.toLowerCase())
            ) as HTMLInputElement;
        }

        // 3. Try by name or aria-label
        if (!targetInput) {
            targetInput = inputs.find(i =>
                i.getAttribute('name')?.toLowerCase().includes(fieldName.toLowerCase()) ||
                i.getAttribute('aria-label')?.toLowerCase().includes(fieldName.toLowerCase())
            ) as HTMLInputElement;
        }

        if (targetInput && typeof (targetInput as any).value !== 'undefined') {
            // Trigger React state update by dispatching an event
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
            )?.set;

            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(targetInput, value);
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
        }

        return false;
    },

    /**
     * Dispatches a custom event for global app state changes (handled in App.tsx)
     */
    changeSetting: (key: string, value: any): boolean => {
        console.log(`[UI_AUTO] Change Setting: ${key} -> ${value}`);
        window.dispatchEvent(new CustomEvent('voice-command', {
            detail: { type: 'setting', key, value }
        }));
        return true;
    },

    toggleFeature: (feature: string, state: boolean): boolean => {
        console.log(`[UI_AUTO] Toggle Feature: ${feature} -> ${state}`);
        window.dispatchEvent(new CustomEvent('voice-command', {
            detail: { type: 'toggle', feature, state }
        }));
        return true;
    },

    performAction: (action: string, target?: string): boolean => {
        console.log(`[UI_AUTO] Action: ${action} on ${target}`);

        if (action === 'refresh') {
            window.location.reload();
            return true;
        }
        if (action === 'back') {
            window.history.back();
            return true;
        }
        if (action === 'scroll_down') {
            window.scrollBy({ top: 500, behavior: 'smooth' });
            return true;
        }
        if (action === 'scroll_up') {
            window.scrollBy({ top: -500, behavior: 'smooth' });
            return true;
        }

        // Generic fallback to event bus
        window.dispatchEvent(new CustomEvent('voice-command', {
            detail: { type: 'action', action, target }
        }));
        return true;
    },

    readContent: (target: string): string | null => {
        console.log(`[UI_AUTO] Reading content for: ${target}`);

        let text = '';
        if (target === 'screen' || target === 'page') {
            text = document.body.innerText;
        } else if (target === 'summary') {
            const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => (h as HTMLElement).innerText);
            text = headings.join('. ');
        } else if (target === 'last_message') {
            const msgs = document.querySelectorAll('.chat-message');
            if (msgs.length) text = (msgs[msgs.length - 1] as HTMLElement).innerText;
        }

        // Return truncated clean text
        return text.slice(0, 1000).replace(/\s+/g, ' ').trim();
    },

    /**
     * Scans the current view for actionable items to provide context to AI
     */
    getVisibleContext: () => {
        const buttons = Array.from(document.querySelectorAll('button, a'))
            .map(el => el.textContent?.trim())
            .filter(text => text && text.length > 0 && text.length < 30);

        const inputs = Array.from(document.querySelectorAll('input, textarea'))
            .map(el => (el as HTMLInputElement).placeholder || (el as HTMLInputElement).name)
            .filter(Boolean);

        return {
            visibleButtons: [...new Set(buttons)],
            visibleFields: [...new Set(inputs)],
            currentUrl: window.location.href,
            timestamp: new Date().toISOString()
        };
    }
};
