"""Pydantic models and badge definitions."""
from pydantic import BaseModel, Field
from typing import List, Optional


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6)
    email: Optional[str] = None
    honeypot: Optional[str] = None
    form_loaded_at: Optional[int] = None


class UserLogin(BaseModel):
    username: str
    password: str
    totp_code: Optional[str] = None


class UserProfileUpdate(BaseModel):
    bio: Optional[str] = None
    email: Optional[str] = None
    notification_prefs: Optional[dict] = None
    social_links: Optional[dict] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class ChangeUsernameRequest(BaseModel):
    new_username: str = Field(min_length=3, max_length=30)
    password: str


class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str


class DataExportRequest(BaseModel):
    password: str


class TOTPVerify(BaseModel):
    code: str


class ArticleCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    content_markdown: str = Field(min_length=10)
    category: str = "general"
    difficulty: str = "beginner"
    tags: List[str] = []
    summary: Optional[str] = None
    status: Optional[str] = "draft"
    language: str = "de"
    title_en: Optional[str] = None
    content_markdown_en: Optional[str] = None
    summary_en: Optional[str] = None
    forkable: bool = True


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content_markdown: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    summary: Optional[str] = None
    editor_comment: Optional[str] = None
    referenced_scripts: Optional[List[str]] = None
    language: Optional[str] = None
    title_en: Optional[str] = None
    content_markdown_en: Optional[str] = None
    summary_en: Optional[str] = None
    forkable: Optional[bool] = None
    status: Optional[str] = None


class CollaboratorAdd(BaseModel):
    username: str
    can_edit: bool = True
    can_publish: bool = False
    can_invite: bool = False
    can_delete: bool = False


class CollaboratorUpdate(BaseModel):
    can_edit: bool = True
    can_publish: bool = False
    can_invite: bool = False
    can_delete: bool = False


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    parent_id: Optional[str] = None


class VoteCreate(BaseModel):
    value: int = Field(ge=-1, le=1)


class ModerationAction(BaseModel):
    action: str = Field(pattern="^(approve|reject|request_changes)$")
    reason: Optional[str] = None


class UserRoleUpdate(BaseModel):
    role: str = Field(pattern="^(user|moderator|admin)$")


class UserBanAction(BaseModel):
    banned: bool
    reason: Optional[str] = None


class QuestionCreate(BaseModel):
    title: str = Field(min_length=5, max_length=300)
    body_markdown: str = Field(min_length=10)
    tags: List[str] = []
    language: str = "de"
    title_en: Optional[str] = None
    body_markdown_en: Optional[str] = None
    # System metadata
    kernel_version: Optional[str] = None
    gpu_vendor: Optional[str] = None
    cpu_vendor: Optional[str] = None
    desktop_environment: Optional[str] = None
    init_system: Optional[str] = None


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    body_markdown: Optional[str] = None
    tags: Optional[List[str]] = None
    language: Optional[str] = None
    title_en: Optional[str] = None
    body_markdown_en: Optional[str] = None
    # System metadata
    kernel_version: Optional[str] = None
    gpu_vendor: Optional[str] = None
    cpu_vendor: Optional[str] = None
    desktop_environment: Optional[str] = None
    init_system: Optional[str] = None


class AnswerCreate(BaseModel):
    body_markdown: str = Field(min_length=5)


class ReportCreate(BaseModel):
    target_type: str
    target_id: str
    reason: str = Field(min_length=3, max_length=1000)
    category: str = "other"


class ScriptCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=2000)
    code: str = Field(min_length=5)
    language: str = "bash"
    category: str = "utility"
    tags: List[str] = []
    content_language: str = "de"
    title_en: Optional[str] = None
    description_en: Optional[str] = None
    forkable: bool = True


class ScriptUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    editor_comment: Optional[str] = None
    content_language: Optional[str] = None
    title_en: Optional[str] = None
    description_en: Optional[str] = None
    forkable: Optional[bool] = None


# Badge definitions
BADGE_DEFINITIONS = {
    "first_article": {"en": "First Article", "de": "Erster Artikel", "condition": "Publish your first article", "icon": "book-open"},
    "first_comment": {"en": "First Comment", "de": "Erster Kommentar", "condition": "Post your first comment", "icon": "message-square"},
    "first_question": {"en": "First Question", "de": "Erste Frage", "condition": "Ask your first question", "icon": "help-circle"},
    "first_answer": {"en": "First Answer", "de": "Erste Antwort", "condition": "Post your first answer", "icon": "check-circle"},
    "helpful_10": {"en": "Helpful x10", "de": "Hilfreich x10", "condition": "Receive 10 upvotes on your content", "icon": "thumbs-up"},
    "helpful_50": {"en": "Helpful x50", "de": "Hilfreich x50", "condition": "Receive 50 upvotes", "icon": "award"},
    "prolific_writer": {"en": "Prolific Writer", "de": "Vielseitiger Autor", "condition": "Publish 5 articles", "icon": "pen-tool"},
    "trusted_voice": {"en": "Trusted Voice", "de": "Vertrauenswürdige Stimme", "condition": "Reach Trust Level 3", "icon": "shield"},
    "veteran": {"en": "Veteran", "de": "Veteran", "condition": "Reach Trust Level 4", "icon": "star"},
    "reviewer": {"en": "Reviewer", "de": "Reviewer", "condition": "Review 5 articles as moderator", "icon": "eye"},
    "bug_reporter": {"en": "Bug Reporter", "de": "Bug Reporter", "condition": "Report 5 issues", "icon": "bug"},
    "accepted_answer": {"en": "Accepted Answer", "de": "Akzeptierte Antwort", "condition": "Have an answer accepted", "icon": "check"},
    "script_of_the_day": {"en": "Script of the Day", "de": "Skript des Tages", "condition": "Your script was featured as Script of the Day", "icon": "trophy"},
    "arch_btw": {"en": "I use Arch btw", "de": "Ich benutze Arch btw", "condition": "???", "icon": "sparkles"},
    "pioneer": {"en": "ArchHub Pioneer", "de": "ArchHub Pionier", "condition": "Among the first 50 active contributors who helped build ArchHub", "condition_de": "Einer der ersten 50 aktiven Beitragenden, die den Aufbau von ArchHub ermoeglicht haben", "icon": "rocket", "rarity": "legendary"},
    "bug_hunter": {"en": "Bug Hunter", "de": "Bug Hunter", "condition": "Report 3 confirmed bugs", "condition_de": "Melde 3 bestaetigte Bugs", "icon": "bug", "rarity": "rare"},
    "elite_bug_hunter": {"en": "Elite Bug Hunter", "de": "Elite Bug Hunter", "condition": "Report 10 confirmed bugs", "condition_de": "Melde 10 bestaetigte Bugs", "icon": "shield-check", "rarity": "epic"},
}
