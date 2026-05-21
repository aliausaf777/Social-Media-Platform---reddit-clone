import { useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"

const BASE = "http://127.0.0.1:8000"

/* ─── helpers ─────────────────────────────────────── */
const PALETTE = [
  "#f97316","#3b82f6","#22c55e","#a855f7",
  "#eab308","#ec4899","#14b8a6","#ef4444",
]
function authorColor(name = "") {
  let h = 0
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % PALETTE.length
  return PALETTE[h]
}
function initials(name = "") { return String(name || "??").slice(0, 2).toUpperCase() }
function fmtNum(n) {
  const num = Number(n) || 0
  if (num >= 1000) return (num / 1000).toFixed(1) + "k"
  return String(num)
}
function timeAgo(d) {
  if (!d) return ""
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return "just now"
  if (s < 3600) return Math.floor(s / 60) + "m ago"
  if (s < 86400) return Math.floor(s / 3600) + "h ago"
  if (s < 604800) return Math.floor(s / 86400) + "d ago"
  return new Date(d).toLocaleDateString()
}
function cls(...args) { return args.filter(Boolean).join(" ") }

/* ─── sub-components ──────────────────────────────── */
function Avatar({ name, size = 32 }) {
  const bg = authorColor(name)
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size < 28 ? 10 : 13, fontWeight: 700, color: "#fff", userSelect: "none" }}>
      {initials(name)}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
      <div style={{ width: 28, height: 28, border: "2.5px solid #333", borderTopColor: "#f97316",
        borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  )
}

function Toast({ message }) {
  if (!message) return null
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "#1e1e21", border: "1px solid rgba(255,255,255,0.12)", color: "#f0efe8",
      padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 500,
      zIndex: 9999, pointerEvents: "none", animation: "fadeUp 0.2s ease", whiteSpace: "nowrap",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
      {message}
    </div>
  )
}

/* ─── Input / Textarea shared style ──────────────── */
const inputCls = "w-full bg-[#0a0a0b] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
const btnPrimary = "px-4 py-2 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer select-none"
const btnSecondary = "px-4 py-2 bg-transparent hover:bg-zinc-800 active:scale-95 text-zinc-300 text-sm font-semibold rounded-xl border border-white/[0.08] transition-all cursor-pointer select-none"

