import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Bookmark, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ArticleCard from '../components/ArticleCard';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BookmarksPage() {
  const { authHeaders } = useAuth();
  const { t } = useLanguage();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const res = await axios.get(`${API}/bookmarks`, { headers: authHeaders });
        setBookmarks(res.data.bookmarks);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadBookmarks();
  }, []);

  return (
    <div data-testid="bookmarks-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="cat ~/.archhub/bookmarks" />
      <div className="flex items-center gap-3 mb-8">
        <Bookmark className="w-6 h-6 text-[#1793D1]" />
        <h1 className="text-2xl font-extrabold tracking-tighter">{t('bookmark_list')}</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">{t('bookmark_empty')}</p>
          <Link to="/tutorials" className="text-sm text-[#1793D1] hover:underline underline-offset-4 mt-2 inline-block">
            {t('nav_tutorials')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
