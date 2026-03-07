import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TutorialList from "./pages/TutorialList";
import ArticleDetail from "./pages/ArticleDetail";
import ArticleEditor from "./pages/ArticleEditor";
import UserProfile from "./pages/UserProfile";
import SettingsPage from "./pages/Settings";
import ModerationDashboard from "./pages/ModerationDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BookmarksPage from "./pages/BookmarksPage";
import MyDraftsPage from "./pages/MyDraftsPage";
import QAListPage from "./pages/QAListPage";
import QADetailPage from "./pages/QADetailPage";
import AskQuestionPage from "./pages/AskQuestionPage";
import VersionHistoryPage from "./pages/VersionHistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ScriptLibraryPage from "./pages/ScriptLibraryPage";
import ScriptDetailPage from "./pages/ScriptDetailPage";
import CreateScriptPage from "./pages/CreateScriptPage";
import SearchPage from "./pages/SearchPage";
import CommunityStatsPage from "./pages/CommunityStatsPage";
import CollectionsPage from "./pages/CollectionsPage";
import CollectionDetailPage from "./pages/CollectionDetailPage";
import CollectionEditorPage from "./pages/CollectionEditorPage";
import PackageSearchPage from "./pages/PackageSearchPage";
import ContributorsPage from "./pages/ContributorsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ImprintPage from "./pages/ImprintPage";
import TermsPage from "./pages/TermsPage";
import CookieBanner from "./components/CookieBanner";
import SiteHead from "./components/SiteHead";
import { HelmetProvider } from "react-helmet-async";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function SeedTrigger() {
  useEffect(() => {
    axios.post(`${API}/seed`).catch(() => {});
  }, []);
  return null;
}

function AnimatedRoutes({ children }) {
  const location = useLocation();
  return <div key={location.pathname} className="page-enter">{children}</div>;
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Ambient background blobs */}
      <div className="ambient-bg" aria-hidden="true">
        <div className="ambient-blob ambient-blob--1" />
        <div className="ambient-blob ambient-blob--2" />
        <div className="ambient-blob ambient-blob--3" />
      </div>
      <Navbar />
      <SeedTrigger />
      <div className="flex-1">
        <AnimatedRoutes>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tutorials" element={<TutorialList />} />
          <Route path="/article/:slug" element={<ArticleDetail />} />
          <Route path="/questions" element={<QAListPage />} />
          <Route path="/questions/:questionId" element={<QADetailPage />} />
          <Route path="/questions/ask" element={<ProtectedRoute><AskQuestionPage /></ProtectedRoute>} />
          <Route path="/scripts" element={<ScriptLibraryPage />} />
          <Route path="/scripts/new" element={<ProtectedRoute><CreateScriptPage /></ProtectedRoute>} />
          <Route path="/scripts/:scriptId" element={<ScriptDetailPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/create" element={<ProtectedRoute><CollectionEditorPage /></ProtectedRoute>} />
          <Route path="/collections/:collectionId/edit" element={<ProtectedRoute><CollectionEditorPage /></ProtectedRoute>} />
          <Route path="/collections/:slug" element={<CollectionDetailPage />} />
          <Route path="/packages" element={<PackageSearchPage />} />
          <Route path="/contributors" element={<ContributorsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/stats" element={<CommunityStatsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/versions/:articleId" element={<VersionHistoryPage />} />
          <Route path="/editor" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
          <Route path="/editor/:articleId" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
          <Route path="/my-drafts" element={<ProtectedRoute><MyDraftsPage /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
          <Route path="/moderation" element={<ProtectedRoute><ModerationDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/user/:username" element={<UserProfile />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/imprint" element={<ImprintPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
        </AnimatedRoutes>
      </div>
      <Footer />
      <CookieBanner />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SiteHead />
            <AppRoutes />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