/* ─── MAIN APP ────────────────────────────────────── */
export default function App() {
  /* data */
  const [posts, setPosts] = useState([])
  const [scores, setScores] = useState({})
  const [voteTypes, setVoteTypes] = useState({})   // track upvote/downvote per post
  const [comments, setComments] = useState({})
  const [commentLoading, setCommentLoading] = useState({})

  /* ui */
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [openComments, setOpenComments] = useState(new Set())
  const [expandedPosts, setExpandedPosts] = useState(new Set())
  const [commentInputs, setCommentInputs] = useState({})
  const [toast, setToast] = useState("")
  const toastTimer = useRef(null)

  /* compose */
  const [composeOpen, setComposeOpen] = useState(false)
  const [postTitle, setPostTitle] = useState("")
  const [postContent, setPostContent] = useState("")
  const [posting, setPosting] = useState(false)

  /* auth */
  const [authMode, setAuthMode] = useState("login")   // "login" | "signup"
  const [authOpen, setAuthOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [token, setToken] = useState(() => localStorage.getItem("token") || "")
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("username") || "")
  const [userId, setUserId] = useState(() => localStorage.getItem("userId") || "")

  /* sort / filter */
  const [activeTab, setActiveTab] = useState("hot")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeComm, setActiveComm] = useState(0)   // community_id filter, 0 = all

  /* ─── toast helper ───────────────────────────────── */
  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(""), 2600)
  }, [])

  /* ─── auth header ────────────────────────────────── */
  const authCfg = useCallback(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token])

  /* ─── fetch all posts + scores + comments ─────────── */
  const fetchPosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await axios.get(`${BASE}/posts/`)
      const list = Array.isArray(res.data) ? res.data : []
      setPosts(list)

      if (list.length > 0) {
        const [scoreResults, commentResults] = await Promise.all([
          Promise.allSettled(list.map(p => axios.get(`${BASE}/votes/post/${p.id}`))),
          Promise.allSettled(list.map(p => axios.get(`${BASE}/comments/post/${p.id}`))),
        ])
        const scoreMap = {}
        const commentMap = {}
        list.forEach((p, i) => {
          scoreMap[p.id] = scoreResults[i].status === "fulfilled"
            ? (scoreResults[i].value.data?.score ?? 0) : 0
          commentMap[p.id] = commentResults[i].status === "fulfilled"
            ? (Array.isArray(commentResults[i].value.data) ? commentResults[i].value.data : []) : []
        })
        setScores(scoreMap)
        setComments(commentMap)
      }
    } catch (e) {
      showToast("Could not reach server — is FastAPI running?")
    }
    setLoading(false)
    setRefreshing(false)
  }, [showToast])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  /* auto-refresh every 30 s */
  useEffect(() => {
    const id = setInterval(() => fetchPosts(true), 30000)
    return () => clearInterval(id)
  }, [fetchPosts])

  /* ─── fetch comments for one post ───────────────── */
  const fetchComments = useCallback(async (postId) => {
    setCommentLoading(prev => ({ ...prev, [postId]: true }))
    try {
      const res = await axios.get(`${BASE}/comments/post/${postId}`)
      setComments(prev => ({ ...prev, [postId]: Array.isArray(res.data) ? res.data : [] }))
    } catch { /* silent */ }
    setCommentLoading(prev => ({ ...prev, [postId]: false }))
  }, [])

  /* ─── auth ───────────────────────────────────────── */
  const signup = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      showToast("Fill in all fields"); return
    }
    setAuthLoading(true)
    try {
      const res = await axios.post(`${BASE}/auth/signup`, { username: username.trim(), email: email.trim(), password })
      const t = res.data.access_token
      const uid = res.data.user_id || res.data.id || ""
      localStorage.setItem("token", t)
      localStorage.setItem("username", username.trim())
      localStorage.setItem("userId", String(uid))
      setToken(t); setCurrentUser(username.trim()); setUserId(String(uid))
      setAuthOpen(false); resetAuthFields()
      showToast("Welcome, " + username.trim() + "! 🎉")
    } catch (e) {
      showToast(e?.response?.data?.detail || "Signup failed — try a different username/email")
    }
    setAuthLoading(false)
  }

  const login = async () => {
    if (!email.trim() || !password.trim()) { showToast("Fill in email and password"); return }
    setAuthLoading(true)
    try {
      const res = await axios.post(`${BASE}/auth/login`, { email: email.trim(), password })
      const t = res.data.access_token
      const uname = res.data.username || username.trim() || email.split("@")[0]
      const uid = res.data.user_id || res.data.id || ""
      localStorage.setItem("token", t)
      localStorage.setItem("username", uname)
      localStorage.setItem("userId", String(uid))
      setToken(t); setCurrentUser(uname); setUserId(String(uid))
      setAuthOpen(false); resetAuthFields()
      showToast("Welcome back, " + uname + " ✓")
    } catch (e) {
      showToast(e?.response?.data?.detail || "Login failed — check your credentials")
    }
    setAuthLoading(false)
  }

  const logout = () => {
    ["token","username","userId"].forEach(k => localStorage.removeItem(k))
    setToken(""); setCurrentUser(""); setUserId("")
    setVoteTypes({})
    showToast("Signed out")
  }

  const resetAuthFields = () => { setUsername(""); setEmail(""); setPassword("") }

  const handleAuthKey = (e) => { if (e.key === "Enter") authMode === "login" ? login() : signup() }

  /* ─── create post ─────────────────────────────────── */
  const createPost = async () => {
    if (!token) { showToast("Sign in to post"); setAuthOpen(true); return }
    if (!postTitle.trim()) { showToast("Title is required"); return }
    setPosting(true)
    try {
      await axios.post(`${BASE}/posts/`, {
        title: postTitle.trim(),
        content: postContent.trim(),
        community_id: activeComm || 1
      }, authCfg())
      setPostTitle(""); setPostContent(""); setComposeOpen(false)
      showToast("Post submitted ✓")
      await fetchPosts(true)
    } catch (e) {
      showToast(e?.response?.data?.detail || "Failed to create post")
    }
    setPosting(false)
  }

  /* ─── vote ────────────────────────────────────────── */
  const vote = async (postId, voteType) => {
    if (!token) { showToast("Sign in to vote"); setAuthOpen(true); return }
    const current = voteTypes[postId]
    const isSame = current === voteType

    // optimistic update
    setVoteTypes(prev => ({ ...prev, [postId]: isSame ? null : voteType }))
    setScores(prev => {
      const cur = prev[postId] || 0
      let delta = 0
      if (isSame) delta = voteType === "upvote" ? -1 : 1
      else if (current === "upvote") delta = -2   // switching from up to down
      else if (current === "downvote") delta = 2   // switching from down to up
      else delta = voteType === "upvote" ? 1 : -1
      return { ...prev, [postId]: cur + delta }
    })

    try {
      await axios.post(`${BASE}/votes/`, { vote_type: voteType, post_id: postId }, authCfg())
    } catch {
      // revert on failure
      setVoteTypes(prev => ({ ...prev, [postId]: current }))
      await fetchPosts(true)
      showToast("Vote failed — try again")
    }
  }

  /* ─── comment ─────────────────────────────────────── */
  const addComment = async (postId) => {
    if (!token) { showToast("Sign in to comment"); setAuthOpen(true); return }
    const text = (commentInputs[postId] || "").trim()
    if (!text) { showToast("Comment can't be empty"); return }

    // optimistic
    const optimistic = { id: `opt-${Date.now()}`, content: text, post_id: postId, author_id: userId || currentUser }
    setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), optimistic] }))
    setCommentInputs(prev => ({ ...prev, [postId]: "" }))

    try {
      await axios.post(`${BASE}/comments/`, { content: text, post_id: postId }, authCfg())
      await fetchComments(postId)   // replace optimistic with real data
    } catch (e) {
      // revert
      setComments(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== optimistic.id) }))
      setCommentInputs(prev => ({ ...prev, [postId]: text }))
      showToast(e?.response?.data?.detail || "Failed to post comment")
    }
  }

  /* ─── toggle comment section ─────────────────────── */
  const toggleComments = (postId) => {
    setOpenComments(prev => {
      const next = new Set(prev)
      if (next.has(postId)) {
        next.delete(postId)
      } else {
        next.add(postId)
        if (!comments[postId]) fetchComments(postId)
      }
      return next
    })
  }

  /* ─── toggle post expand ─────────────────────────── */
  const toggleExpand = (postId) => {
    setExpandedPosts(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      return next
    })
  }

  /* ─── sort + filter ──────────────────────────────── */
  const sortedPosts = [...posts]
    .filter(p => {
      if (activeComm && p.community_id !== activeComm) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      const sa = scores[a.id] || 0, sb = scores[b.id] || 0
      const ca = (comments[a.id] || []).length, cb = (comments[b.id] || []).length
      if (activeTab === "hot") return sb - sa
      if (activeTab === "new") return new Date(b.created_at) - new Date(a.created_at)
      if (activeTab === "top") return (sb + cb) - (sa + ca)
      return (sb / (ca + 1)) - (sa / (cb + 1))   // rising
    })

  /* ─── communities ─────────────────────────────────── */
  const communities = [
    { id: 0, name: "All", icon: "🌐" },
    { id: 1, name: "r/python", icon: "🐍" },
    { id: 2, name: "r/programming", icon: "💻" },
    { id: 3, name: "r/webdev", icon: "🎨" },
    { id: 4, name: "r/MachineLearning", icon: "🤖" },
    { id: 5, name: "r/javascript", icon: "⚡" },
  ]

  const tabs = [
    { id: "hot", label: "🔥 Hot" },
    { id: "new", label: "✨ New" },
    { id: "top", label: "📈 Top" },
    { id: "rising", label: "🚀 Rising" },
  ]

  const totalComments = Object.values(comments).reduce((a, c) => a + c.length, 0)
  const totalVotes = Object.values(scores).reduce((a, s) => a + Math.max(0, Number(s) || 0), 0)

  /* ─── render ─────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", color: "#f0efe8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #0d0d0f; }
        .font-display { font-family: 'Syne', sans-serif; }
        input, textarea, button { font-family: inherit; }
        input:focus, textarea:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        .post-card { animation: fadeUp 0.28s ease both; }
        .slide-in { animation: slideIn 0.2s ease both; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2e; border-radius: 3px; }
        .vote-btn:hover { transform: scale(1.15); }
        .action-btn:hover { background: rgba(255,255,255,0.05); }
        .community-btn:hover { background: rgba(255,255,255,0.04); }
        .post-card:hover { border-color: rgba(249,115,22,0.18) !important; }
        textarea { resize: vertical; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(13,13,15,0.92)",
        backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(255,255,255,0.07)",
        height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1.5rem" }}>

        {/* logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "#f97316", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "Syne, sans-serif" }}>R</div>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>Readit</span>
          {refreshing && (
            <div style={{ width: 14, height: 14, border: "2px solid #333", borderTopColor: "#f97316",
              borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          )}
        </div>

        {/* search */}
        <div style={{ flex: 1, maxWidth: 380, margin: "0 1.5rem" }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search posts…"
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, padding: "7px 14px", fontSize: 13, color: "#d4d4d8",
              transition: "border-color 0.15s" }}
            onFocus={e => e.target.style.borderColor = "#f97316"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
          />
        </div>

        {/* right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {currentUser ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar name={currentUser} size={28} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "#d4d4d8", maxWidth: 100,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUser}
                </span>
              </div>
              <button onClick={logout} style={{ padding: "6px 12px", background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, fontSize: 12,
                color: "#71717a", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.target.style.background="#1e1e21"; e.target.style.color="#d4d4d8" }}
                onMouseLeave={e => { e.target.style.background="transparent"; e.target.style.color="#71717a" }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setAuthMode("login"); setAuthOpen(v => !v) }}
                style={{ padding: "6px 14px", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
                  fontSize: 13, color: "#a1a1aa", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.target.style.background="#1e1e21"; e.target.style.color="#f0efe8" }}
                onMouseLeave={e => { e.target.style.background="transparent"; e.target.style.color="#a1a1aa" }}>
                Log in
              </button>
              <button onClick={() => { setAuthMode("signup"); setAuthOpen(v => !v) }}
                style={{ padding: "6px 14px", background: "#f97316", border: "none",
                  borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => e.target.style.background="#fb923c"}
                onMouseLeave={e => e.target.style.background="#f97316"}>
                Sign up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── AUTH MODAL ── */}
      {authOpen && !currentUser && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setAuthOpen(false) }}>
          <div className="slide-in" style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: "1.75rem", width: "100%", maxWidth: 400, margin: "0 1rem" }}>

            {/* mode tabs */}
            <div style={{ display: "flex", background: "#0d0d0f", borderRadius: 12, padding: 4, marginBottom: "1.5rem" }}>
              {["login","signup"].map(m => (
                <button key={m} onClick={() => setAuthMode(m)}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 13, fontWeight: 500,
                    cursor: "pointer", border: "none", transition: "all 0.15s",
                    background: authMode === m ? "#1e1e21" : "transparent",
                    color: authMode === m ? "#f0efe8" : "#71717a" }}>
                  {m === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {authMode === "signup" && (
                <div>
                  <label style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Username</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={handleAuthKey}
                    placeholder="your_username" autoFocus
                    className={inputCls} />
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleAuthKey}
                  placeholder="you@example.com" autoFocus={authMode === "login"}
                  className={inputCls} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleAuthKey}
                  placeholder="••••••••"
                  className={inputCls} />
              </div>
              <button onClick={authMode === "login" ? login : signup} disabled={authLoading}
                style={{ width: "100%", padding: "11px 0", background: authLoading ? "#7c3a1e" : "#f97316",
                  border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#fff",
                  cursor: authLoading ? "not-allowed" : "pointer", transition: "all 0.15s", marginTop: 4 }}>
                {authLoading ? "Please wait…" : authMode === "login" ? "Log in" : "Create account"}
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: "#52525b" }}>
                {authMode === "login" ? "No account? " : "Already have an account? "}
                <button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                  style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                  {authMode === "login" ? "Sign up" : "Log in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── THREE-COLUMN LAYOUT ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem",
        display: "grid", gridTemplateColumns: "210px 1fr 250px", gap: "1.25rem",
        alignItems: "start" }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{ position: "sticky", top: 68 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
            color: "#52525b", marginBottom: 10 }}>Communities</p>
          {communities.map(c => (
            <button key={c.id} onClick={() => setActiveComm(c.id)} className="community-btn"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 11, marginBottom: 3, cursor: "pointer",
                border: activeComm === c.id ? "1px solid rgba(249,115,22,0.28)" : "1px solid transparent",
                background: activeComm === c.id ? "rgba(249,115,22,0.08)" : "transparent",
                transition: "all 0.15s", textAlign: "left" }}>
              <span style={{ width: 28, height: 28, background: "#1e1e21", borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                {c.icon}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: activeComm === c.id ? "#f0efe8" : "#a1a1aa" }}>
                {c.name}
              </span>
            </button>
          ))}

          {/* divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />

          {/* quick links */}
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#52525b", marginBottom: 10 }}>Quick links</p>
          {["Help","Rules","Moderators"].map(l => (
            <button key={l} className="community-btn"
              style={{ width: "100%", display: "flex", alignItems: "center", padding: "7px 10px",
                borderRadius: 9, marginBottom: 2, cursor: "pointer", border: "none",
                background: "transparent", color: "#71717a", fontSize: 13, transition: "all 0.15s", textAlign: "left" }}>
              {l}
            </button>
          ))}
        </aside>

        {/* ── MAIN FEED ── */}
        <main style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* COMPOSE CARD */}
          <div style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 18, padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {currentUser
                ? <Avatar name={currentUser} size={36} />
                : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e1e21",
                    border: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#52525b" }}>+</div>
              }
              {!composeOpen ? (
                <button onClick={() => { if (!token) { showToast("Sign in to post"); setAuthOpen(true); return } setComposeOpen(true) }}
                  style={{ flex: 1, background: "#0a0a0b", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 11, padding: "9px 14px", fontSize: 14, color: "#52525b",
                    textAlign: "left", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.target.style.borderColor="rgba(255,255,255,0.15)"}
                  onMouseLeave={e => e.target.style.borderColor="rgba(255,255,255,0.07)"}>
                  What's on your mind?
                </button>
              ) : (
                <span style={{ fontWeight: 600, fontSize: 14, color: "#d4d4d8" }}>New post</span>
              )}
              <button onClick={createPost} disabled={posting}
                style={{ flexShrink: 0, padding: "8px 16px", background: posting ? "#7c3a1e" : "#f97316",
                  border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff",
                  cursor: posting ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                {posting ? "Posting…" : "Post"}
              </button>
            </div>

            {composeOpen && (
              <div className="slide-in" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Title *</label>
                  <input value={postTitle} onChange={e => setPostTitle(e.target.value)}
                    placeholder="An interesting title…"
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && createPost()}
                    className={inputCls} autoFocus />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Content</label>
                  <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                    rows={4} placeholder="Share something worth reading…"
                    className={inputCls} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => { setComposeOpen(false); setPostTitle(""); setPostContent("") }}
                    className={btnSecondary}>Cancel</button>
                  <button onClick={createPost} disabled={posting} className={btnPrimary}
                    style={{ opacity: posting ? 0.6 : 1 }}>
                    {posting ? "Posting…" : "Submit post"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SORT TABS */}
          <div style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 13, padding: 5, display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ flex: 1, padding: "7px 0", borderRadius: 9, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", border: activeTab === t.id ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
                  background: activeTab === t.id ? "#1e1e21" : "transparent",
                  color: activeTab === t.id ? "#f0efe8" : "#71717a", transition: "all 0.15s" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* SEARCH INDICATOR */}
          {searchQuery.trim() && (
            <div style={{ fontSize: 13, color: "#71717a", padding: "2px 4px" }}>
              {sortedPosts.length} result{sortedPosts.length !== 1 ? "s" : ""} for "{searchQuery}"
              <button onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer",
                  fontSize: 12, marginLeft: 10 }}>Clear</button>
            </div>
          )}

          {/* POSTS */}
          {loading ? <Spinner /> : sortedPosts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#52525b", fontSize: 14 }}>
              {searchQuery ? "No posts match your search." : "No posts yet — be the first!"}
            </div>
          ) : sortedPosts.map((post, i) => {
            const voteType = voteTypes[post.id]
            const isOpen = openComments.has(post.id)
            const isExpanded = expandedPosts.has(post.id)
            const postComments = comments[post.id] || []
            const score = scores[post.id] || 0
            const isLong = (post.content || "").length > 280

            return (
              <div key={post.id} className="post-card"
                style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18, overflow: "hidden", transition: "border-color 0.2s",
                  animationDelay: `${Math.min(i, 5) * 50}ms` }}>
                <div style={{ display: "flex" }}>

                  {/* VOTE COLUMN */}
                  <div style={{ width: 50, flexShrink: 0, background: "rgba(255,255,255,0.015)",
                    borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex",
                    flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 4 }}>
                    <button className="vote-btn" onClick={() => vote(post.id, "upvote")}
                      title="Upvote"
                      style={{ width: 30, height: 30, borderRadius: 8, border: "none",
                        background: voteType === "upvote" ? "#f97316" : "transparent",
                        color: voteType === "upvote" ? "#fff" : "#52525b",
                        cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center",
                        justifyContent: "center", transition: "all 0.15s" }}>▲</button>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12,
                      color: voteType === "upvote" ? "#f97316" : voteType === "downvote" ? "#3b82f6" : "#d4d4d8" }}>
                      {fmtNum(score)}
                    </span>
                    <button className="vote-btn" onClick={() => vote(post.id, "downvote")}
                      title="Downvote"
                      style={{ width: 30, height: 30, borderRadius: 8, border: "none",
                        background: voteType === "downvote" ? "#3b82f6" : "transparent",
                        color: voteType === "downvote" ? "#fff" : "#52525b",
                        cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center",
                        justifyContent: "center", transition: "all 0.15s" }}>▼</button>
                  </div>

                  {/* POST BODY */}
                  <div style={{ flex: 1, padding: "14px 18px", minWidth: 0 }}>
                    {/* meta */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11,
                      color: "#71717a", marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "#d4d4d8", background: "rgba(249,115,22,0.1)",
                        border: "1px solid rgba(249,115,22,0.22)", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>
                        {communities.find(c => c.id === post.community_id)?.name || "r/general"}
                      </span>
                      <span>·</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Avatar name={`user_${post.author_id}`} size={18} />
                        <span>u/{post.author_id}</span>
                      </div>
                      <span>·</span>
                      <span title={new Date(post.created_at).toLocaleString()}>{timeAgo(post.created_at)}</span>
                    </div>

                    {/* title */}
                    <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16,
                      lineHeight: 1.35, marginBottom: 8, color: "#f0efe8", letterSpacing: "-0.2px" }}>
                      {post.title}
                    </h2>

                    {/* content */}
                    {post.content && (
                      <>
                        <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.65, marginBottom: 4,
                          ...(isLong && !isExpanded ? { display: "-webkit-box", WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical", overflow: "hidden" } : {}) }}>
                          {post.content}
                        </p>
                        {isLong && (
                          <button onClick={() => toggleExpand(post.id)}
                            style={{ background: "none", border: "none", color: "#f97316", fontSize: 12,
                              cursor: "pointer", padding: "2px 0", marginBottom: 6 }}>
                            {isExpanded ? "Show less" : "Read more"}
                          </button>
                        )}
                      </>
                    )}

                    {/* actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 8, flexWrap: "wrap" }}>
                      <button className="action-btn" onClick={() => toggleComments(post.id)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                          borderRadius: 8, border: "none", background: "transparent",
                          fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                          color: isOpen ? "#f97316" : "#71717a" }}>
                        💬 {postComments.length} {postComments.length === 1 ? "comment" : "comments"}
                      </button>
                      <button className="action-btn" onClick={() => {
                          navigator.clipboard?.writeText(window.location.href + "#post-" + post.id)
                          showToast("Link copied!")
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                          borderRadius: 8, border: "none", background: "transparent",
                          fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", color: "#71717a" }}>
                        ↗ Share
                      </button>
                      <button className="action-btn" onClick={() => showToast("Saved!")}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                          borderRadius: 8, border: "none", background: "transparent",
                          fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", color: "#71717a" }}>
                        🔖 Save
                      </button>
                    </div>

                    {/* COMMENTS SECTION */}
                    {isOpen && (
                      <div className="slide-in" style={{ marginTop: 14, paddingTop: 14,
                        borderTop: "1px solid rgba(255,255,255,0.06)" }}>

                        {commentLoading[post.id] ? (
                          <div style={{ padding: "1rem 0" }}><Spinner /></div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                            {postComments.length === 0 && (
                              <p style={{ fontSize: 13, color: "#52525b", padding: "4px 0" }}>No comments yet — start the conversation!</p>
                            )}
                            {postComments.map(c => (
                              <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <Avatar name={String(c.author_id)} size={26} />
                                <div style={{ flex: 1, background: "#0a0a0b",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                  borderRadius: 12, padding: "8px 12px" }}>
                                  <div style={{ marginBottom: 3 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#d4d4d8", marginRight: 8 }}>
                                      u/{c.author_id}
                                    </span>
                                    <span style={{ fontSize: 10, color: "#52525b" }}>
                                      {timeAgo(c.created_at)}
                                    </span>
                                  </div>
                                  <p style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.55 }}>{c.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* comment input */}
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {currentUser
                            ? <Avatar name={currentUser} size={26} />
                            : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1e1e21", flexShrink: 0 }} />
                          }
                          <input
                            value={commentInputs[post.id] || ""}
                            onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(post.id) } }}
                            placeholder={currentUser ? "Add a comment… (Enter to submit)" : "Sign in to comment"}
                            disabled={!currentUser}
                            style={{ flex: 1, background: "#0a0a0b", border: "1px solid rgba(255,255,255,0.07)",
                              borderRadius: 11, padding: "8px 12px", fontSize: 13, color: "#d4d4d8",
                              transition: "border-color 0.15s", opacity: currentUser ? 1 : 0.5 }}
                            onFocus={e => e.target.style.borderColor="#f97316"}
                            onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.07)"}
                          />
                          <button onClick={() => addComment(post.id)} disabled={!currentUser}
                            style={{ padding: "8px 14px", background: "#f97316", border: "none",
                              borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#fff",
                              cursor: currentUser ? "pointer" : "not-allowed",
                              opacity: currentUser ? 1 : 0.5, transition: "all 0.15s", flexShrink: 0 }}>
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* LOAD MORE hint */}
          {!loading && sortedPosts.length > 0 && (
            <button onClick={() => fetchPosts(true)} disabled={refreshing}
              style={{ padding: "12px", background: "transparent",
                border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14,
                fontSize: 13, color: "#71717a", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.target.style.background="#161618"; e.target.style.color="#d4d4d8" }}
              onMouseLeave={e => { e.target.style.background="transparent"; e.target.style.color="#71717a" }}>
              {refreshing ? "Refreshing…" : "↺ Refresh feed"}
            </button>
          )}
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside style={{ position: "sticky", top: 68, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* COMMUNITY STATS */}
          <div style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "1.25rem" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#52525b", marginBottom: 14 }}>Community stats</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              {[["Posts", posts.length], ["Comments", totalComments], ["Votes", totalVotes]].map(([label, val]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: "#f0efe8" }}>
                    {fmtNum(val)}
                  </p>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "#52525b", marginTop: 2 }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ height: 3, background: "#1e1e21", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: "72%", height: "100%", background: "#f97316", borderRadius: 4,
                transition: "width 1s ease" }} />
            </div>
            <p style={{ fontSize: 11, color: "#52525b", marginTop: 6 }}>72% more active than average</p>
          </div>

          {/* TOP POSTS */}
          <div style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "1.25rem" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#52525b", marginBottom: 14 }}>Top posts</p>
            {[...posts].sort((a,b) => (scores[b.id]||0)-(scores[a.id]||0)).slice(0,5).map((post, i) => (
              <div key={post.id} onClick={() => toggleComments(post.id)}
                style={{ display: "flex", gap: 12, paddingTop: 10, paddingBottom: 10,
                  borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.opacity="0.7"}
                onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18,
                  color: "#3f3f46", lineHeight: 1, marginTop: 2, minWidth: 22 }}>
                  {String(i+1).padStart(2,"0")}
                </span>
                <div style={{ flex: 1 }}>
                  <p className="line-clamp-2" style={{ fontSize: 12, fontWeight: 500, color: "#d4d4d8", lineHeight: 1.4, marginBottom: 3 }}>
                    {post.title}
                  </p>
                  <p style={{ fontSize: 10, color: "#52525b" }}>
                    {fmtNum(scores[post.id] || 0)} pts · {(comments[post.id] || []).length} comments
                  </p>
                </div>
              </div>
            ))}
            {posts.length === 0 && <p style={{ fontSize: 13, color: "#52525b" }}>No posts yet</p>}
          </div>

          {/* ABOUT */}
          <div style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "1.25rem" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#52525b", marginBottom: 10 }}>About Readit</p>
            <p style={{ fontSize: 13, color: "#71717a", lineHeight: 1.6, marginBottom: 12 }}>
              A community for sharing ideas, asking questions, and connecting with people who care about the same things you do.
            </p>
            {!currentUser && (
              <button onClick={() => { setAuthMode("signup"); setAuthOpen(true) }}
                style={{ width: "100%", padding: "10px 0", background: "#f97316",
                  border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  color: "#fff", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => e.target.style.background="#fb923c"}
                onMouseLeave={e => e.target.style.background="#f97316"}>
                Join Readit
              </button>
            )}
          </div>
        </aside>

      </div>

      <Toast message={toast} />
    </div>
  )
}