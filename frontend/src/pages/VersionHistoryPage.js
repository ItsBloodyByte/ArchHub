import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { diffLines } from 'diff';
import { ArrowLeft, Clock, GitBranch, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import TerminalHeader from '../components/TerminalHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VersionHistoryPage() {
  const { articleId } = useParams();
  const { authHeaders } = useAuth();
  const { t } = useLanguage();
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareVersion, setCompareVersion] = useState(null);
  const [versionContent, setVersionContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [diffResult, setDiffResult] = useState(null);

  useEffect(() => { loadVersions(); }, [articleId]);

  const loadVersions = async () => {
    try {
      const res = await axios.get(`${API}/articles/${articleId}/versions`, { headers: authHeaders });
      setVersions(res.data.versions);
      if (res.data.versions.length > 0) {
        const latest = res.data.versions[0];
        loadVersion(latest.version_number);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadVersion = async (versionNumber) => {
    if (versionContent[versionNumber]) {
      setSelectedVersion(versionNumber);
      return;
    }
    try {
      const res = await axios.get(`${API}/articles/${articleId}/versions/${versionNumber}`, { headers: authHeaders });
      setVersionContent(prev => ({ ...prev, [versionNumber]: res.data }));
      setSelectedVersion(versionNumber);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompare = async (fromVer, toVer) => {
    if (!versionContent[fromVer]) {
      const res = await axios.get(`${API}/articles/${articleId}/versions/${fromVer}`, { headers: authHeaders });
      setVersionContent(prev => ({ ...prev, [fromVer]: res.data }));
    }
    if (!versionContent[toVer]) {
      const res = await axios.get(`${API}/articles/${articleId}/versions/${toVer}`, { headers: authHeaders });
      setVersionContent(prev => ({ ...prev, [toVer]: res.data }));
    }
    
    const from = versionContent[fromVer]?.content_markdown || '';
    const to = versionContent[toVer]?.content_markdown || '';
    const diff = diffLines(from, to);
    setDiffResult(diff);
    setCompareVersion(fromVer);
  };

  useEffect(() => {
    if (selectedVersion && versions.length > 1) {
      const prevVersion = selectedVersion > 1 ? selectedVersion - 1 : null;
      if (prevVersion && versionContent[selectedVersion] && versionContent[prevVersion]) {
        const diff = diffLines(
          versionContent[prevVersion]?.content_markdown || '',
          versionContent[selectedVersion]?.content_markdown || ''
        );
        setDiffResult(diff);
        setCompareVersion(prevVersion);
      }
    }
  }, [selectedVersion, versionContent]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div data-testid="version-history-page" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/tutorials" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('article_back')}
      </Link>

      <TerminalHeader command="git log --oneline" />
      <div className="flex items-center gap-3 mb-8">
        <GitBranch className="w-6 h-6 text-[#1793D1]" />
        <h1 className="text-2xl font-extrabold tracking-tighter">{t('version_history')}</h1>
        <span className="text-sm font-mono text-muted-foreground">({versions.length} Versionen)</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Version list sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-2">
            {versions.map(v => (
              <button
                key={v.version_number}
                data-testid={`version-${v.version_number}`}
                onClick={() => loadVersion(v.version_number)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedVersion === v.version_number
                    ? 'border-[#1793D1] bg-[#1793D1]/5'
                    : 'border-border/50 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-bold">v{v.version_number}</span>
                  <Clock className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {new Date(v.created_at).toLocaleString()}
                </p>
                {v.author_username && (
                  <p className="text-[10px] text-[#1793D1] font-mono mt-0.5">{v.author_username}</p>
                )}
                {v.editor_comment && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{v.editor_comment}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="lg:col-span-3">
          {selectedVersion && versionContent[selectedVersion] ? (
            <div>
              {/* Compare controls */}
              {versions.length > 1 && (
                <div className="flex items-center gap-2 mb-6 p-3 rounded-lg border border-border/50 bg-card">
                  <span className="text-sm font-medium">Vergleiche:</span>
                  <select
                    value={compareVersion || ''}
                    onChange={(e) => handleCompare(parseInt(e.target.value), selectedVersion)}
                    className="h-8 px-2 rounded border border-input bg-background text-xs font-mono focus:outline-none"
                  >
                    <option value="">Version wahlen...</option>
                    {versions.filter(v => v.version_number !== selectedVersion).map(v => (
                      <option key={v.version_number} value={v.version_number}>v{v.version_number}</option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">mit v{selectedVersion}</span>
                </div>
              )}

              {/* Diff view */}
              {diffResult ? (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="p-3 bg-muted/30 border-b border-border/50 text-xs font-mono text-muted-foreground">
                    Diff: v{compareVersion} → v{selectedVersion}
                  </div>
                  <div className="p-4 font-mono text-sm overflow-x-auto bg-[#0d0d1a]">
                    {diffResult.map((part, i) => (
                      <div
                        key={i}
                        className={`whitespace-pre-wrap ${
                          part.added
                            ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500 pl-2'
                            : part.removed
                            ? 'bg-red-500/10 text-red-300 border-l-2 border-red-500 pl-2 line-through opacity-70'
                            : 'text-foreground/60'
                        }`}
                      >
                        {part.value}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 bg-card p-6">
                  <MarkdownRenderer content={versionContent[selectedVersion].content_markdown} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              Wahle eine Version aus der Liste
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
