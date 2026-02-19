export const VOICE_DATA: Record<string, { name: string; value: string; gender: 'Male' | 'Female' }[]> = {
    en: [
        { name: "Jenny (US - Neural)", value: "en-US-JennyNeural", gender: "Female" },
        { name: "Christopher (US - Neural)", value: "en-US-ChristopherNeural", gender: "Male" },
        { name: "Guy (US - Neural)", value: "en-US-GuyNeural", gender: "Male" },
        { name: "Aria (US - Neural)", value: "en-US-AriaNeural", gender: "Female" },
        { name: "Sonia (UK - Neural)", value: "en-GB-SoniaNeural", gender: "Female" },
        { name: "Ryan (UK - Neural)", value: "en-GB-RyanNeural", gender: "Male" },
        { name: "Libby (UK - Neural)", value: "en-GB-LibbyNeural", gender: "Female" },
        { name: "Natasha (AU - Neural)", value: "en-AU-NatashaNeural", gender: "Female" },
        { name: "William (AU - Neural)", value: "en-AU-WilliamNeural", gender: "Male" },
        { name: "Michelle (US - Standard)", value: "en-US-MichelleNeural", gender: "Female" },
        { name: "Eric (US - Standard)", value: "en-US-EricNeural", gender: "Male" }
    ],
    hi: [
        { name: "Swara (Neural)", value: "hi-IN-SwaraNeural", gender: "Female" },
        { name: "Madhur (Neural)", value: "hi-IN-MadhurNeural", gender: "Male" }
    ],
    te: [
        { name: "Shruti (Neural)", value: "te-IN-ShrutiNeural", gender: "Female" },
        { name: "Mohan (Neural)", value: "te-IN-MohanNeural", gender: "Male" }
    ],
    ta: [
        { name: "Pallavi (Neural)", value: "ta-IN-PallaviNeural", gender: "Female" },
        { name: "Valluvar (Neural)", value: "ta-IN-ValluvarNeural", gender: "Male" }
    ],
    kn: [
        { name: "Sapna (Neural)", value: "kn-IN-SapnaNeural", gender: "Female" },
        { name: "Gagan (Neural)", value: "kn-IN-GaganNeural", gender: "Male" }
    ],
    ml: [
        { name: "Sobhana (Neural)", value: "ml-IN-SobhanaNeural", gender: "Female" },
        { name: "Midhun (Neural)", value: "ml-IN-MidhunNeural", gender: "Male" }
    ],
    mr: [
        { name: "Aarohi (Neural)", value: "mr-IN-AarohiNeural", gender: "Female" },
        { name: "Manohar (Neural)", value: "mr-IN-ManoharNeural", gender: "Male" }
    ],
    gu: [
        { name: "Dhwani (Neural)", value: "gu-IN-DhwaniNeural", gender: "Female" },
        { name: "Niranjan (Neural)", value: "gu-IN-NiranjanNeural", gender: "Male" }
    ],
    bn: [
        { name: "Tanishaa (Neural)", value: "bn-IN-TanishaaNeural", gender: "Female" },
        { name: "Bashkar (Neural)", value: "bn-IN-BashkarNeural", gender: "Male" }
    ],
    pa: [
        { name: "Ojas (Neural)", value: "pa-IN-OjasNeural", gender: "Male" }
    ],
    ur: [
        { name: "Gul (Neural)", value: "ur-IN-GulNeural", gender: "Female" },
        { name: "Salman (Neural)", value: "ur-IN-SalmanNeural", gender: "Male" }
    ],
    or: [
        // Note: Oriya support in Edge TTS is limited, falling back to general if not available in specific region
        // Assuming standard IN voices if listed, otherwise user will fallback to en
    ]
};
