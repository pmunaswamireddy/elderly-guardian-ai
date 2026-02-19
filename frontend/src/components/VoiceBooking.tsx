import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, CheckCircle, User, Clock, Calendar,
    MessageSquare, Plus, ArrowLeft, Globe, Volume2,
    Trash2, Send, Check
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useWebSpeech } from '../hooks/useWebSpeech';
import { ConfirmationModal } from './ConfirmationModal';

interface VoiceBookingProps {
    userId: number;
    onSuccess?: () => void;
    userSettings?: any;  // User preferences including language and voice gender
    onUpdateSettings?: (settings: any) => void; // Callback to save settings
}

type BookingStage = 'doctor' | 'date' | 'time' | 'reason' | 'confirm' | 'complete';

// Define the Message type for the messages state
type Message = { role: 'user' | 'assistant', text: string };

const VoiceBooking: React.FC<VoiceBookingProps> = ({ userId, onSuccess, userSettings, onUpdateSettings }) => {
    // Mode & Navigation
    const [mode, setMode] = useState<'selection' | 'voice' | 'manual'>('selection');
    const [step, setStep] = useState(0); // 0: input/form, 1: success
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // NEW: Conversation Stage Tracking
    const [bookingStage, setBookingStage] = useState<BookingStage>('doctor');
    const [autoListen, setAutoListen] = useState(false); // Continuous listening flag
    const autoListenRef = useRef(false);
    const modeRef = useRef(mode);
    const bookingStageRef = useRef(bookingStage);

    useEffect(() => {
        autoListenRef.current = autoListen;
    }, [autoListen]);

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    useEffect(() => {
        bookingStageRef.current = bookingStage;
    }, [bookingStage]);

    // State
    const [appointments, setAppointments] = useState<any[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');

    // Form Data
    const [formData, setFormData] = useState({
        doctor: '',
        date: '',
        time: '',
        reason: ''
    });

    const voiceTranslations: Record<string, Record<string, string>> = {
        en: {
            doctor: "Hello! I'm your health guardian. Which doctor would you like to see?",
            date: "Great! I've noted Doctor {doctor}. What date would you like to book?",
            time: "Perfect! For {date}, what time works best for you?",
            reason: "Understood. And what is the reason for this appointment?",
            confirm: "Let me confirm: Doctor {doctor} on {date} at {time} for {reason}. Say \"yes\" to book, or \"edit\" to change.",
            success: "Your appointment has been successfully booked.",
            error: "I'm sorry, I'm having trouble connecting right now.",
            cancel: "Booking cancelled. How else can I help you?"
        },
        te: {
            doctor: "నమస్తే! నేను మీ ఆరోగ్య సహాయకుడిని. మీరు ఏ డాక్టర్‌ని సంప్రదించాలనుకుంటున్నారు?",
            date: "చాలా మంచిది! డాక్టర్ {doctor} అని నోట్ చేసుకున్నాను. ఏ తేదీన బుక్ చేయాలనుకుంటున్నారు?",
            time: "{date} నాడు, మీకు ఏ సమయం అనుకూలంగా ఉంటుంది?",
            reason: "అర్థమైంది. ఈ అపాయింట్‌మెంట్ తీసుకోవడానికి కారణం ఏమిటి?",
            confirm: "ఒకసారి సరిచూసుకోండి: డాక్టర్ {doctor}, {date} తేదీన {time} గంటలకు, కారణం: {reason}. బుక్ చేయడానికి \"అవును\" లేదా \"కన్ఫామ్\" అనండి, మార్చడానికి \"ఎడిట్\" అనండి.",
            success: "మీ అపాయింట్‌మెంట్ విజయవంతంగా బుక్ చేయబడింది.",
            error: "క్షమించండి, ప్రస్తుతం నాకు కనెక్షన్ సమస్య ఉంది.",
            cancel: "బుకింగ్ రద్దు చేయబడింది. నేను మీకు ఇంకే విధంగా సహాయపడగలను?",
            lbl_doctor: "డాక్టర్",
            lbl_date: "తేదీ",
            lbl_time: "సమయం",
            lbl_reason: "కారణం"
        },
        hi: {
            doctor: "नमस्ते! मैं आपका स्वास्थ्य सहायक हूँ। आप किस डॉक्टर से मिलना चाहते हैं?",
            date: "बहुत बढ़िया! मैंने डॉक्टर {doctor} का नाम नोट कर लिया है। आप किस तारीख को बुकिंग करना चाहेंगे?",
            time: "{date} के लिए, कौन सा समय आपके लिए सही रहेगा?",
            reason: "समझ गया। इस अपॉइंटमेंट का कारण क्या है?",
            confirm: "पुष्टि करें: डॉक्टर {doctor}, {date} को {time} बजे, कारण: {reason}। बुक करने के लिए \"हाँ\" कहें, या बदलने के लिए \"बदलें\" कहें।",
            success: "आपकी अपॉइंटमेंट सफलतापूर्वक बुक हो गई है।",
            error: "क्षमा करें, मुझे अभी जुड़ने में समस्या हो रही है।",
            cancel: "बुकिंग रद्द कर दी गई। मैं आपकी और क्या मदद कर सकता हूँ?",
            lbl_doctor: "डॉक्टर",
            lbl_date: "तारीख",
            lbl_time: "समय",
            lbl_reason: "कारण"
        },
        ta: {
            doctor: "வணக்கம்! நான் உங்கள் சுகாதார பாதுகாவலர். நீங்கள் எந்த மருத்துவரை பார்க்க விரும்புகிறீர்கள்?",
            date: "சிறப்பு! நான் டாக்டர் {doctor}-ஐக் குறித்துக் கொண்டேன். நீங்கள் எந்த தேதியில் முன்பதிவு செய்ய விரும்புகிறீர்கள்?",
            time: "{date}-க்கு, உங்களுக்கு எந்த நேரம் வசதியாக இருக்கும்?",
            reason: "புரிந்துகொண்டேன். இந்த சந்திப்பிற்கான காரணம் என்ன?",
            confirm: "உறுதிப்படுத்துகிறேன்: டாக்டர் {doctor}, {date} அன்று {time} மணிக்கு, காரணம்: {reason}. முன்பதிவு செய்ய \"ஆம்\" அல்லது \"சரி\" என்று சொல்லுங்கள், மாற்ற \"மாற்று\" என்று சொல்லுங்கள்.",
            success: "உங்கள் அப்பாயிண்ட்மெண்ட் வெற்றிகரமாக முன்பதிவு செய்யப்பட்டது.",
            error: "மன்னிக்கவும், தற்போது இணைப்பதில் சிக்கல் உள்ளது.",
            cancel: "முன்பதிவு ரத்து செய்யப்பட்டது. நான் உங்களுக்கு வேறு எப்படி உதவ முடியும்?",
            lbl_doctor: "மருத்துவர்",
            lbl_date: "தேதி",
            lbl_time: "நேரம்",
            lbl_reason: "காரணம்"
        },
        kn: {
            doctor: "ನಮಸ್ತೆ! ನಾನು ನಿಮ್ಮ ಆರೋಗ್ಯ ರಕ್ಷಕ. ನೀವು ಯಾವ ವೈದ್ಯರನ್ನು ನೋಡಲು ಬಯಸುತ್ತೀರಿ?",
            date: "ಉತ್ತಮ! ನಾನು ಡಾಕ್ಟರ್ {doctor} ಅವರನ್ನು ಗುರುತಿಸಿಕೊಂಡಿದ್ದೇನೆ. ನೀವು ಯಾವ ದಿನಾಂಕದಂದು ಕಾಯ್ದಿರಿಸಲು ಬಯಸುತ್ತೀರಿ?",
            time: "{date} ಕ್ಕೆ, ನಿಮಗೆ ಯಾವ ಸಮಯ ಉತ್ತಮವಾಗಿದೆ?",
            reason: "ಅರ್ಥವಾಯಿತು. ಈ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗೆ ಕಾರಣವೇನು?",
            confirm: "ದೃೀಕರಿಸಿ: ಡಾಕ್ಟರ್ {doctor}, {date} ರಂದು {time} ಕ್ಕ್ಕೆ, ಕಾರಣ: {reason}. ಕಾಯ್ದಿರಿಸಲು \"ಹೌದು\" ಅಥವಾ \"ಸರಿ\" ಎಂದು ಹೇಳಿ, ಬದಲಾಯಿಸಲು \"ಬದಲಾಯಿಸು\" ಎಂದು ಹೇಳಿ.",
            success: "ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಯಶಸ್ವಿಯಾಗಿ ಬುಕ್ ಆಗಿದೆ.",
            error: "ಕ್ಷಮಿಸಿ, ಈಗ ಸಂಪರ್ಕಿಸಲು ತೊಂದರೆಯಾಗುತ್ತಿದೆ.",
            cancel: "ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ನಾನು ನಿಮಗೆ ಬೇರೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
            lbl_doctor: "ವೈದ್ಯರು",
            lbl_date: "ದಿನಾಂಕ",
            lbl_time: "ಸಮಯ",
            lbl_reason: "ಕಾರಣ"
        },
        ml: {
            doctor: "നമസ്‌കാരം! ഞാൻ നിങ്ങളുടെ ആരോഗ്യ സംരക്ഷകനാണ്. നിങ്ങൾക്ക് ഏത് ഡോക്ടറെയാണ് കാണേണ്ടത്?",
            date: "കൊള്ളാം! ഞാൻ ഡോക്ടർ {doctor}-നെ നോട്ട് ചെയ്തു. ഏത് തീയതിയിലാണ് ബുക്ക് ചെയ്യേണ്ടത്?",
            time: "{date}-ലേക്ക്, നിങ്ങൾക്ക് ഏത് സമയമാണ് അനുയോജ്യം?",
            reason: "മനസ്സിലായി. ഈ അപ്പോയിന്റ്‌മെന്റിനുള്ള കാരണം എന്താണ്?",
            confirm: "സ്ഥിരീകരിക്കട്ടെ: ഡോക്ടർ {doctor}, {date}-ന് {time} മണിക്ക്, കാരണം: {reason}. ബുക്ക് ചെയ്യാൻ \"അതെ\" അല്ലെങ്കിൽ \"ശരി\" എന്ന് പറയുക, മാറ്റാൻ \"മാറ്റുക\" എന്ന് പറയുക.",
            success: "നിങ്ങളുടെ അപ്പോയിന്റ്‌മെന്റ് വിജയകരമായി ബുക്ക് ചെയ്തു.",
            error: "ക്ഷമിക്കണം, ഇപ്പോൾ കണക്റ്റുചെയ്യുന്നതിൽ തടസ്സമുണ്ട്.",
            cancel: "ബുക്കിംഗ് റദ്ദാക്കി. എനിക്ക് വേറെ എങ്ങനെ സഹായിക്കാം?",
            lbl_doctor: "ഡോക്ടർ",
            lbl_date: "തീയതി",
            lbl_time: "സമയം",
            lbl_reason: "കാരണം"
        },
        bn: {
            doctor: "নমস্কার! আমি আপনার স্বাস্থ্য অভিভাবক। আপনি কোন ডাক্তারকে দেখাতে চান?",
            date: "চমৎকার! আমি ডাক্তার {doctor}-এর নাম লিখে নিয়েছি। আপনি কোন তারিখে বুক করতে চান?",
            time: "{date}-এর জন্য কোন সময় আপনার সুবিধাজনক হবে?",
            reason: "বুঝতে পারলাম। এই অ্যাপয়েন্টমেন্টের কারণ কী?",
            confirm: "নিশ্চিত করুন: ডাক্তার {doctor}, {date} তারিখে {time} টায়, কারণ: {reason}। বুক করতে \"হ্যাঁ\" বা \"ঠিক আছে\" বলুন, পরিবর্তন করতে \"বদলান\" বলুন।",
            success: "আপনার অ্যাপয়েন্টমেন্ট সফলভাবে বুক করা হয়েছে।",
            error: "দুঃখিত, এখন সংযোগ করতে সমস্যা হচ্ছে।",
            cancel: "বুকিং বাতিল করা হয়েছে। আমি আপনাকে আর কীভাবে সাহায্য করতে পারি?",
            lbl_doctor: "ডাক্তার",
            lbl_date: "তারিখ",
            lbl_time: "সময়",
            lbl_reason: "কারণ"
        },
        gu: {
            doctor: "નમસ્તે! હું તમારો સ્વાસ્થ્ય રક્ષક છું. તમે કયા ડૉક્ટરને મળવા માંગો છો?",
            date: "સરસ! મેં ડૉક્ટર {doctor} ની નોંધ લીધી છે. તમે કઈ તારીખે બુક કરવા માંગો છો?",
            time: "{date} માટે, તમારા માટે કયો સમય અનુકૂળ રહેશે?",
            reason: "સમજી ગયો. આ એપોઇન્ટમેન્ટનું કારણ શું છે?",
            confirm: "પુષ્ટિ કરો: ડૉક્ટર {doctor} {date} ના રોજ {time} વાગ્યે, કારણ: {reason}. બુક કરવા માટે \"હા\" અથવા \"ઠીક છે\" કહો, અથવા બદલવા માટે \"બદલો\" કહો.",
            success: "તમારી એપોઇન્ટમેન્ટ સફળતાપૂર્વક બુક થઈ ગઈ છે.",
            error: "ક્ષમા કરશો, અત્યારે કનેક્ટ કરવામાં સમસ્યા આવી રહી છે.",
            cancel: "બુકિંગ રદ કરવામાં આવ્યું છે. હું તમને બીજી કઈ રીતે મદદ કરી શકું?",
            lbl_doctor: "ડૉક્ટર",
            lbl_date: "તારીખ",
            lbl_time: "સમય",
            lbl_reason: "કારણ"
        },
        mr: {
            doctor: "नमस्कार! मी तुमचा आरोग्य रक्षक आहे. तुम्हाला कोणत्या डॉक्टरांना भेटायचे आहे?",
            date: "छान! मी डॉक्टर {doctor} यांची नोंद घेतली आहे. तुम्हाला कोणत्या तारखेला बुकिंग करायचे आहे?",
            time: "{date} साठी तुमच्यासाठी कोणती वेळ योग्य असेल?",
            reason: "समजले. या भेटीचे कारण काय आहे?",
            confirm: "खात्री करा: डॉक्टर {doctor}, {date} रोजी {time} वाजता, कारण: {reason}. बुक करण्यासाठी \"हो\" किंवा \"ठीक आहे\" म्हणा, बदलण्यासाठी \"बदला\" म्हणा.",
            success: "तुमची अपॉइंटमेंट यशस्वीरित्या बुक झाली आहे.",
            error: "क्षमस्व, आता कनेक्ट करण्यात समस्या येत आहे.",
            cancel: "बुकिंग रद्द झाले. मी तुमची आणखी काय मदत करू शकतो?",
            lbl_doctor: "डॉक्टर",
            lbl_date: "तारीख",
            lbl_time: "वेळ",
            lbl_reason: "कारण"
        },
        pa: {
            doctor: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ ਸਿਹਤ ਰੱਖਿਅਕ ਹਾਂ। ਤੁਸੀਂ ਕਿਸ ਡਾਕਟਰ ਨੂੰ ਮਿਲਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
            date: "ਬਹੁਤ ਵਧੀਆ! ਮੈਂ ਡਾਕਟਰ {doctor} ਦਾ ਨਾਮ ਨੋਟ ਕਰ ਲਿਆ ਹੈ। ਤੁਸੀਂ ਕਿਸ ਤਾਰੀਖ ਨੂੰ ਬੁੱਕ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
            time: "{date} ਲਈ ਤੁਹਾਡੇ ਲਈ ਕਿਹੜਾ ਸਮਾਂ ਸਹੀ ਰਹੇਗਾ?",
            reason: "ਸਮਝ ਗਿਆ। ਇਸ ਮੁਲਾਕਾਤ ਦਾ ਕਾਰਨ ਕੀ ਹੈ?",
            confirm: "ਪੁਸ਼ਟੀ ਕਰੋ: ਡਾਕਟਰ {doctor}, {date} ਨੂੰ {time} ਵਜੇ, ਕਾਰਨ: {reason}। ਬੁੱਕ ਕਰਨ ਲਈ \"ਹਾਂ\" ਜਾਂ \"ਠੀਕ ਹੈ\" ਕਹੋ, ਬਦਲਣ ਲਈ \"ਬਦਲੋ\" ਕਹੋ।",
            success: "ਤੁਹਾਡੀ ਮੁਲਾਕਾਤ ਸਫਲਤਾਪੂਰਵਕ ਬੁੱਕ ਹੋ ਗਈ ਹੈ।",
            error: "ਮਾਫ਼ ਕਰਨਾ, ਇਸ ਵੇਲੇ ਕੁਨੈਕਸ਼ਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆ ਰਹੀ ਹੈ।",
            cancel: "ਬੁਕਿੰਗ ਰੱਦ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਮੈਂ ਹੋਰ ਤੁਹਾਡੀ ਕੀ ਸਹਾਇਤਾ ਕਰ ਸਕਦਾ ਹਾਂ?",
            lbl_doctor: "ਡਾਕਟਰ",
            lbl_date: "ਤਾਰੀਖ",
            lbl_time: "ਸਮਾਂ",
            lbl_reason: "ਕਾਰਨ"
        },
        ur: {
            doctor: "ہیلو! میں آپ کا ہیلتھ گارڈین ہوں۔ آپ کس ڈاکٹر سے ملنا چاہیں گے؟",
            date: "زبردست! میں نے ڈاکٹر {doctor} کو نوٹ کر لیا ہے۔ آپ کس تاریخ کو بک کرنا چاہیں گے؟",
            time: "{date} کے لیے، کون سا وقت آپ کے لیے بہتر رہے گا؟",
            reason: "سمجھ گیا۔ اور اس ملاقات کی کیا وجہ ہے؟",
            confirm: "تصدیق کریں: ڈاکٹر {doctor}، {date} کو {time} بجے، وجہ: {reason}. بک کرنے کے لیے \"ہاں\" یا \"ٹھیک ہے\" کہیں، تبدیل کرنے کے لیے \"تبدیل\" کہیں۔",
            success: "آپ کی ملاقات کامیابی کے ساتھ بک ہو گئی ہے۔",
            error: "معذرت، مجھے ابھی رابطہ کرنے میں دشواری ہو رہی ہے۔",
            cancel: "بکنگ منسوخ کر دی گئی۔ میں آپ کی اور کیا مدد کر سکتا ہوں؟",
            lbl_doctor: "ڈاکٹر",
            lbl_date: "تاریخ",
            lbl_time: "وقت",
            lbl_reason: "وجہ"
        },
        or: {
            doctor: "ନମସ୍ତେ! ମୁଁ ଆପଣଙ୍କର ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ। ଆପଣ କେଉଁ ଡାକ୍ତରଙ୍କୁ ଦେଖାଇବାକୁ ଚାହାଁନ୍ତି?",
            date: "ବହୁତ ଭଲ! ମୁଁ ଡାକ୍ତର {doctor} ଙ୍କ ନାମ ନୋଟ କରି ନେଇଛି। ଆପଣ କେଉଁ ତାରିଖରେ ବୁକିଂ କରିବାକୁ ଚାହୁଁଛନ୍ତି?",
            time: "{date} ପାଇଁ, ଆପଣଙ୍କ ପାଇଁ କେଉଁ ସମୟ ସୁବିଧାଜନକ ହେବ?",
            reason: "ବୁଝିଗଲି। ଏହି ଆପଏଣ୍ଟମେଣ୍ଟର କାରଣ କ’ଣ?",
            confirm: "ଥରେ ଯାଞ୍ଚ କରି ନିଅନ୍ତୁ: ଡାକ୍ତର {doctor}, {date} ତାରିଖରେ {time} ସମୟରେ, କାରଣ: {reason}। ବୁକ୍ କରିବା ପାଇଁ \"ହଁ\" କିମ୍ବା \"କନଫର୍ମ\" କୁହନ୍ତୁ, ପରିବର୍ତ୍ତନ ପାଇଁ \"ଏଡିଟ\" କୁହନ୍ତୁ।",
            success: "ଆପଣଙ୍କର ଆପଏଣ୍ଟମେଣ୍ଟ ସଫଳତାର ସହିତ ବୁକ୍ ହୋଇଗଲା।",
            error: "କ୍ଷମା କରିବେ, ଏବେ କନେକ୍ସନରେ କିଛି ଅସୁବିଧା ହେଉଛି।",
            cancel: "ବୁକିଂ ରଦ୍ଦ କରାଗଲା। ମୁଁ ଆପଣଙ୍କୁ ଆଉ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?",
            lbl_doctor: "ଡାକ୍ତର",
            lbl_date: "ତାରିଖ",
            lbl_time: "ସମୟ",
            lbl_reason: "କାରଣ"
        }
    };

    const getPrompt = (stage: string, lang: string, data: any = {}) => {
        const t = voiceTranslations[lang] || voiceTranslations['en'];
        let text = t[stage] || voiceTranslations['en'][stage];
        if (!text) return "";
        return text.replace('{doctor}', data.doctor || "")
            .replace('{date}', data.date || "")
            .replace('{time}', data.time || "")
            .replace('{reason}', data.reason || "");
    };

    // Pickers
    const [showLangPicker, setShowLangPicker] = useState(false);

    // local state for language/gender initialized from props
    // We prioritize the decoupled 'booking_*' settings
    const [localLang, setLocalLang] = useState(userSettings?.booking_language || userSettings?.ai_language || userSettings?.preferred_language || 'en');
    const [localGender, setLocalGender] = useState(userSettings?.booking_voice_gender || userSettings?.ai_voice_gender || (userSettings?.preferred_voice_uri?.includes('Male') ? 'Male' : 'Female') || 'Female');

    // Update local state if props change (e.g. from background sync)
    useEffect(() => {
        if (userSettings) {
            const bLang = userSettings.booking_language;
            const bGender = userSettings.booking_voice_gender;

            setLocalLang(bLang || userSettings.ai_language || userSettings.preferred_language || 'en');
            const gender = bGender || userSettings.ai_voice_gender || (userSettings?.preferred_voice_uri?.includes('Male') ? 'Male' : 'Female') || 'Female';
            setLocalGender(gender);
        }
    }, [userSettings]);

    const selectedLanguage = localLang;
    const selectedGender = localGender;

    // Modals
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean,
        title: string,
        message: string,
        onConfirm: () => void,
        type: 'danger' | 'success'
    }>({
        show: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger'
    });

    // Refs for stability
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
        { code: 'bn', name: 'Bengali', native: 'বাংলা' },
        { code: 'te', name: 'Telugu', native: 'తెలుగు' },
        { code: 'mr', name: 'Marathi', native: 'मराठी' },
        { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
        { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
        { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
        { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
        { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
        { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
        { code: 'ur', name: 'Urdu', native: 'اردو' }
    ];

    const fetchHistory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments?user_id=${userId}`);
            const data = await response.json();
            if (data.appointments) setAppointments(data.appointments);
        } catch (e) { }
    };

    useEffect(() => {
        fetchHistory();
    }, [userId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle component unmount and mode changes
    useEffect(() => {
        if (mode === 'voice') {
            console.log('[VoiceBooking] Claiming micLock');
            window.micLock = true;

            // Set initial message in correct language
            const initialText = getPrompt('doctor', selectedLanguage);
            setMessages([{ role: 'assistant', text: initialText }]);
            speak(initialText);

            // Stop background recognition if it exists
            if ((window as any).currentRecognition) {
                try {
                    (window as any).currentRecognition.stop();
                } catch (e) { }
            }
        } else {
            console.log('[VoiceBooking] Releasing micLock');
            window.micLock = false;
        }

        return () => {
            console.log('[VoiceBooking] Unmounting, releasing micLock');
            window.micLock = false;
        };
    }, [mode]);

    // TTS Utility with auto-restart for continuous listening
    const speak = async (text: string) => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.src = '';
        }

        const langMap: Record<string, string> = {
            'en': 'en-US', 'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN',
            'kn': 'kn-IN', 'ml': 'ml-IN', 'bn': 'bn-IN', 'gu': 'gu-IN',
            'mr': 'mr-IN', 'pa': 'pa-IN', 'or': 'or-IN', 'ur': 'ur-IN'
        };
        const speechCode = langMap[selectedLanguage] || 'en-US';

        return new Promise<void>(async (resolve) => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/generate-speech`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        language: selectedLanguage,
                        user_id: userId,
                        gender: selectedGender,
                        pitch: userSettings?.ai_voice_pitch,
                        rate: userSettings?.ai_voice_rate
                    })
                });

                if (!response.ok) throw new Error("TTS failed");
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                currentAudioRef.current = audio;

                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    currentAudioRef.current = null;
                    // Auto-restart listening if in continuous mode using refs to avoid stale closures
                    if (autoListenRef.current && modeRef.current === 'voice' && bookingStageRef.current !== 'complete') {
                        console.log('[VoiceBooking] Audio ended, auto-restarting mic...');
                        setTimeout(() => startListening(), 500);
                    }
                    resolve();
                };

                await audio.play();
            } catch (e) {
                console.error("Neural TTS failed:", e);
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = speechCode;
                utterance.pitch = userSettings?.ai_voice_pitch || 1.0;
                utterance.rate = userSettings?.ai_voice_rate || 1.0;
                utterance.onend = () => {
                    if (autoListenRef.current && modeRef.current === 'voice' && bookingStageRef.current !== 'complete') {
                        console.log('[VoiceBooking] Speech synthesis ended, auto-restarting mic...');
                        setTimeout(() => startListening(), 500);
                    }
                    resolve();
                };
                window.speechSynthesis.speak(utterance);
            }
        });
    };

    // Enhanced AI Dialogue Handler with stage awareness
    const handleDialogue = async (text: string) => {
        if (!text.trim()) return;

        const lowerText = text.toLowerCase();

        // Check for cancel commands
        const cancelWords = ['cancel', 'stop', 'quit', 'exit', 'రద్దు', 'మార్చు', 'बंद करो', 'रद्द करें', 'నిలిపివేయి'];
        if (cancelWords.some(w => lowerText.includes(w))) {
            setAutoListen(false);
            stopListening();
            const cancelMsg = getPrompt('cancel', selectedLanguage);
            setMessages(prev => [...prev, { role: 'assistant', text: cancelMsg }]);
            speak(cancelMsg);
            return;
        }

        setIsProcessing(true);
        setMessages(prev => [...prev, { role: 'user', text }]);

        try {
            const response = await fetch(`${API_BASE_URL}/voice/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    user_id: userId,
                    language: selectedLanguage,
                    stage: bookingStage,
                    gender: selectedGender,
                    current_data: formData
                })
            });

            const data = await response.json();

            // Update form data with extracted entities (maintain what we have if AI returns null for unchanged)
            const newFormData = {
                doctor: data.doctor || formData.doctor,
                date: data.date || formData.date,
                time: data.time || formData.time,
                reason: data.reason || formData.reason
            };

            // If AI explicitly cleared a field, update it (AI sends 'null' string or actual null)
            if (data.doctor === null) newFormData.doctor = '';
            if (data.date === null) newFormData.date = '';
            if (data.time === null) newFormData.time = '';
            if (data.reason === null) newFormData.reason = '';

            setFormData(newFormData);

            // Determine next stage - Trust backend 'next_stage' primarily
            let nextStage: BookingStage = data.next_stage || bookingStage;

            // Manual confirmation/edit detection for extra robustness (Multilingual)
            const confirmWords = [
                'confirm', 'book', 'yes', 'yeah', 'yup', 'sure', 'ok', 'okay', 'done', 'save', 'proceed', 'correct',
                'हाँ', 'जी', 'ठीक', 'करो', 'सही', 'వద్దు', 'అవును', 'కన్ఫామ్', 'సరే', 'చెయ్యి', 'ఓకే',
                'ஆம்', 'சரி', 'உறுதி', 'புக்', 'செய்', 'ಹೌದು', 'ಖಚಿತ', 'ಮಾಡು', 'ಅതെ', 'ശരി', 'ഉറപ്പ്',
                'হ্যাঁ', 'ঠিক', 'બુક', 'હા', 'हो', 'ਕਰਾ', 'ਜੀ'
            ];

            const editWords = [
                'edit', 'change', 'wrong', 'fix', 'update', 'modify', 'correction',
                'మార్చు', 'బదలండి', 'ಬದಲಾಯಿಸು', 'बदलें', 'बदलो', 'परिवर्तन', 'বদলান', 'மாற்று', 'ಸರಿచేయి', 'మార్చండి'
            ];

            const isUserConfirming = confirmWords.some(w => lowerText.includes(w.toLowerCase()));
            const isUserEditing = editWords.some(w => lowerText.includes(w.toLowerCase()));

            if (data.is_complete || (bookingStage === 'confirm' && isUserConfirming && !isUserEditing)) {
                setBookingStage('complete');
                await saveAppointment(newFormData);
                return;
            }

            // If user wants to edit, determine which field
            if (isUserEditing) {
                if (lowerText.includes('doctor') || lowerText.includes('డాక్టర్') || lowerText.includes('डॉक्टर') || lowerText.includes('மருத்துவர்')) nextStage = 'doctor';
                else if (lowerText.includes('date') || lowerText.includes('తేదీ') || lowerText.includes('तारीख') || lowerText.includes('ದಿನಾಂಕ')) nextStage = 'date';
                else if (lowerText.includes('time') || lowerText.includes('సమయం') || lowerText.includes('समय') || lowerText.includes('நேரம்')) nextStage = 'time';
                else if (lowerText.includes('reason') || lowerText.includes('కారణం') || lowerText.includes('कारण') || lowerText.includes('ಕಾರಣ')) nextStage = 'reason';
                else if (bookingStage === 'confirm') nextStage = 'doctor'; // Default to start if in confirm
            }

            setBookingStage(nextStage);

            // Prioritize AI response, fallback if it's too technical or empty
            let responseText = data.response_text;
            const isTechnical = /^[0-9\s:-]+$/.test(responseText || "");

            if (!responseText || responseText.length < 5 || isTechnical) {
                console.log("[VoiceBooking] Using local translation fallback for:", nextStage);
                responseText = getPrompt(nextStage, selectedLanguage, newFormData);
            }

            setMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
            if (responseText) await speak(responseText);

        } catch (err) {
            console.error("Dialogue Error:", err);
            const errMsg = getPrompt('error', selectedLanguage);
            setMessages(prev => [...prev, { role: 'assistant', text: errMsg }]);
            await speak(errMsg);
        } finally {
            setIsProcessing(false);
        }
    };

    // Save appointment helper
    const saveAppointment = async (data: typeof formData) => {
        try {
            const isEditing = editingId !== null;
            const url = isEditing ? `${API_BASE_URL}/appointments/${editingId}` : `${API_BASE_URL}/appointments`;
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    doctor_name: data.doctor,
                    date: data.date,
                    time: data.time,
                    reason: data.reason
                })
            });
            if (response.ok) {
                setStep(1);
                setAutoListen(false);
                stopListening();
                setEditingId(null); // Reset after success
                fetchHistory();
                if (onSuccess) onSuccess();
                await speak(getPrompt('success', selectedLanguage));
            }
        } catch (error) {
            console.error("Booking Error:", error);
            await speak("Sorry, there was an error booking your appointment. Please try again.");
        }
    };

    // Voice Hook
    const { isListening, startListening, stopListening } = useWebSpeech({
        language: selectedLanguage,
        onResult: (transcript) => {
            handleDialogue(transcript);
        },
        onError: (err) => {
            console.error("Mic Error:", err);
            setIsProcessing(false);
            if (autoListenRef.current) {
                setTimeout(() => startListening(), 1000);
            }
        }
    });

    const handleManualConfirm = async () => {
        setConfirmModal({
            show: true,
            title: 'Confirm Appointment',
            message: `Book appointment with ${formData.doctor} on ${formData.date} at ${formData.time}?`,
            type: 'success',
            onConfirm: async () => {
                await saveAppointment(formData);
            }
        });
    };

    const handleDelete = (id: number, doctor: string) => {
        setConfirmModal({
            show: true,
            title: 'Cancel Appointment',
            message: `Are you sure you want to cancel your visit with ${doctor}?`,
            type: 'danger',
            onConfirm: async () => {
                await fetch(`${API_BASE_URL}/appointments/${id}`, { method: 'DELETE' });
                fetchHistory();
                if (onSuccess) onSuccess();
                speak("Appointment cancelled.");
            }
        });
    };

    // Progress indicator
    const stages = ['doctor', 'date', 'time', 'reason', 'confirm'];
    const currentStageIndex = stages.indexOf(bookingStage);

    return (
        <div className="glass-card p-6 md:p-10 min-h-[500px] flex flex-col relative overflow-hidden">
            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div
                        key="success"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-center py-12"
                    >
                        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                            <CheckCircle className="w-12 h-12" />
                        </div>
                        <h4 className="text-3xl font-black uppercase tracking-tighter">
                            Booking Confirmed!
                        </h4>
                        <p className="text-slate-500 mt-2 max-w-xs mx-auto font-medium">We've added this to your health calendar and set a reminder.</p>
                        <button
                            onClick={() => {
                                setStep(0);
                                setMode('selection');
                                setBookingStage('doctor');
                                setFormData({ doctor: '', date: '', time: '', reason: '' });
                                setEditingId(null);
                            }}
                            className="mt-10 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                            Back to Home
                        </button>
                    </motion.div>
                ) : mode === 'selection' ? (
                    <motion.div key="selection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                        <div className="text-center">
                            <h3 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter">Book Appointment</h3>
                            <p className="text-gray-600 dark:text-slate-400 mt-2 font-medium">Choose your preferred booking method</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => {
                                    setMode('voice');
                                    modeRef.current = 'voice';
                                    setBookingStage('doctor');
                                    bookingStageRef.current = 'doctor';
                                    setAutoListen(true);
                                    autoListenRef.current = true;
                                }}
                                className="group p-8 bg-sapphire-600 text-white rounded-[2.5rem] hover:scale-[1.02] active:scale-98 transition-all shadow-2xl shadow-sapphire-600/20 text-left relative overflow-hidden"
                            >
                                <div className="relative z-10">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/30">
                                        <Mic className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-2xl font-black uppercase tracking-tight">Voice Assistant</h4>
                                    <p className="text-sapphire-100 font-medium text-sm mt-2 opacity-80">Hands-free booking in your language</p>
                                </div>
                                <Mic className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform" />
                            </button>

                            <button
                                onClick={() => setMode('manual')}
                                className="group p-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-[2.5rem] hover:border-sapphire-500 transition-all text-left relative overflow-hidden shadow-sm magic-tile"
                            >
                                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-700/50 text-slate-400 group-hover:bg-sapphire-50 dark:group-hover:bg-sapphire-900/50 group-hover:text-sapphire-500 rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-inner">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <h4 className="text-2xl font-black uppercase tracking-tight">
                                    Manual Entry
                                </h4>
                                <p className="text-gray-600 dark:text-slate-400 font-medium text-sm mt-2 opacity-80">Fill in the form details yourself</p>
                            </button>
                        </div>

                        {appointments.length > 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 space-y-4 pt-12 border-t border-slate-100">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest">Upcoming Appointments</h4>
                                    <span className="bg-sapphire-50 text-sapphire-600 px-3 py-1 rounded-full text-[10px] font-black">
                                        {appointments.length} Scheduled
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {appointments.map((appt, idx) => (
                                        <motion.div
                                            key={appt.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[2rem] flex items-center justify-between group hover:border-sapphire-200 dark:hover:border-sapphire-500/50 hover:shadow-xl hover:shadow-sapphire-500/5 transition-all magic-tile"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-sapphire-50 rounded-2xl flex items-center justify-center text-sapphire-500">
                                                    <Calendar className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-black dark:text-white">
                                                        {appt.doctor_name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-slate-300 font-bold uppercase tracking-tight opacity-70">
                                                        {new Date(appt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {appt.time}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(appt.id);
                                                        setFormData({
                                                            doctor: appt.doctor_name,
                                                            date: appt.date,
                                                            time: appt.time,
                                                            reason: appt.reason
                                                        });
                                                        setMode('manual');
                                                    }}
                                                    className="p-3 text-sapphire-500 hover:bg-sapphire-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 font-black text-[10px] uppercase"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-sapphire-50 flex items-center justify-center">
                                                        <Plus className="w-4 h-4 rotate-45" />
                                                    </div>
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(appt.id, appt.doctor_name)}
                                                    className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 font-black text-[10px] uppercase"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                                                        <Trash2 className="w-4 h-4" />
                                                    </div>
                                                    Cancel
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="active_mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col h-full min-h-[600px]">
                        {/* Header with Back button and Settings */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => {
                                    setMode('selection');
                                    setAutoListen(false);
                                    stopListening();
                                    setMessages([]);
                                    setBookingStage('doctor');
                                    setFormData({ doctor: '', date: '', time: '', reason: '' });
                                    setEditingId(null);
                                }}
                                className="p-3 hover:bg-slate-100 rounded-2xl transition-all flex items-center gap-3 text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest"
                            >
                                <ArrowLeft className="w-5 h-5" /> Back
                            </button>

                            <div className="flex items-center gap-2">
                                {/* Language Picker */}
                                <div className="relative">
                                    <motion.button
                                        onClick={() => setShowLangPicker(!showLangPicker)}
                                        className="p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl flex items-center gap-2 hover:border-sapphire-300 transition-all font-black text-xs uppercase text-slate-600 dark:text-slate-300"
                                    >
                                        <Globe className="w-4 h-4 text-sapphire-500" />
                                        {languages.find(l => l.code === selectedLanguage)?.name}
                                    </motion.button>

                                    <AnimatePresence>
                                        {showLangPicker && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 z-50 grid grid-cols-2 gap-2 min-w-[300px]"
                                            >
                                                {languages.map(lang => (
                                                    <button
                                                        key={lang.code}
                                                        onClick={() => {
                                                            setLocalLang(lang.code);
                                                            if (onUpdateSettings) {
                                                                onUpdateSettings({ booking_language: lang.code });
                                                            }
                                                            setShowLangPicker(false);
                                                        }}
                                                        className={`p-3 rounded-xl text-left transition-all flex flex-col ${selectedLanguage === lang.code ? 'bg-sapphire-500 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                                                    >
                                                        <span className="text-xs font-black uppercase tracking-wide">{lang.name}</span>
                                                        <span className={`text-[10px] ${selectedLanguage === lang.code ? 'text-sapphire-100' : 'text-slate-400'}`}>{lang.native}</span>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Voice Gender Picker */}
                                <motion.button
                                    onClick={() => {
                                        const newGender = localGender === 'Male' ? 'Female' : 'Male';
                                        setLocalGender(newGender);
                                        if (onUpdateSettings) {
                                            onUpdateSettings({ booking_voice_gender: newGender });
                                        }
                                    }}
                                    className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2 font-black text-xs uppercase ${localGender === 'Female' ? 'bg-pink-50 border-pink-100 text-pink-600 dark:bg-pink-900/20 dark:border-pink-900/30' : 'bg-sapphire-50 border-sapphire-100 text-sapphire-600 dark:bg-sapphire-900/20 dark:border-sapphire-900/30'
                                        }`}
                                >
                                    <Volume2 className="w-4 h-4" />
                                    {selectedGender} Voice
                                </motion.button>
                            </div>
                        </div>

                        {mode === 'voice' ? (
                            <div className="flex-1 flex flex-col gap-6">
                                {/* Progress Indicator */}
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    {['Doctor', 'Date', 'Time', 'Reason', 'Confirm'].map((label, idx) => (
                                        <div key={label} className="flex items-center">
                                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${idx <= currentStageIndex ? 'bg-sapphire-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                }`}>
                                                {idx < currentStageIndex ? <Check className="w-4 h-4" /> : <span className="text-xs font-black">{idx + 1}</span>}
                                                <span className="text-xs font-black">{label}</span>
                                            </div>
                                            {idx < 4 && <div className={`w-8 h-0.5 ${idx < currentStageIndex ? 'bg-sapphire-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                                        </div>
                                    ))}
                                </div>

                                {/* Chat Log */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 bg-slate-50/50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100/50 dark:border-slate-700/50 p-6 overflow-y-auto max-h-[400px] scroll-smooth"
                                >
                                    <div className="space-y-4">
                                        {messages.map((msg, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[80%] p-5 rounded-[2rem] font-bold text-sm shadow-sm ${msg.role === 'user'
                                                    ? 'bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-none'
                                                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-100 dark:border-slate-600 rounded-tl-none'
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                            </motion.div>
                                        ))}
                                        {isProcessing && (
                                            <div className="flex justify-start">
                                                <div className="bg-white dark:bg-slate-700 p-5 rounded-[2rem] rounded-tl-none border border-slate-100 dark:border-slate-600 flex gap-1">
                                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-slate-300 dark:bg-slate-400 rounded-full" />
                                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-slate-300 dark:bg-slate-400 rounded-full" />
                                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-slate-300 dark:bg-slate-400 rounded-full" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Form Grid (Live Update) */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { id: 'doctor', label: voiceTranslations[selectedLanguage]?.lbl_doctor || 'Doctor', val: formData.doctor, icon: User, color: 'text-sapphire-500' },
                                        { id: 'date', label: voiceTranslations[selectedLanguage]?.lbl_date || 'Date', val: formData.date, icon: Calendar, color: 'text-emerald-500' },
                                        { id: 'time', label: voiceTranslations[selectedLanguage]?.lbl_time || 'Time', val: formData.time, icon: Clock, color: 'text-amber-500' },
                                        { id: 'reason', label: voiceTranslations[selectedLanguage]?.lbl_reason || 'Reason', val: formData.reason, icon: MessageSquare, color: 'text-rose-500' }
                                    ].map(f => (
                                        <div key={f.id} className={`p-4 rounded-3xl border bg-white shadow-sm flex flex-col transition-all ${f.val ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-100 opacity-60'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <f.icon className={`w-3 h-3 ${f.color}`} />
                                                <span className="text-[10px] font-black uppercase text-slate-400">{f.label}</span>
                                                {f.val && <Check className="w-3 h-3 text-emerald-500 ml-auto" />}
                                            </div>
                                            <span className="text-xs font-black text-slate-800 dark:text-white truncate">{f.val || '---'}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Controls */}
                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        {bookingStage === 'confirm' && (
                                            <motion.button
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                onClick={() => {
                                                    setBookingStage('complete');
                                                    saveAppointment(formData);
                                                }}
                                                className="absolute -top-16 left-0 right-0 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all text-sm z-10 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Confirm & Book Appointment
                                            </motion.button>
                                        )}
                                        <input
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { handleDialogue(inputText); setInputText(''); } }}
                                            placeholder="Type your answer here..."
                                            className="w-full p-5 bg-white dark:bg-[#020617] dark:text-white dark:border-white/10 border border-slate-100 rounded-3xl font-bold outline-none ring-sapphire-500/10 focus:ring-4 pr-16"
                                            style={{ backgroundColor: window.matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark') ? '#020617' : undefined }}
                                        />
                                        <button
                                            onClick={() => { handleDialogue(inputText); setInputText(''); }}
                                            className="absolute right-3 top-3 p-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl hover:bg-black transition-colors"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <motion.button
                                        onClick={() => {
                                            if (isListening) {
                                                setAutoListen(false);
                                                stopListening();
                                            } else {
                                                setAutoListen(true);
                                                startListening();
                                            }
                                        }}
                                        animate={isListening ? { scale: [1, 1.05, 1] } : {}}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${isListening ? 'bg-red-500 ring-4 ring-red-200' : 'bg-sapphire-600'}`}
                                    >
                                        {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                                    </motion.button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <User className="w-3 h-3 text-sapphire-500" /> Doctor Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.doctor}
                                            onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                                            className="w-full p-4 bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-white/10 border border-slate-100 rounded-2xl font-bold ring-sapphire-500/10 focus:ring-4 outline-none"
                                            style={{ backgroundColor: window.matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark') ? '#020617' : undefined }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-sapphire-500" /> Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full p-4 bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-white/10 border border-slate-100 rounded-2xl font-bold ring-sapphire-500/10 focus:ring-4 outline-none"
                                            style={{ backgroundColor: window.matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark') ? '#020617' : undefined }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-sapphire-500" /> Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            className="w-full p-4 bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-white/10 border border-slate-100 rounded-2xl font-bold ring-sapphire-500/10 focus:ring-4 outline-none"
                                            style={{ backgroundColor: window.matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark') ? '#020617' : undefined }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <MessageSquare className="w-3 h-3 text-sapphire-500" /> Reason
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.reason}
                                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            className="w-full p-4 bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-white/10 border border-slate-100 rounded-2xl font-bold ring-sapphire-500/10 focus:ring-4 outline-none"
                                            style={{ backgroundColor: window.matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark') ? '#020617' : undefined }}
                                        />
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleManualConfirm}
                                    disabled={!formData.doctor || !formData.date || !formData.time}
                                    className={`w-full py-5 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all text-lg disabled:opacity-50 disabled:grayscale ${editingId ? 'bg-amber-500 shadow-amber-500/20' : 'bg-sapphire-600 shadow-sapphire-600/20'
                                        }`}
                                >
                                    {editingId ? 'Update Appointment' : 'Book Appointment'}
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Components */}
            <ConfirmationModal
                isOpen={confirmModal.show}
                onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmLabel={confirmModal.type === 'danger' ? 'Yes, Cancel It' : 'Yes, Book It'}
            />
        </div>
    );
};

export default VoiceBooking;
