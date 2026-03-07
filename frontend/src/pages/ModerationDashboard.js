import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Shield, Clock, CheckCircle, XCircle, MessageSquare, Eye, AlertTriangle, ChevronRight, Flag, Trash2, User, BookOpen, HelpCircle, Code2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UserAvatar from '../components/UserAvatar';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColors = {
  submitted: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  in_review: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const reportTypeIcons = {
  article: BookOpen,
  question: HelpCircle,
  answer: MessageSquare,
  comment: MessageSquare,
  user: User,
  script: Code2,
};

export default function ModerationDashboard() {
  const { authHeaders } = useAuth();
  const { t } = useLanguage();
  const [queue, setQueue] = useState({ submitted: [], in_review: [] });
  const [stats, setStats] = useState({});
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleDetail, setArticleDetail] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('queue');
  const [reports, setReports] = useState([]);
  const [openReportCount, setOpenReportCount] = useState(0);
  const [reportFilter, setReportFilter] = useState('open');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadReports(); }, [reportFilter]);

  const loadData = async () => {
    try {
      const [queueRes, statsRes] = await Promise.all([
        axios.get(`${API}/mod/queue`, { headers: authHeaders }),
        axios.get(`${API}/mod/stats`, { headers: authHeaders })
      ]);
      setQueue(queueRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadReports = async () => {
    try {
      const res = await axios.get(`${API}/mod/reports?status_filter=${reportFilter}`, { headers: authHeaders });
      setReports(res.data.reports);
      setOpenReportCount(res.data.open_count);
    } catch (err) {
      console.error(err);
    }
  };

  const loadArticleDetail = async (articleId) => {
    try {
      const res = await axios.get(`${API}/mod/article/${articleId}`, { headers: authHeaders });
      setArticleDetail(res.data);
      setSelectedArticle(articleId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaim = async (articleId) => {
    try {
      await axios.post(`${API}/mod/articles/${articleId}/claim`, {}, { headers: authHeaders });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (articleId, action) => {
    if (!actionReason.trim() && action !== 'approve') return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/mod/articles/${articleId}/${action}`, {
        reason: actionReason || `${action}d`
      }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setSelectedArticle(null);
      setArticleDetail(null);
      setActionReason('');
      loadData();
    } catch (err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  const resolveReport = async (reportId) => {
    try {
      await axios.put(`${API}/mod/reports/${reportId}/resolve`, {}, { headers: authHeaders });
      loadReports();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteContent = async (targetType, targetId) => {
    try {
      await axios.delete(`${API}/mod/${targetType}s/${targetId}`, { headers: authHeaders });
      loadReports();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted/20 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted/15 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="moderation-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="sudo systemctl status archhub-mod" />
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-[#1793D1]" />
        <h1 className="text-2xl font-extrabold tracking-tighter">{t('mod_dashboard')}</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="p-4 rounded-lg border border-border/50 bg-card">
          <div className="text-2xl font-extrabold font-mono text-amber-400">{stats.pending || 0}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">{t('mod_pending')}</div>
        </div>
        <div className="p-4 rounded-lg border border-border/50 bg-card">
          <div className="text-2xl font-extrabold font-mono text-blue-400">{stats.in_review || 0}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">{t('mod_in_review')}</div>
        </div>
        <div className="p-4 rounded-lg border border-border/50 bg-card">
          <div className="text-2xl font-extrabold font-mono text-emerald-400">{stats.approved_today || 0}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">{t('mod_approved_today')}</div>
        </div>
        <div className="p-4 rounded-lg border border-border/50 bg-card">
          <div className="text-2xl font-extrabold font-mono">{stats.total_actions || 0}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">{t('mod_total_actions')}</div>
        </div>
        <div className="p-4 rounded-lg border border-border/50 bg-card">
          <div className="text-2xl font-extrabold font-mono text-red-400">{openReportCount}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">{t('mod_open_reports')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border/50 pb-2">
        <button
          data-testid="mod-tab-queue"
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeTab === 'queue' ? 'text-[#1793D1] border-b-2 border-[#1793D1]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('mod_queue')} ({queue.submitted.length + queue.in_review.length})
        </button>
        <button
          data-testid="mod-tab-reports"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'text-[#1793D1] border-b-2 border-[#1793D1]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          {t('mod_reports')} {openReportCount > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 rounded-full">{openReportCount}</span>}
        </button>
      </div>

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {t('mod_pending')} ({queue.submitted.length})
              </h2>
              {queue.submitted.length === 0 && queue.in_review.length === 0 ? (
                <div className="p-8 rounded-lg border border-border/50 bg-card text-center text-muted-foreground text-sm">
                  {t('mod_no_pending')}
                </div>
              ) : (
                <div className="space-y-3">
                  {queue.submitted.map(article => (
                    <div key={article.id} data-testid={`mod-article-${article.id}`} className="p-4 rounded-lg border border-border/50 bg-card hover:border-[#1793D1]/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${statusColors.submitted}`}>
                              {t('status_submitted')}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">{new Date(article.created_at).toLocaleString()}</span>
                          </div>
                          <h3 className="font-bold truncate">{article.title}</h3>
                          <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                            <UserAvatar username={article.author_username} size={16} />
                            {article.author_username}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleClaim(article.id)}
                            className="h-8 px-3 rounded-md bg-[#1793D1] text-white text-xs font-medium hover:bg-[#126A9A] transition-colors"
                          >
                            {t('mod_claim')}
                          </button>
                          <button
                            onClick={() => loadArticleDetail(article.id)}
                            className="h-8 px-3 rounded-md border border-border text-xs hover:bg-accent transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* In Review */}
            {queue.in_review.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  {t('mod_in_review')} ({queue.in_review.length})
                </h2>
                <div className="space-y-3">
                  {queue.in_review.map(article => (
                    <div key={article.id} data-testid={`mod-review-${article.id}`} className="p-4 rounded-lg border border-border/50 bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${statusColors.in_review}`}>
                              {t('status_in_review')}
                            </span>
                          </div>
                          <h3 className="font-bold truncate">{article.title}</h3>
                          <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                            <UserAvatar username={article.author_username} size={16} />
                            {article.author_username}
                          </div>
                        </div>
                        <button
                          onClick={() => loadArticleDetail(article.id)}
                          className="h-8 px-3 rounded-md border border-border text-xs hover:bg-accent transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {articleDetail ? (
              <div className="p-5 rounded-lg border border-border/50 bg-card sticky top-4">
                <h3 className="font-bold mb-3">{articleDetail.article.title}</h3>
                <div className="text-xs text-muted-foreground font-mono mb-4 flex items-center gap-1">
                  <UserAvatar username={articleDetail.article.author_username} size={16} />
                  {articleDetail.article.author_username} &middot; {articleDetail.article.category}
                </div>
                <div className="max-h-64 overflow-y-auto text-sm mb-4 p-3 rounded bg-muted/20 border border-border/30">
                  {articleDetail.article.content_markdown?.substring(0, 500)}...
                </div>

                <textarea
                  data-testid="mod-reason-input"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={t('mod_reason_placeholder')}
                  className="w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50"
                />

                <div className="flex flex-col gap-2">
                  <button
                    data-testid="mod-approve-btn"
                    onClick={() => handleAction(selectedArticle, 'approve')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> {t('mod_approve')}
                  </button>
                  <button
                    data-testid="mod-reject-btn"
                    onClick={() => handleAction(selectedArticle, 'reject')}
                    disabled={actionLoading || !actionReason.trim()}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> {t('mod_reject')}
                  </button>
                  <button
                    data-testid="mod-delete-article-btn"
                    onClick={async () => {
                      await deleteContent('article', selectedArticle);
                      setSelectedArticle(null);
                      setArticleDetail(null);
                      loadData();
                    }}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-md border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t('mod_delete_content')}
                  </button>
                </div>

                {articleDetail.moderation_history?.length > 0 && (
                  <div className="mt-4 border-t border-border/30 pt-3">
                    <h4 className="text-xs font-bold mb-2">{t('mod_history')}</h4>
                    {articleDetail.moderation_history.map((entry, i) => (
                      <div key={i} className="text-xs text-muted-foreground mb-1 font-mono">
                        {entry.action} - {entry.moderator_username} ({new Date(entry.created_at).toLocaleDateString()})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-lg border border-dashed border-border/50 text-center text-sm text-muted-foreground">
                {t('mod_select_article')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div data-testid="mod-reports-panel">
          <div className="flex items-center gap-2 mb-4">
            <select
              data-testid="report-filter"
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="open">{t('mod_reports_open')}</option>
              <option value="resolved">{t('mod_reports_resolved')}</option>
              <option value="all">{t('mod_reports_all')}</option>
            </select>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 rounded-lg border border-border/50 bg-card text-center text-muted-foreground text-sm">
              {t('mod_no_reports')}
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => {
                const TypeIcon = reportTypeIcons[report.target_type] || Flag;
                return (
                  <div key={report.id} data-testid={`report-${report.id}`} className="p-4 rounded-lg border border-border/50 bg-card hover:border-amber-500/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                        report.status === 'open' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
                            report.status === 'open' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {report.status}
                          </span>
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground">
                            {report.target_type}
                          </span>
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground">
                            {report.category}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">{new Date(report.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm mb-2">{report.reason}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <UserAvatar username={report.reporter_username} size={16} />
                            {t('mod_reported_by')}: {report.reporter_username}
                          </span>
                          <span className="font-mono">ID: {report.target_id.substring(0, 8)}...</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {report.status === 'open' && (
                          <>
                            {report.target_type !== 'user' && (
                              <button
                                data-testid={`report-delete-${report.id}`}
                                onClick={() => deleteContent(report.target_type, report.target_id)}
                                className="h-8 px-3 rounded-md border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> {t('mod_delete_content')}
                              </button>
                            )}
                            <button
                              data-testid={`report-resolve-${report.id}`}
                              onClick={() => resolveReport(report.id)}
                              className="h-8 px-3 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> {t('mod_resolve')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
