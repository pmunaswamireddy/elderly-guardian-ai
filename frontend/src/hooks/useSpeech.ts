import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';

declare global {
    interface Window {
        currentRecognition: any;
        micLock: boolean;
        speechRestartTimer: any;
        onAudioEnded: any;
        forceAIResponse: any;
    }
}

const translations: Record<string, Record<string, string>> = {
    en: {
        'welcome_guardian': 'Welcome Back, Guardian.',
        'welcome_sub': 'Your health isn\'t just a number. It\'s our priority.',
        'hello': 'Hello',
        'feeling_today': 'How are you feeling today?',
        'nav_health': 'Health',
        'nav_meds': 'Meds',
        'nav_chat': 'Community',
        'nav_stats': 'Stats',
        'nav_docs': 'Visits',
        'nav_face': 'Scan',
        'nav_predict': 'Predict',
        'nav_admin': 'Admin',
        'sos': 'Emergency SOS',
        'call': 'Call',
        'add_med': 'Add New Medicine',
        'thinking': 'Thinking...',
        'listening': 'Listening...',
        'speaking': 'Speaking...',
        'ready': 'Guardian Ready',
        'manual_mode': 'Manual Mode',
        'ready_to_help': 'Ready to help!',
        'listening_desc': "I'm listening, go ahead...",
        'processing_desc': 'Just a moment...',
        'stop_assistant': 'Stopping assistant',
        'vitals_logged': 'Vitals Logged Successfully'
    },
    hi: {
        'welcome_guardian': 'वापसी पर स्वागत है, रक्षक।',
        'welcome_sub': 'आपका स्वास्थ्य सिर्फ एक नंबर नहीं है। यह हमारी प्राथमिकता है।',
        'hello': 'नमस्ते',
        'feeling_today': 'आज आप कैसा महसूस कर रहे हैं?',
        'nav_health': 'स्वास्थ्य',
        'nav_meds': 'दवाएं',
        'nav_chat': 'समुदाय',
        'nav_stats': 'आंकड़े',
        'nav_docs': 'विजिट',
        'nav_face': 'स्कैन',
        'nav_predict': 'अनुमान',
        'nav_admin': 'एडमिन',
        'sos': 'आपातकालीन सहायता',
        'call': 'कॉल करें',
        'add_med': 'नई दवा जोड़ें',
        'thinking': 'सोच रहा हूँ...',
        'listening': 'सुन रहा हूँ...',
        'speaking': 'बोल रहा हूँ...',
        'ready': 'रक्षक तैयार है',
        'manual_mode': 'मैनुअल मोड',
        'ready_to_help': 'मदद के लिए तैयार!',
        'listening_desc': 'मैं सुन रहा हूँ, बोलिये...',
        'processing_desc': 'एक पल रुकिए...',
        'stop_assistant': 'सहायक को रोक रहा हूँ',
        'vitals_logged': 'वाइबल्स सफलतापूर्वक लॉग किए गए'
    },
    te: {
        'welcome_guardian': 'తిరిగి స్వాగతం, గార్డియన్.',
        'welcome_sub': 'మీ ఆరోగ్యం కేవలం ఒక సంఖ్య కాదు. అది మా ప్రాధాన్యత.',
        'hello': 'నమస్కారం',
        'feeling_today': 'ఈ రోజు మీరు ఎలా ఉన్నారు?',
        'nav_health': 'ఆరోగ్యం',
        'nav_meds': 'మందులు',
        'nav_chat': 'కమ్యూనిటీ',
        'nav_stats': 'గణాంకాలు',
        'nav_docs': 'సందర్శనలు',
        'nav_face': 'స్కాన్',
        'nav_predict': 'అంచనా',
        'nav_admin': 'అడ్మిన్',
        'sos': 'అత్యవసర SOS',
        'call': 'కాల్ చేయండి',
        'add_med': 'కొత్త మందును జోడించండి',
        'thinking': 'ఆలోచిస్తున్నాను...',
        'listening': 'వింటున్నాను...',
        'speaking': 'మాట్లాడుతున్నాను...',
        'ready': 'గార్డియన్ సిద్ధంగా ఉన్నారు',
        'manual_mode': 'మాన్యువల్ మోడ్',
        'ready_to_help': 'సహాయం చేయడానికి సిద్ధం!',
        'listening_desc': 'నేను వింటున్నాను, చెప్పండి...',
        'processing_desc': 'ఒక క్షణం...',
        'stop_assistant': 'అసిస్టెంట్‌ను ఆపుతున్నాను',
        'vitals_logged': 'వైటల్స్ విజయవంతంగా నమోదయ్యాయి'
    },
    ta: {
        'welcome_guardian': 'மீண்டும் வருக, பாதுகாவலரே.',
        'welcome_sub': 'உங்கள் ஆரோக்கியம் வெறும் எண் அல்ல. அது எங்கள் முன்னுரிமை.',
        'hello': 'வணக்கம்',
        'feeling_today': 'இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?',
        'nav_health': 'ஆரோக்கியம்',
        'nav_meds': 'மருந்துகள்',
        'nav_chat': 'சமூகம்',
        'nav_stats': 'புள்ளிவிவரம்',
        'nav_docs': 'வருகைகள்',
        'nav_face': 'ஸ்கேன்',
        'nav_predict': 'கணிப்பு',
        'nav_admin': 'நிர்வாகம்',
        'sos': 'அவசர SOS',
        'call': 'அழைக்கவும்',
        'add_med': 'புதிய மருந்தைச் சேர்க்கவும்',
        'thinking': 'சிந்திக்கிறேன்...',
        'listening': 'கவனிக்கிறேன்...',
        'speaking': 'பேசுகிறேன்...',
        'ready': 'பாதுகாவலர் தயார்',
        'manual_mode': 'கையேடு முறை',
        'ready_to_help': 'உதவ தயார்!',
        'listening_desc': 'நான் கவனிக்கிறேன், சொல்லுங்கள்...',
        'processing_desc': 'ஒரு நிமிடம்...',
        'stop_assistant': 'உதவியாளரை நிறுத்துகிறேன்',
        'vitals_logged': 'உடல்நிலை பதிவு செய்யப்பட்டது'
    },
    bn: {
        'welcome_guardian': 'স্বাগতম, গার্ডিয়ান।',
        'welcome_sub': 'আপনার স্বাস্থ্য শুধু একটি সংখ্যা নয়। এটি আমাদের অগ্রাধিকার।',
        'hello': 'নমস্কার',
        'feeling_today': 'আজ আপনি কেমন বোধ করছেন?',
        'nav_health': 'স্বাস্থ্য',
        'nav_meds': 'ওষুধ',
        'nav_chat': 'কমিউনিটি',
        'nav_stats': 'পরিসংখ্যান',
        'nav_docs': 'ভিসিট',
        'nav_face': 'স্ক্যান',
        'nav_predict': 'পূর্বাভাস',
        'nav_admin': 'অ্যাডমিন',
        'sos': 'জরুরী SOS',
        'call': 'কল করুন',
        'add_med': 'নতুন ওষুধ যোগ করুন',
        'thinking': 'চিন্তা করছি...',
        'listening': 'শুনছি...',
        'speaking': 'বলছি...',
        'ready': 'গার্ডিয়ান প্রস্তুত',
        'manual_mode': 'ম্যানুয়াল মোড',
        'ready_to_help': 'সাহায্যের জন্য প্রস্তুত!',
        'listening_desc': 'আমি শুনছি, বলুন...',
        'processing_desc': 'একটু অপেক্ষা করুন...',
        'stop_assistant': 'অ্যাসিস্ট্যান্ট বন্ধ করছি',
        'vitals_logged': 'ভাইটাল সফলভাবে লগ করা হয়েছে'
    },
    mr: {
        'welcome_guardian': 'पुन्हा स्वागत आहे, गार्डियन.',
        'welcome_sub': 'तुमचे आरोग्य केवळ एक संख्या नाही। ती आमची प्राथमिकता आहे।',
        'hello': 'नमस्कार',
        'feeling_today': 'आज तुम्हाला कसे वाटत आहे?',
        'nav_health': 'आरोग्य',
        'nav_meds': 'औषधे',
        'nav_chat': 'समुदाय',
        'nav_stats': 'सांख्यिकी',
        'nav_docs': 'भेटी',
        'nav_face': 'स्कॅन',
        'nav_predict': 'अंदाज',
        'nav_admin': 'admin',
        'sos': 'आणीबाणी SOS',
        'call': 'कॉल करा',
        'add_med': 'नवीन औषध जोडा',
        'thinking': 'विचार करत आहे...',
        'listening': 'ऐकत आहे...',
        'speaking': 'बोलत आहे...',
        'ready': 'गार्डियन तयार आहे',
        'manual_mode': 'मॅन्युअल मोड',
        'ready_to_help': 'मदत करण्यास तयार!',
        'listening_desc': 'मी ऐकत आहे, बोला...',
        'processing_desc': 'एक क्षण...',
        'stop_assistant': 'सहाय्यक थांबवत आहे',
        'vitals_logged': 'वाइटल्स यशस्वीरित्या नोंदवले'
    },
    gu: {
        'welcome_guardian': 'સ્વાગત છે, ગાર્ડિયન.',
        'welcome_sub': 'તમારું સ્વાસ્થ્ય ફક્ત એક સંખ્યા નથી. તે અમારી પ્રાથમિકતા છે.',
        'hello': 'નમસ્તે',
        'feeling_today': 'આજે તમે કેવું અનુભવી રહ્યા છો?',
        'nav_health': 'સ્વાસ્થ્ય',
        'nav_meds': 'દવાઓ',
        'nav_chat': 'સમુદાય',
        'nav_stats': 'આંકડા',
        'nav_docs': 'મુલાકાતો',
        'nav_face': 'સ્કેન',
        'nav_predict': 'અનુમાન',
        'nav_admin': 'એડમિન',
        'sos': 'ઇમરજન્સી SOS',
        'call': 'કોલ કરો',
        'add_med': 'નવી દવા ઉમેરો',
        'thinking': 'વિચારી રહ્યો છું...',
        'listening': 'સાંભળી રહ્યો છું...',
        'speaking': 'બોલી રહ્યો છું...',
        'ready': 'ગાર્ડિયન તૈયાર છે',
        'manual_mode': 'મેન્યુઅલ મોડ',
        'ready_to_help': 'મદદ માટે તૈયાર!',
        'listening_desc': 'હું સાંભળી રહ્યો છું, બોલો...',
        'processing_desc': 'એક ક્ષણ...',
        'stop_assistant': 'સહાયક રોકી રહ્યો છું',
        'vitals_logged': 'વાઇટલ્સ સફળતાપૂર્વક લોગ થયા'
    },
    kn: {
        'welcome_guardian': 'ಸ್ವಾಗತ, ಗಾರ್ಡಿಯನ್.',
        'welcome_sub': 'ನಿಮ್ಮ ಆರೋಗ್ಯ ಕೇವಲ ಒಂದು ಸಂಖ್ಯೆಯಲ್ಲ. ಇದು ನಮ್ಮ ಆದ್ಯತೆ.',
        'hello': 'ನಮಸ್ತೆ',
        'feeling_today': 'ಇಂದು ನೀವು ಹೇಗೆ ಭಾವಿಸುತ್ತಿದ್ದೀರಿ?',
        'nav_health': 'ಆರೋಗ್ಯ',
        'nav_meds': 'ಔಷಧಿಗಳು',
        'nav_chat': 'ಸಮುದಾಯ',
        'nav_stats': 'ಅಂಕಿಅಂಶ',
        'nav_docs': 'ಭೇಟಿಗಳು',
        'nav_face': 'ಸ್ಕ್ಯಾನ್',
        'nav_predict': 'ಮುನ್ಸೂಚನೆ',
        'nav_admin': 'ಅಡ್ಮಿನ್',
        'sos': 'ತುರ್ತು SOS',
        'call': 'ಕರೆ ಮಾಡಿ',
        'add_med': 'ಹೊಸ ಔಷಧಿ ಸೇರಿಸಿ',
        'thinking': 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...',
        'listening': 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ...',
        'speaking': 'ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ...',
        'ready': 'ಗಾರ್ಡಿಯನ್ ಸಿದ್ಧರಿದ್ದಾರೆ',
        'manual_mode': 'ಮ್ಯಾನ್ಯುವಲ್ ಮೋಡ್',
        'ready_to_help': 'ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧ!',
        'listening_desc': 'ನಾನು ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ, ಹೇಳಿ...',
        'processing_desc': 'ಒಂದು ಕ್ಷಣ...',
        'stop_assistant': 'ಸಹಾಯಕನನ್ನು ನಿಲ್ಲಿಸುತ್ತಿದ್ದೇನೆ',
        'vitals_logged': 'ವೈಟಲ್ಸ್ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ'
    },
    ml: {
        'welcome_guardian': 'തിരികെ സ്വാగതം, గార్థియన్.',
        'welcome_sub': 'നിങ്ങളുടെ ആരോഗ്യം വെറുമൊരു സംഖ്യയല്ല. അത് ഞങ്ങളുടെ മുൻഗണനയാണ്.',
        'hello': 'നമస్కారం',
        'feeling_today': 'ഇന്ന് നിങ്ങൾക്ക് എങ്ങനെയുണ്ട്?',
        'nav_health': 'ആരോഗ്യം',
        'nav_meds': 'മരുന്നുകൾ',
        'nav_chat': 'കമ്മ്യൂണിറ്റി',
        'nav_stats': 'സ്ഥിതിവിവരക്കണക്കുകൾ',
        'nav_docs': 'സന്ദർശനങ്ങൾ',
        'nav_face': 'స్కాన్',
        'nav_predict': 'ప్రవచనం',
        'nav_admin': 'അഡ്മിൻ',
        'sos': 'അടിയന്തിര SOS',
        'call': 'വിളിക്കുക',
        'thinking': 'ചിന്തിക്കുന്നു...',
        'listening': 'ശ്രദ്ധിക്കുന്നു...',
        'speaking': 'സംസാരിക്കുന്നു...',
        'ready': 'ഗാർഡിയൻ തയ്യാറാണ്',
        'ready_to_help': 'സഹായിക്കാൻ തയ്യാറാണ്!',
        'listening_desc': 'ഞാൻ ശ്രദ്ധിക്കുന്നു, പറയൂ...',
        'processing_desc': 'ഒരു നിമിഷം...'
    },
    pa: {
        'welcome_guardian': 'ਜੀ ਆਇਆਂ ਨੂੰ, ਗਾਰਡੀਅਨ।',
        'welcome_sub': 'ਤੁਹਾਡੀ ਸਿਹਤ ਸਿਰਫ਼ ਇਕ ਨੰਬਰ ਨਹੀਂ ਹੈ। ਇਹ ਸਾਡੀ ਪਹਿਲ ਹੈ।',
        'hello': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ',
        'feeling_today': 'ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ?',
        'nav_health': 'ਸਿਹਤ',
        'nav_meds': 'ਦਵਾਈਆਂ',
        'nav_chat': 'ਕਮਿਊਨਿਟੀ',
        'nav_stats': 'ਅੰਕੜੇ',
        'nav_docs': 'ਮੁਲਾਕਾਤਾਂ',
        'nav_face': 'ਸਕੈਨ',
        'nav_predict': 'ਭਵਿੱਖਬਾਣੀ',
        'nav_admin': 'ਐਡਮਿਨ',
        'sos': 'ਐਮਰਜੈਂਸੀ SOS',
        'call': 'ਕਾਲ ਕਰੋ',
        'thinking': 'ਸੋਚ ਰਿਹਾ ਹਾਂ...',
        'listening': 'ਸੁਣ ਰਿਹਾ ਹਾਂ...',
        'speaking': 'ਬੋਲ ਰਿਹਾ ਹਾਂ...',
        'ready': 'ਗਾਰਡੀਅਨ ਤਿਆਰ ਹੈ',
        'ready_to_help': 'ਮਦਦ ਲਈ ਤਿਆਰ!',
        'listening_desc': 'ਮੈਂ ਸੁਣ ਰਿਹਾ ਹਾਂ, ਬੋਲੋ...',
        'processing_desc': 'ਇੱਕ ਪਲ ਰੁਕੋ...'
    },
    ur: {
        'welcome_guardian': 'خوش آمدید، گارڈین۔',
        'welcome_sub': 'آپ کی صحت محض ایک عدد نہیں ہے۔ یہ ہماری ترجیح ہے۔',
        'hello': 'ہیلو',
        'feeling_today': 'آج آپ کیسا محسوس کر رہے ہیں؟',
        'nav_health': 'صحت',
        'nav_meds': 'ادویات',
        'nav_chat': 'کمیونٹی',
        'nav_stats': 'اعداد و شمار',
        'nav_docs': 'ملاقاتیں',
        'nav_face': 'اسکین',
        'nav_predict': 'پیش گوئی',
        'nav_admin': 'ایڈمن',
        'sos': 'ہنگامی SOS',
        'call': 'کال کریں',
        'thinking': 'سوچ رہا ہوں...',
        'listening': 'سن رہا ہوں...',
        'speaking': 'بول رہا ہوں...',
        'ready': 'گارڈین تیار ہے',
        'ready_to_help': 'مدد کے لیے تیار!',
        'listening_desc': 'میں سن رہا ہوں، بولیں...',
        'processing_desc': 'ایک لمحہ...'
    },
    or: {
        'welcome_guardian': 'ସ୍ୱାଗତମ୍, ଗାର୍ଡିଆନ୍‌।',
        'welcome_sub': 'ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ କେବଳ ଏକ ସଂଖ୍ୟା ନୁହେଁ। ଏହା ଆମର ପ୍ରାଥମିକତା।',
        'hello': 'ନମସ୍କାର',
        'feeling_today': 'ଆଜି ଆପଣ କେମିତି ଅନୁଭବ କରୁଛନ୍ତି?',
        'nav_health': 'ସ୍ୱାସ୍ଥ୍ୟ',
        'nav_meds': 'ଔଷଧ',
        'nav_chat': 'କମ୍ୟୁନିଟି',
        'nav_stats': 'ପରିସଂଖ୍ୟାନ',
        'nav_docs': 'ଗସ୍ତ',
        'nav_face': 'ସ୍କାନ୍',
        'nav_predict': 'ପୂର୍ବାନୁମାନ',
        'nav_admin': 'ଆଡମିନ୍',
        'sos': 'ଜରୁରୀକାଳୀନ SOS',
        'call': 'କଲ୍ କରନ୍ତୁ',
        'thinking': 'ଭାବୁଛି...',
        'listening': 'ଶୁଣୁଛି...',
        'speaking': 'କହୁଛି...',
        'ready': 'ଗାର୍ଡିଆନ୍ ପ୍ରସ୍ତୁତ',
        'ready_to_help': 'ସାହାଯ୍ୟ ପାଇଁ ପ୍ରସ୍ତୁତ!',
        'listening_desc': 'ମୁଁ ଶୁଣୁଛି, କୁହନ୍ତୁ...',
        'processing_desc': 'ଟିକେ ଅପେକ୍ଷା କରନ୍ତୁ...'
    }
};

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function useSpeech(
    onText: (t: string, isManual: boolean) => void,
    speechLang: string = 'en',
    uiLang: string = 'en',
    userSettings?: any,
    isDisabled: boolean = false
) {
    // --- 1. State Hooks ---
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [isAudioBlocked, setIsAudioBlocked] = useState(false);
    const [isFollowUp, setIsFollowUp] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isContinuous, setIsContinuous] = useState(false);

    // --- 2. Ref Hooks ---
    const followUpTimerRef = useRef<any>(null);
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const recognitionStateRef = useRef<'IDLE' | 'STARTING' | 'LISTENING' | 'STOPPING'>('IDLE');
    const lastTranscriptRef = useRef<{ text: string, time: number }>({ text: '', time: 0 });
    const patienceTimerRef = useRef<any>(null);
    const manualOverrideRef = useRef(false);
    const lastRestartTimeRef = useRef<number>(0);

    // --- 3. Helper Callbacks ---
    const t = useCallback((key: string) => {
        const lang = uiLang || 'en';
        return translations[lang]?.[key] || translations['en'][key] || key;
    }, [uiLang]);

    const langToSpeechCode = useCallback((lang: string): string => {
        const map: any = {
            en: 'en-US', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN',
            bn: 'bn-IN', gu: 'gu-IN', mr: 'mr-IN', pa: 'pa-IN', or: 'or-IN', ur: 'ur-IN'
        };
        return map[lang] || 'en-US';
    }, []);

    const playNeuralAudio = useCallback(async (text: string, lang: string) => {
        if (currentAudioRef.current) {
            try {
                currentAudioRef.current.pause();
                currentAudioRef.current.src = '';
            } catch (e) { }
        }
        try {
            const body = {
                text, language: lang, user_id: userSettings?.id,
                gender: userSettings?.ai_voice_gender, pitch: userSettings?.ai_voice_pitch, rate: userSettings?.ai_voice_rate,
                clarity: userSettings?.ai_voice_clarity,
                model: userSettings?.ai_voice_model
            };

            const response = await fetch(`${API_BASE_URL}/api/generate-speech`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error("TTS Generation failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            currentAudioRef.current = audio;

            audio.onended = () => {
                if (currentAudioRef.current) URL.revokeObjectURL(currentAudioRef.current.src);
                currentAudioRef.current = null;
                setIsSpeaking(false);
                window.micLock = false;
                console.log("[useSpeech] Audio ended, entering follow-up window");

                // Start Follow-up Window (10 seconds)
                setIsFollowUp(true);
                if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
                followUpTimerRef.current = setTimeout(() => {
                    setIsFollowUp(false);
                    console.log("[useSpeech] Follow-up window expired");
                }, 10000);
            };

            try {
                await audio.play();
                setIsAudioBlocked(false);
                return true;
            } catch (playError: any) {
                if (playError.name === 'NotAllowedError') {
                    console.warn("[useSpeech] Play Blocked: User interaction required.");
                    setIsAudioBlocked(true);
                } else {
                    console.error("[useSpeech] Play Failed:", playError);
                }
                return false;
            }
        } catch (e) {
            console.error("[useSpeech] Neural Audio Failed:", e);
            return false;
        }
    }, [userSettings?.id, userSettings?.ai_voice_gender, userSettings?.ai_voice_pitch, userSettings?.ai_voice_rate, userSettings?.ai_voice_clarity, userSettings?.ai_voice_model]);

    const speak = useCallback(async (text: string, lang: string = 'en') => {
        if (!text) {
            window.micLock = false;
            setIsSpeaking(false);
            return;
        }

        setIsSpeaking(true);
        window.micLock = true;
        console.log(`[useSpeech] Speak started: "${text.substring(0, 30)}..." (${lang})`);

        speechSynthesis.cancel();
        if (window.currentRecognition) {
            try {
                recognitionStateRef.current = 'STOPPING';
                window.currentRecognition.stop();
            } catch (e) { }
        }

        console.log("[useSpeech] Fetching Neural TTS...");
        const success = await playNeuralAudio(text, lang);

        if (!success) {
            console.log("[useSpeech] Falling back to Browser TTS");
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = langToSpeechCode(lang);
            utterance.onend = () => {
                console.log("[useSpeech] Browser TTS ended");
                setIsSpeaking(false);
                window.micLock = false;
            };
            utterance.onerror = (e) => {
                console.error("[useSpeech] Browser TTS Error:", e);
                setIsSpeaking(false);
                window.micLock = false;
            };
            speechSynthesis.speak(utterance);
        } else {
            console.log("[useSpeech] Neural TTS success");
        }
    }, [playNeuralAudio, langToSpeechCode]);

    const startListening = useCallback(async (isManual: boolean = false) => {
        if (isDisabled) return;
        if (isMuted) {
            console.log("[useSpeech] Microphone is muted. Blocking listen request.");
            return;
        }
        if (isManual) manualOverrideRef.current = true;
        if (!SpeechRecognition || recognitionStateRef.current !== 'IDLE' || window.micLock) return;

        recognitionStateRef.current = 'STARTING';
        const recognition = new SpeechRecognition();
        window.currentRecognition = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = langToSpeechCode(speechLang);
        recognition.onstart = () => { recognitionStateRef.current = 'LISTENING'; setIsListening(true); };
        recognition.onresult = async (event: any) => {
            let finalTranscript = ''; let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                else interimTranscript += event.results[i][0].transcript;
            }
            if (interimTranscript) setAiResponse(interimTranscript);
            if (!finalTranscript || window.micLock) return;
            if (patienceTimerRef.current) clearTimeout(patienceTimerRef.current);
            patienceTimerRef.current = setTimeout(() => {
                if (window.micLock) return;
                const text = finalTranscript.trim();
                if (lastTranscriptRef.current.text === text && Date.now() - lastTranscriptRef.current.time < 2000) {
                    manualOverrideRef.current = false;
                    return;
                }
                lastTranscriptRef.current = { text, time: Date.now() };

                onText(text, manualOverrideRef.current || isFollowUp);
                manualOverrideRef.current = false;

                if (isFollowUp) {
                    setIsFollowUp(false);
                    if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
                }
            }, 800);
        };
        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech') {
                console.error("Speech Recognition Error:", event.error);
            }
            setIsListening(false);
        };
        recognition.onend = () => {
            setIsListening(false);
            recognitionStateRef.current = 'IDLE';
            window.currentRecognition = null;
        };

        try {
            (recognition as any).startTime = Date.now();
            recognition.start();
        } catch (e) {
            console.error("Failed to start recognition:", e);
            setIsListening(false);
        }
    }, [isContinuous, isFollowUp, langToSpeechCode, onText, speechLang, isSpeaking, isMuted, isDisabled]); // Removed startListening from own deps

    const stopListening = useCallback(() => {
        setIsContinuous(false);
        setIsListening(false);
        if (window.currentRecognition) { try { window.currentRecognition.stop(); } catch (e) { } window.currentRecognition = null; }
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newState = !prev;
            if (newState) stopListening();
            return newState;
        });
    }, [stopListening]);

    // --- 4. Lifecycle/Effect Hooks ---
    useEffect(() => {
        const startStayAlive = () => {
            if (silentAudioRef.current) return;
            const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
            const audio = new Audio(silentSrc);
            audio.loop = true;
            audio.volume = 0.01;
            silentAudioRef.current = audio;
            audio.play().catch(() => { silentAudioRef.current = null; });
            console.log("[useSpeech] Stay-Alive Loop Started");
        };

        const unlock = () => {
            const audio = new Audio();
            audio.play().then(() => {
                console.log("[useSpeech] Audio Context Unlocked");
                setIsAudioBlocked(false);
                startStayAlive();
                window.removeEventListener('click', unlock);
                window.removeEventListener('touchstart', unlock);
            }).catch(() => { });
        };
        window.addEventListener('click', unlock);
        window.addEventListener('touchstart', unlock);
        return () => {
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
            if (silentAudioRef.current) {
                silentAudioRef.current.pause();
                silentAudioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (isDisabled) {
            if (isListening) stopListening();
            return;
        }
        if (isContinuous && !isListening && !isSpeaking && !isProcessing && !window.micLock) {
            // Faster restart if it's been idle for a bit
            const timer = setTimeout(() => {
                // Re-check conditions inside timeout
                if (isContinuous && !isListening && !isSpeaking && !isProcessing && !window.micLock) {
                    startListening();
                }
            }, 300); // 300ms delay for stability
            return () => clearTimeout(timer);
        }
    }, [isListening, isSpeaking, isProcessing, startListening, isDisabled, stopListening, isContinuous]);

    // --- 5. Return Value (Memoized) ---
    return useMemo(() => ({
        isListening,
        isSpeaking,
        isProcessing,
        setIsProcessing,
        aiResponse,
        setAiResponse,
        t,
        speak,
        startListening,
        stopListening,
        setContinuous: (val: boolean) => { setIsContinuous(val); },
        isMuted,
        toggleMute,
        isAudioBlocked,
        isFollowUp
    }), [isListening, isSpeaking, isProcessing, aiResponse, t, speak, startListening, stopListening, isContinuous, isMuted, toggleMute, isAudioBlocked, isFollowUp]);
}
