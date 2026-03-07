import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, Eye, Clock, Tag, Flag, Trash2, Cpu, Monitor, Server, AlertCircle, Bug } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import VoteButtons from '../components/VoteButtons';
import ReportModal from '../components/ReportModal';
import UserAvatar from '../components/UserAvatar';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QADetailPage() {
  const { questionId } = useParams();
  const { user, authHeaders } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReport, setShowReport] = useState(null);
  const [answerError, setAnswerError] = useState('');

  useEffect(() => { loadQuestion(); }, [questionId]);

  const loadQuestion = async () => {
    try {
      const res = await axios.get(`${API}/questions/${questionId}`, { headers: authHeaders });
      setQuestion(res.data.question);
      setAnswers(res.data.answers);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleVoteQuestion = async (value) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await axios.post(`${API}/questions/${questionId}/vote`, { value }, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });
      setQuestion(prev => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoteAnswer = async (answerId, value) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await axios.post(`${API}/answers/${answerId}/vote`, { value }, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });
      setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, ...res.data } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptAnswer = async (answerId) => {
    try {
      const res = await axios.post(`${API}/answers/${answerId}/accept`, {}, { headers: authHeaders });
      setAnswers(prev => prev.map(a => ({
        ...a,
        accepted: a.id === answerId ? res.data.accepted : false
      })));
      setQuestion(prev => ({ ...prev, accepted_answer_id: res.data.accepted ? answerId : null }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBugStatus = async (newStatus) => {
    try {
      await axios.put(`${API}/questions/${questionId}/bug-status`, { bug_status: newStatus }, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });
      setQuestion(prev => ({ ...prev, bug_status: newStatus }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim() || submitting) return;
    setSubmitting(true);
    setAnswerError('');
    try {
      const res = await axios.post(`${API}/questions/${questionId}/answers`, { body_markdown: newAnswer.trim() }, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });
      setAnswers(prev => [...prev, res.data]);
      setNewAnswer('');
      setQuestion(prev => ({ ...prev, answer_count: (prev.answer_count || 0) + 1 }));
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAnswerError(detail === '2FA_REQUIRED' ? t('twofa_required_msg') : (detail || 'Error'));
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted/30 rounded w-2/3" /><div className="h-96 bg-muted/10 rounded" /></div></div>;
  }

  if (!question) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">{t('qa_not_found')}</div>;
  }

  return (
    <div data-testid="qa-detail-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TerminalHeader command="man archhub-question --detail" />
      <Link to="/questions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('nav_qa')}
      </Link>

      {/* Question */}
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tighter mb-4">{(lang === 'en' && question.title_en) ? question.title_en : question.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-mono mb-4">
          <Link to={`/user/${question.author_username}`} className="hover:text-[#1793D1] transition-colors flex items-center gap-1">
            <UserAvatar username={question.author_username} size={22} />
            {question.author_username}
          </Link>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(question.created_at).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {question.view_count}</span>
          {question.accepted_answer_id && (
            <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> {t('qa_solved')}</span>
          )}
        </div>

        {/* Bug Report Status Banner + Mod Controls */}
        {question.is_bug_report && (
          <div data-testid="bug-status-banner" className={`flex flex-wrap items-center gap-3 mb-6 p-3 rounded-lg border-2 ${
            question.bug_status === 'fixed' ? 'border-emerald-500/30 bg-emerald-500/5' :
            question.bug_status === 'confirmed' ? 'border-amber-500/30 bg-amber-500/5' :
            'border-red-500/30 bg-red-500/5'
          }`}>
            <div className="flex items-center gap-2">
              <Bug className={`w-4 h-4 ${
                question.bug_status === 'fixed' ? 'text-emerald-400' :
                question.bug_status === 'confirmed' ? 'text-amber-400' : 'text-red-400'
              }`} />
              <span className={`text-sm font-bold font-mono ${
                question.bug_status === 'fixed' ? 'text-emerald-400' :
                question.bug_status === 'confirmed' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {t('bug_status')}: {question.bug_status === 'fixed' ? t('bug_status_fixed') : question.bug_status === 'confirmed' ? t('bug_status_confirmed') : t('bug_status_open')}
              </span>
            </div>
            {user && ['admin', 'moderator'].includes(user.role) && (
              <div className="flex items-center gap-2 ml-auto">
                {question.bug_status === 'open' && (
                  <button data-testid="bug-confirm-btn" onClick={() => handleBugStatus('confirmed')}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                    {t('bug_confirm_btn')}
                  </button>
                )}
                {(question.bug_status === 'open' || question.bug_status === 'confirmed') && (
                  <button data-testid="bug-fix-btn" onClick={() => handleBugStatus('fixed')}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    {t('bug_fix_btn')}
                  </button>
                )}
                {question.bug_status === 'fixed' && (
                  <button data-testid="bug-reopen-btn" onClick={() => handleBugStatus('open')}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    {t('bug_reopen_btn')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {question.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {question.tags.map(tag => (
              <span key={tag} className="text-xs font-mono text-[#1793D1]/70 bg-[#1793D1]/5 px-2 py-1 rounded">#{tag}</span>
            ))}
          </div>
        )}

        {/* System Metadata Badges */}
        {question.system_metadata && Object.values(question.system_metadata).some(v => v) && (
          <div data-testid="system-metadata-badges" className="flex flex-wrap gap-2 mb-6 p-3 rounded-lg border border-border/40 bg-muted/5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mr-1"><Monitor className="w-3.5 h-3.5" /> {t('qa_system_info')}:</span>
            {question.system_metadata.kernel_version && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{t('qa_kernel')}: {question.system_metadata.kernel_version}</span>
            )}
            {question.system_metadata.gpu_vendor && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t('qa_gpu')}: {question.system_metadata.gpu_vendor}</span>
            )}
            {question.system_metadata.cpu_vendor && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{t('qa_cpu')}: {question.system_metadata.cpu_vendor}</span>
            )}
            {question.system_metadata.desktop_environment && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{t('qa_desktop_env')}: {question.system_metadata.desktop_environment}</span>
            )}
            {question.system_metadata.init_system && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{t('qa_init_system')}: {question.system_metadata.init_system}</span>
            )}
          </div>
        )}

        {/* Language Fallback Notice */}
        {lang === 'en' && !question.title_en && !question.body_markdown_en && (
          <div data-testid="language-fallback-notice" className="flex items-center gap-2 mb-4 p-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 text-xs font-mono text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {t('content_fallback_notice')}
          </div>
        )}

        <div className="flex gap-4">
          <div className="shrink-0 pt-1">
            <VoteButtons score={question.vote_score} userVote={question.user_vote || 0} onVote={handleVoteQuestion} />
          </div>
          <div className="flex-1 min-w-0">
            <MarkdownRenderer content={(lang === 'en' && question.body_markdown_en) ? question.body_markdown_en : question.body_markdown} />
          </div>
        </div>

        {user && (
          <div className="flex gap-2 mt-3 ml-12">
            <button onClick={() => setShowReport({ type: 'question', id: question.id })} className="text-xs text-muted-foreground hover:text-amber-400 flex items-center gap-1 transition-colors">
              <Flag className="w-3 h-3" /> {t('report_user')}
            </button>
            {(user.role === 'admin' || user.role === 'moderator') && (
              <button
                data-testid="delete-question-btn"
                onClick={async () => {
                  if (!window.confirm(t('mod_delete_content') + '?')) return;
                  try {
                    await axios.delete(`${API}/mod/questions/${question.id}`, { headers: authHeaders });
                    navigate('/questions');
                  } catch (err) { console.error(err); }
                }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> {t('mod_delete_content')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Answers */}
      <div className="mb-10">
        <h2 className="text-xl font-bold tracking-tight mb-6">
          {answers.length} {t('qa_answers')}
        </h2>

        <div className="space-y-6">
          {answers.map(answer => (
            <div key={answer.id} data-testid={`answer-${answer.id}`} className={`p-5 rounded-lg border ${answer.accepted ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/50 bg-card'}`}>
              {answer.accepted && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono mb-3">
                  <CheckCircle className="w-4 h-4" /> {t('qa_accepted_answer')}
                </div>
              )}
              <div className="flex gap-4">
                <div className="shrink-0">
                  <VoteButtons score={answer.vote_score} userVote={answer.user_vote || 0} onVote={(v) => handleVoteAnswer(answer.id, v)} />
                  {user && (user.id === question.author_id || user.role === 'admin' || user.role === 'moderator') && (
                    <button
                      data-testid={`accept-answer-${answer.id}`}
                      onClick={() => handleAcceptAnswer(answer.id)}
                      className={`mt-2 w-full flex items-center justify-center p-1.5 rounded transition-colors ${
                        answer.accepted ? 'text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/5'
                      }`}
                      title={t('qa_accept_answer')}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <MarkdownRenderer content={answer.body_markdown} />
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
                    <Link to={`/user/${answer.author_username}`} className="text-xs font-mono text-[#1793D1] hover:underline flex items-center gap-1">
                      <UserAvatar username={answer.author_username} size={18} />
                      {answer.author_username}
                    </Link>
                    <span className="text-xs font-mono text-muted-foreground">{new Date(answer.created_at).toLocaleDateString()}</span>
                    {user && (user.role === 'admin' || user.role === 'moderator') && (
                      <button
                        data-testid={`delete-answer-${answer.id}`}
                        onClick={async () => {
                          if (!window.confirm(t('mod_delete_content') + '?')) return;
                          try {
                            await axios.delete(`${API}/mod/answers/${answer.id}`, { headers: authHeaders });
                            setAnswers(prev => prev.filter(a => a.id !== answer.id));
                          } catch (err) { console.error(err); }
                        }}
                        className="ml-auto text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Answer form */}
      {user ? (
        <div className="rounded-lg border border-border/50 bg-card p-6">
          <h3 className="text-lg font-bold mb-4">{t('qa_your_answer')}</h3>
          <form onSubmit={handleSubmitAnswer}>
            {answerError && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-3">{answerError}</div>
            )}
            <textarea
              data-testid="answer-input"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder={t('qa_answer_placeholder')}
              rows={6}
              className="w-full px-4 py-3 rounded-md border border-input bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1] resize-y mb-4"
              required
            />
            <button
              data-testid="submit-answer-btn"
              type="submit"
              disabled={!newAnswer.trim() || submitting}
              className="h-10 px-6 rounded-sm bg-[#1793D1] text-white font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 active:scale-95"
            >
              {submitting ? t('qa_posting') : t('qa_submit_answer')}
            </button>
          </form>
        </div>
      ) : (
        <div className="p-6 rounded-lg border border-border/50 bg-card text-center text-muted-foreground">
          <Link to="/login" className="text-[#1793D1] hover:underline">{t('nav_login')}</Link> {t('qa_login_to_answer')}
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <ReportModal
          targetType={showReport.type}
          targetId={showReport.id}
          onClose={() => setShowReport(null)}
        />
      )}
    </div>
  );
}
