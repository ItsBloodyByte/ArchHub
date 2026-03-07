import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, ChevronUp, ChevronDown, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UserAvatar from './UserAvatar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CommentSection({ articleId }) {
  const { user, authHeaders } = useAuth();
  const { t } = useLanguage();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [articleId]);

  const loadComments = async () => {
    try {
      const res = await axios.get(`${API}/articles/${articleId}/comments`, { headers: authHeaders });
      setComments(res.data.comments);
    } catch (err) {
      console.error('Failed to load comments', err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/articles/${articleId}/comments`, { content: newComment.trim() }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
    }
    setSubmitting(false);
  };

  const handleVote = async (commentId, value) => {
    if (!user) return;
    try {
      const res = await axios.post(`${API}/comments/${commentId}/vote`, { value }, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
      setComments(comments.map(c => c.id === commentId ? { ...c, ...res.data } : c));
    } catch (err) {
      console.error('Failed to vote', err);
    }
  };

  return (
    <div data-testid="comment-section" className="mt-10">
      <h3 className="text-xl font-bold tracking-tight flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-[#1793D1]" />
        {t('comment_title')} ({comments.length})
      </h3>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-8" data-testid="comment-form">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#1793D1]/20 border border-[#1793D1]/30 flex items-center justify-center shrink-0 mt-1">
              <span className="text-[#1793D1] font-mono text-xs font-bold">{user.username[0].toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <textarea
                data-testid="comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('comment_placeholder')}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1793D1]/50 focus:border-[#1793D1] resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  data-testid="comment-submit"
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-sm bg-[#1793D1] text-white text-sm font-medium hover:bg-[#126A9A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t('comment_submit')}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 rounded-md border border-border bg-muted/30 text-center">
          <p className="text-sm text-muted-foreground">{t('comment_login_prompt')}</p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t('misc_loading')}</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">{t('comment_empty')}</div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} data-testid={`comment-${comment.id}`} className="flex gap-3 p-4 rounded-lg border border-border/50 bg-card/50">
              {/* Vote */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button
                  onClick={() => handleVote(comment.id, comment.user_vote === 1 ? 0 : 1)}
                  className={`p-1 rounded transition-colors ${comment.user_vote === 1 ? 'text-[#1793D1]' : 'text-muted-foreground hover:text-[#1793D1]'}`}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold">{comment.vote_score}</span>
                <button
                  onClick={() => handleVote(comment.id, comment.user_vote === -1 ? 0 : -1)}
                  className={`p-1 rounded transition-colors ${comment.user_vote === -1 ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'}`}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <UserAvatar username={comment.author_username} size={20} />
                  <span className="text-sm font-mono font-medium text-[#1793D1]">{comment.author_username}</span>
                  <span className="text-xs font-mono text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
