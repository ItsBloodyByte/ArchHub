import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Users, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import UserAvatar from '../components/UserAvatar';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ContributorsPage() {
  const { t, lang } = useLanguage();
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/site/contributors`)
      .then(res => setContributors(res.data.contributors || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="contributors-page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="cat /etc/archhub/CONTRIBUTORS" />

      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('nav_home')}
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Users className="w-6 h-6 text-[#1793D1]" />
        <h1 className="text-2xl font-extrabold tracking-tighter">{t('contributors_title')}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">{t('contributors_subtitle')}</p>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />)}</div>
      ) : contributors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>{t('contributors_empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contributors.map((c, i) => (
            <Link key={i} to={`/user/${c.username}`} data-testid={`contributor-${c.username}`}
              className="flex items-center gap-4 p-4 rounded-lg border border-border/30 bg-card hover:border-[#1793D1]/30 hover:bg-[#1793D1]/5 transition-all group">
              <UserAvatar username={c.username} size={48} />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold group-hover:text-[#1793D1] transition-colors">{c.username}</h3>
                <p className="text-sm text-muted-foreground">
                  {lang === 'en' ? (c.title_en || c.title_de) : (c.title_de || c.title_en)}
                </p>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-md bg-[#1793D1]/10 flex items-center justify-center text-[#1793D1] font-mono text-xs font-bold">
                #{i + 1}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
