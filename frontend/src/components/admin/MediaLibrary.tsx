import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Grid, List as ListIcon, Search, Folder, Image as ImageIcon, File, Filter, MoreHorizontal, Loader2, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config';

const MediaLibrary: React.FC = () => {
    const [media, setMedia] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isUploading, setIsUploading] = useState(false);

    const fetchMedia = () => {
        setIsLoading(true);
        fetch(`${API_BASE_URL}/admin/media`)
            .then(res => res.json())
            .then(data => {
                setMedia(data.media || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching media:", err);
                setIsLoading(false);
            });
    };

    useEffect(() => {
        fetchMedia();
    }, []);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        fetch(`${API_BASE_URL}/admin/media?uploader_id=1`, {
            method: 'POST',
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    fetchMedia();
                }
                setIsUploading(false);
            })
            .catch(err => {
                console.error("Error uploading media:", err);
                setIsUploading(false);
            });
    };

    const handleDelete = (id: number) => {
        if (!confirm("Are you sure you want to delete this file?")) return;

        fetch(`${API_BASE_URL}/admin/media/${id}?admin_id=1`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setMedia(prev => prev.filter(item => item.id !== id));
                }
            })
            .catch(err => console.error("Error deleting media:", err));
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-black">Media Assets</h3>
                    <p className="text-slate-500 font-bold">Manage images, videos, and documents</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">
                        <Folder className="w-5 h-5" />
                        New Folder
                    </button>
                    <label className="cursor-pointer">
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                        <div className={cn("px-8 py-4 bg-sapphire-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-sapphire-700 transition-all shadow-xl shadow-sapphire-200", isUploading && "opacity-50 pointer-events-none")}>
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            {isUploading ? 'Uploading...' : 'Upload File'}
                        </div>
                    </label>
                </div>
            </div>

            <div className="flex items-center justify-between py-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter assets..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 ring-sapphire-100 font-bold text-sm"
                        />
                    </div>
                    <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-600 shadow-sm transition-all">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl ml-4">
                    <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-sapphire-600 shadow-sm" : "text-slate-500")}>
                        <Grid className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-sapphire-600 shadow-sm" : "text-slate-500")}>
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="relative min-h-[400px]">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-sapphire-600 animate-spin" />
                    </div>
                ) : media.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                        <Upload className="w-16 h-16 text-slate-100 mb-6" />
                        <h4 className="text-2xl font-black text-slate-300">No media found</h4>
                        <p className="text-slate-200 font-bold">Files you upload will appear here.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                        {media.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group cursor-pointer"
                            >
                                <div className="aspect-square bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center justify-center p-8 group-hover:shadow-xl group-hover:-translate-y-2 transition-all relative overflow-hidden">
                                    {item.file_type?.startsWith('image') ? (
                                        <div className="flex flex-col items-center">
                                            <ImageIcon className="w-12 h-12 text-blue-400" />
                                            <div className="mt-4 absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ) : (
                                        <File className="w-12 h-12 text-slate-300" />
                                    )}
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                            className="p-2 bg-red-50 text-red-600 rounded-lg shadow-sm hover:bg-red-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
                                            <MoreHorizontal className="w-4 h-4 text-slate-600" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3 px-2">
                                    <p className="text-xs font-black text-slate-800 truncate mb-0.5">{item.filename}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.file_type?.split('/')[1] || 'FILE'}</span>
                                        <span className="text-[10px] font-bold text-slate-300">{formatSize(item.size)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Name</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Type</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Size</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Modified</th>
                                    <th className="px-8 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {media.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-sapphire-100 group-hover:text-sapphire-600 transition-colors">
                                                    {item.file_type?.startsWith('image') ? <ImageIcon className="w-4 h-4" /> : <File className="w-4 h-4" />}
                                                </div>
                                                <span className="text-sm font-black text-slate-700">{item.filename}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-xs font-bold text-slate-400">{item.file_type}</td>
                                        <td className="px-8 py-4 text-xs font-bold text-slate-400">{formatSize(item.size)}</td>
                                        <td className="px-8 py-4 text-xs font-bold text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                    className="p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all font-bold text-xs uppercase tracking-widest"
                                                >
                                                    Delete
                                                </button>
                                                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaLibrary;
