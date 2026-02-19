import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { cn } from '../utils/cn';

interface PrescriptionUploaderProps {
    userId: number;
    onSuccess?: () => void;
    speak?: (text: string) => void;
}

const PrescriptionUploader: React.FC<PrescriptionUploaderProps> = ({ userId, onSuccess, speak }) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${API_BASE_URL}/ocr/prescription`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                if (data.medications && data.medications.length > 0) {
                    for (const med of data.medications) {
                        await fetch(`${API_BASE_URL}/medicines`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: med.name,
                                dosage: med.dosage,
                                time: (() => {
                                    const defaultTime = '09:00';
                                    const now = new Date();
                                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                                    const [defH, defM] = defaultTime.split(':').map(Number);
                                    const defaultMinutes = defH * 60 + defM;

                                    if (currentMinutes > defaultMinutes) {
                                        const nextMins = currentMinutes + 10;
                                        const nextH = Math.floor(nextMins / 60) % 24;
                                        const nextM = nextMins % 60;
                                        return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
                                    }
                                    return med.timing.includes(':') ? med.timing : defaultTime;
                                })(),
                                after_meal: med.timing.toLowerCase().includes('after'),
                                frequency: 'daily',
                                user_id: userId
                            })
                        });
                    }
                    if (speak) speak(`I have processed your prescription and added ${data.medications.length} medications to your schedule.`);
                    if (onSuccess) onSuccess();
                } else {
                    alert("No medications were detected in this image. Please ensure the drug names are clearly visible.");
                }
            } else {
                alert("The server could not process the image. Please try again.");
            }
        } catch (error) {
            console.error("OCR upload error details:", error);
            if (error instanceof TypeError && error.message.includes("fetch")) {
                alert("Network error: Could not connect to the server. Please check your connection.");
            } else {
                alert(`Prescription parsing failed: ${error instanceof Error ? error.message : "Unknown error"}. Please try a clearer image.`);
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const triggerUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-6">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

            <div
                onClick={triggerUpload}
                className="p-12 rounded-[2.5rem] bg-blue-100 border-2 border-dashed border-blue-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-200 hover:border-blue-400 transition-all group relative overflow-hidden shadow-lg"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-4 bg-blue-200 rounded-full group-hover:scale-110 transition-transform relative z-10 shadow-sm">
                    <Upload className={cn("w-10 h-10 text-blue-600", isUploading && "animate-spin")} />
                </div>
                <h3 className="text-xl font-black mt-4 text-black relative z-10">Upload Prescription</h3>
                <p className="text-black/70 text-center mt-2 relative z-10 font-bold">Our AI will automatically read your medicines</p>
            </div>




        </div>
    );
};

export default PrescriptionUploader;
