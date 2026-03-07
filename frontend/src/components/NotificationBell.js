import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Bell, Check, CheckCheck, Info, CheckCircle, XCircle, MessageSquare, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const typeIcons = {
  review_started: Info,
  article_approved: CheckCircle,
  article_rejected: XCircle,
  changes_requested: MessageSquare,
  role_changed: Shield,
};

export default function NotificationBell() {
  const { user, authHeaders } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API}/notifications`, { headers: authHeaders });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      console.error(err);
    }
  }, [user, authHeaders]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markRead = async (notifId) => {
    try {
      await axios.put(`${API}/notifications/${notifId}/read`, {}, { headers: authHeaders });
      setNotifications(notifications.map(n => n.id === notifId ? { ...n, read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`, {}, { headers: authHeaders });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        data-testid="notification-bell"
        onClick={() => { setOpen(!open); if (!open) loadNotifications(); }}
        className="relative p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#1793D1] text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div data-testid="notification-dropdown" className="absolute right-0 top-full mt-1 w-80 max-h-96 rounded-md border bg-popover shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <span className="text-sm font-medium">{t('notif_title')}</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#1793D1] hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> {t('notif_mark_all_read')}
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t('notif_empty')}
                </div>
              ) : (
                notifications.map(notif => {
                  const Icon = typeIcons[notif.type] || Info;
                  return (
                    <div
                      key={notif.id}
                      className={`flex gap-3 px-3 py-3 border-b border-border/30 hover:bg-accent/50 transition-colors ${!notif.read ? 'bg-[#1793D1]/5' : ''}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${!notif.read ? 'text-[#1793D1]' : 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(notif.created_at).toLocaleString()}
                          </span>
                          {!notif.read && (
                            <button onClick={() => markRead(notif.id)} className="text-[10px] text-[#1793D1] hover:underline flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> read
                            </button>
                          )}
                        </div>
                        {notif.link && (
                          <Link to={notif.link} onClick={() => setOpen(false)} className="text-[10px] text-[#1793D1] hover:underline mt-0.5 inline-block">
                            View &rarr;
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
