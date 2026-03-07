import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Info, AlertTriangle, Megaphone, ArrowRight, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_CONFIG = {
  info: { icon: Info, border: 'border-[#1793D1]/30', bg: 'bg-[#1793D1]/5', iconColor: 'text-[#1793D1]', badge: 'bg-[#1793D1]/15 text-[#1793D1]' },
  warning: { icon: AlertTriangle, border: 'border-amber-500/30', bg: 'bg-amber-500/5', iconColor: 'text-amber-400', badge: 'bg-amber-500/15 text-amber-400' },
  important: { icon: Megaphone, border: 'border-red-500/30', bg: 'bg-red-500/5', iconColor: 'text-red-400', badge: 'bg-red-500/15 text-red-400' },
};

export default function AnnouncementBanner() {
  const [ann, setAnn] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedId = localStorage.getItem('archhub_ann_dismissed');
    axios.get(`${API}/announcement`).then(res => {
      if (res.data.active) {
        if (dismissedId === `${res.data.title}_${res.data.updated_at}`) return;
        setAnn(res.data);
      }
    }).catch(() => {});
  }, []);

  const dismiss = () => {
    setDismissed(true);
    if (ann) localStorage.setItem('archhub_ann_dismissed', `${ann.title}_${ann.updated_at}`);
  };

  if (!ann || dismissed) return null;

  const config = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <div data-testid="announcement-banner" className={`border-b ${config.border} ${config.bg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-lg ${config.badge} flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 data-testid="announcement-title" className="text-sm font-bold">{ann.title}</h3>
            {ann.message && <p className="text-xs text-muted-foreground mt-0.5">{ann.message}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ann.link_url && ann.link_text && (
              ann.link_url.startsWith('/') ? (
                <Link
                  to={ann.link_url}
                  data-testid="announcement-link"
                  className={`hidden sm:inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium transition-colors ${config.badge}`}
                >
                  {ann.link_text} <ArrowRight className="w-3 h-3" />
                </Link>
              ) : (
                <a
                  href={ann.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="announcement-link"
                  className={`hidden sm:inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium transition-colors ${config.badge}`}
                >
                  {ann.link_text} <ArrowRight className="w-3 h-3" />
                </a>
              )
            )}
            <button
              data-testid="announcement-dismiss"
              onClick={dismiss}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
