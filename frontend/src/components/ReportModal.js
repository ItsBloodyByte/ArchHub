import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Flag, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ReportModal({ targetType, targetId, onClose }) {
  const { authHeaders } = useAuth();
  const { t } = useLanguage();
  const [category, setCategory] = useState('other');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { value: 'spam', label: t('report_cat_spam') },
    { value: 'offensive', label: t('report_cat_offensive') },
    { value: 'misleading', label: t('report_cat_misleading') },
    { value: 'duplicate', label: t('report_cat_duplicate') },
    { value: 'other', label: t('report_cat_other') },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/reports`, {
        target_type: targetType,
        target_id: targetId,
        reason,
        category
      }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit report');
    }
    setLoading(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div data-testid="report-modal" className="bg-popover border border-border rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-400" />
            {t('report_title')}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="text-emerald-400 font-medium mb-1">{t('report_submitted')}</div>
            <p className="text-xs text-muted-foreground">{t('report_submitted_desc')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>
            )}
            <div>
              <label className="block text-xs font-medium mb-2">{t('report_category')}</label>
              <div className="space-y-2">
                {categories.map(cat => (
                  <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="report_category"
                      value={cat.value}
                      checked={category === cat.value}
                      onChange={(e) => setCategory(e.target.value)}
                      className="accent-[#1793D1]"
                    />
                    <span className="text-sm">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">{t('report_details')}</label>
              <textarea
                data-testid="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('report_details_placeholder')}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                required
                minLength={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-sm text-sm border border-input hover:bg-accent transition-colors">
                {t('report_cancel')}
              </button>
              <button
                data-testid="submit-report-btn"
                type="submit"
                disabled={loading || !reason.trim()}
                className="px-4 py-2 rounded-sm text-sm bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {loading ? t('report_submitting') : t('report_submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
