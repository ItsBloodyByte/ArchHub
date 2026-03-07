import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, GripVertical, FileText, Code2, Search, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CollectionEditorPage() {
  const { collectionId } = useParams();
  const isEditing = !!collectionId;
  const { user, authHeaders } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [tags, setTags] = useState('');
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // Search state for adding items
  const [searchType, setSearchType] = useState('article');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/collections/${collectionId}`);
        const col = res.data;
        setTitle(col.title);
        setDescription(col.description);
        setDifficulty(col.difficulty || 'beginner');
        setTags(col.tags?.join(', ') || '');
        setItems(col.items || []);
      } catch { }
    };
    fetch();
  }, [collectionId, isEditing]);

  const searchItems = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      if (searchType === 'article') {
        const res = await axios.get(`${API}/articles`, { params: { search: searchQuery, limit: 10 } });
        setSearchResults(res.data.articles.map(a => ({ content_type: 'article', content_id: a.id, title: a.title, slug: a.slug, author_username: a.author_username })));
      } else {
        const res = await axios.get(`${API}/scripts`, { params: { search: searchQuery, limit: 10 } });
        setSearchResults(res.data.scripts.map(s => ({ content_type: 'script', content_id: s.id, title: s.title, author_username: s.author_username })));
      }
    } catch { }
    setSearching(false);
  };

  const addItem = (item) => {
    if (items.some(i => i.content_id === item.content_id)) return;
    setItems([...items, item]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const moveItem = (idx, dir) => {
    const newItems = [...items];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    [newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]];
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title, description, difficulty,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        items: items.map(i => ({ content_type: i.content_type, content_id: i.content_id })),
      };
      if (isEditing) {
        await axios.put(`${API}/collections/${collectionId}`, payload, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      } else {
        await axios.post(`${API}/collections`, payload, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      }
      navigate('/collections');
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  if (!user) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Login required</div>;

  return (
    <div data-testid="collection-editor-page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command={isEditing ? 'vim collection.yml' : 'touch collection.yml'} />
      <h1 className="text-2xl font-extrabold tracking-tighter mb-6">{isEditing ? t('collection_edit') : t('collection_create')}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('collection_name_label')}</label>
          <input data-testid="collection-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required minLength={3}
            placeholder={t('collection_name_placeholder')}
            className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('collection_desc_label')}</label>
          <textarea data-testid="collection-description" value={description} onChange={e => setDescription(e.target.value)} required minLength={5}
            placeholder={t('collection_desc_placeholder')} rows={3}
            className="w-full px-4 py-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
        </div>

        {/* Difficulty + Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('article_difficulty')}</label>
            <select data-testid="collection-difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Tags</label>
            <input data-testid="collection-tags" type="text" value={tags} onChange={e => setTags(e.target.value)}
              placeholder="btrfs, installation, lvm"
              className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
          </div>
        </div>

        {/* Items */}
        <div>
          <label className="block text-sm font-medium mb-3">{t('collection_items')} ({items.length})</label>

          {/* Item list */}
          <div className="space-y-2 mb-4">
            {items.map((item, idx) => (
              <div key={`${item.content_id}-${idx}`} data-testid={`collection-editor-item-${idx}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card">
                <span className="text-xs font-mono text-[#1793D1] font-bold w-6 text-center">{idx + 1}</span>
                {item.content_type === 'article' ? (
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="flex-1 text-sm truncate">{item.title || item.content_id}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{item.content_type}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                    className="p-1 rounded hover:bg-muted/20 disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                    className="p-1 rounded hover:bg-muted/20 disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => removeItem(idx)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Search */}
          <div className="rounded-lg border border-border/40 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className="w-4 h-4 text-[#1793D1]" /> {t('collection_add_item')}
            </div>
            <div className="flex gap-2">
              <select data-testid="item-search-type" value={searchType} onChange={e => setSearchType(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50">
                <option value="article">{t('collection_item_article')}</option>
                <option value="script">{t('collection_item_script')}</option>
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input data-testid="item-search-input" type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchItems())}
                  placeholder={`${t('search_btn')}...`}
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50" />
              </div>
              <button type="button" onClick={searchItems} disabled={searching}
                className="h-9 px-4 rounded-md bg-[#1793D1]/10 text-[#1793D1] text-sm font-mono hover:bg-[#1793D1]/20 transition-colors">
                {t('search_btn')}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {searchResults.map(r => (
                  <button key={r.content_id} type="button" onClick={() => addItem(r)}
                    disabled={items.some(i => i.content_id === r.content_id)}
                    className="w-full flex items-center gap-2 p-2 rounded text-left text-sm hover:bg-[#1793D1]/5 disabled:opacity-30 transition-colors">
                    {r.content_type === 'article' ? <FileText className="w-3.5 h-3.5 text-emerald-400" /> : <Code2 className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="truncate">{r.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{r.author_username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button data-testid="collection-submit" type="submit" disabled={saving || !title || !description}
          className="w-full h-10 rounded-md bg-[#1793D1] text-white text-sm font-medium hover:bg-[#1793D1]/90 disabled:opacity-50 transition-colors">
          {saving ? '...' : (isEditing ? t('collection_edit') : t('collection_create'))}
        </button>
      </form>
    </div>
  );
}
