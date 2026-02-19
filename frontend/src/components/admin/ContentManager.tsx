import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, FileText, ChevronRight, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config';

const ContentManager: React.FC = () => {
    const [content, setContent] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'article' | 'page'>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState({ title: '', body: '', type: 'article', status: 'published' });

    const fetchContent = () => {
        setIsLoading(true);
        fetch(`${API_BASE_URL}/admin/cms`)
            .then(res => res.json())
            .then(data => {
                setContent(data.content || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching content:", err);
                setIsLoading(false);
            });
    };

    useEffect(() => {
        fetchContent();
    }, []);

    const handleDelete = (id: number) => {
        if (!confirm("Are you sure you want to delete this content?")) return;

        fetch(`${API_BASE_URL}/admin/cms/${id}?admin_id=1`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setContent(prev => prev.filter(item => item.id !== id));
                }
            })
            .catch(err => console.error("Error deleting content:", err));
    };

    const handleSave = () => {
        const method = editingItem ? 'PUT' : 'POST';
        const url = editingItem
            ? `${API_BASE_URL}/admin/cms/${editingItem.id}`
            : `${API_BASE_URL}/admin/cms`;

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, author_id: 1 })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setIsFormOpen(false);
                    setEditingItem(null);
                    setFormData({ title: '', body: '', type: 'article', status: 'published' });
                    fetchContent();
                }
            })
            .catch(err => console.error("Error saving content:", err));
    };

    const openCreate = () => {
        setEditingItem(null);
        setFormData({ title: '', body: '', type: 'article', status: 'published' });
        setIsFormOpen(true);
    };

    const openEdit = (item: any) => {
        setEditingItem(item);
        setFormData({ title: item.title, body: item.body, type: item.type, status: item.status });
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-black">Content Hub</h3>
                    <p className="text-slate-500 font-bold">Create and manage your digital assets</p>
                </div>
                {!isFormOpen && (
                    <button
                        onClick={openCreate}
                        className="px-8 py-4 bg-sapphire-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-sapphire-700 transition-all shadow-xl shadow-sapphire-200"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Content
                    </button>
                )}
            </div>

            {isFormOpen ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-10 space-y-8"
                >
                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl">
                        <h4 className="text-xl font-black text-slate-800">{editingItem ? 'Edit Content' : 'New Content'}</h4>
                        <button onClick={() => setIsFormOpen(false)} className="text-slate-400 font-bold hover:text-slate-600 tracking-widest uppercase text-[10px]">Cancel</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 ring-emerald-100 outline-none"
                                placeholder="Enter title..."
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 ring-emerald-100 outline-none appearance-none"
                            >
                                <option value="article">Article</option>
                                <option value="page">Page</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Body Content</label>
                        <textarea
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            rows={8}
                            className="w-full p-6 bg-slate-50 border-none rounded-3xl font-bold focus:ring-2 ring-emerald-100 outline-none resize-none"
                            placeholder="Write something amazing..."
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {['draft', 'published'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setFormData({ ...formData, status: s as any })}
                                        className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            formData.status === s ? "bg-white text-sapphire-600 shadow-sm" : "text-slate-500"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
                        >
                            {editingItem ? 'Save Changes' : 'Publish Content'}
                        </button>
                    </div>
                </motion.div>
            ) : (
                <>
                    <div className="flex items-center gap-4 py-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search content..."
                                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 ring-sapphire-100 font-bold"
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {['all', 'article', 'page'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f as any)}
                                    className={cn(
                                        "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeFilter === f ? "bg-white text-sapphire-600 shadow-sm" : "text-slate-500"
                                    )}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden relative min-h-[200px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                <Loader2 className="w-8 h-8 text-sapphire-600 animate-spin" />
                            </div>
                        ) : content.length === 0 ? (
                            <div className="p-20 text-center">
                                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <h4 className="text-xl font-black text-slate-400">No content found</h4>
                                <p className="text-slate-300 font-bold">Start by creating your first article or page.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {content.filter(c => activeFilter === 'all' || c.type === activeFilter).map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={cn("p-4 rounded-2xl shadow-sm transition-transform group-hover:scale-110",
                                                item.type === 'page' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                            )}>
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-lg">{item.title}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{item.type}</span>
                                                    <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-lg",
                                                        item.status === 'published' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                                    )}>{item.status}</span>
                                                    <span className="text-[10px] font-bold text-slate-300">Updated {new Date(item.updated_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-3 bg-white text-slate-400 hover:text-sapphire-600 hover:bg-sapphire-50 rounded-xl transition-all border border-slate-50 opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-3 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-50 opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                            <button title="More Options" className="p-3 text-slate-300 hover:text-slate-600 transition-colors">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                            <ChevronRight className="w-5 h-5 text-slate-200" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ContentManager;
