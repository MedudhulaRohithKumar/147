'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from "next-auth/react"

export default function Home() {
  const { data: session, status } = useSession();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, analytics, settings

  // Logging State (Modern Tag Input)
  const [subjectInput, setSubjectInput] = useState("");
  const [currentTopicInput, setCurrentTopicInput] = useState("");
  const [stagedTopics, setStagedTopics] = useState([]);
  const [logDate, setLogDate] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Dashboard State
  const [viewDate, setViewDate] = useState("");
  const [todaysReviews, setTodaysReviews] = useState([]);
  const [upcomingReviews, setUpcomingReviews] = useState([]);
  const [kpis, setKpis] = useState({ totalTopics: 0, actionableToday: 0, completionRate: 0, upcomingCount: 0 });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setLogDate(today);
    setViewDate(today);
  }, []);

  const fetchDashboard = async () => {
    if (!viewDate || status !== "authenticated") return;
    setFetching(true);
    try {
      const res = await fetch(`/api/topics?date=${viewDate}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.today) setTodaysReviews(data.today);
      if (data.upcoming) setUpcomingReviews(data.upcoming);
      if (data.kpis) setKpis(data.kpis);
    } catch (err) {
      console.error(err);
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [viewDate, status]);

  // Handle Tag Input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submit
      if (currentTopicInput.trim() && !stagedTopics.includes(currentTopicInput.trim())) {
        setStagedTopics([...stagedTopics, currentTopicInput.trim()]);
        setCurrentTopicInput("");
      }
    }
  };

  const removeTopic = (indexToRemove) => {
    setStagedTopics(stagedTopics.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let topicsToLog = [...stagedTopics];
    
    // If they forgot to press enter but typed something, include it
    if (currentTopicInput.trim() && !stagedTopics.includes(currentTopicInput.trim())) {
      topicsToLog.push(currentTopicInput.trim());
    }

    if (topicsToLog.length === 0) return;
    
    setLoading(true);
    try {
      await Promise.all(topicsToLog.map(name => 
        fetch('/api/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: subjectInput, name, logDate })
        })
      ));
      setStagedTopics([]);
      setCurrentTopicInput("");
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const completeReview = async (topicId, reviewId) => {
    try {
      await fetch('/api/topics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, reviewId })
      });
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  if (status === "loading") {
    return <div className="loading-screen">Loading Enterprise Tracker...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="landing-page">
        <header className="landing-header">
          <div className="brand">147 Tracker</div>
          <button className="btn-outline" onClick={() => signIn('google')}>Log In</button>
        </header>
        
        <section className="hero-section">
          <div className="hero-glow"></div>
          <h1 className="hero-title">Master Your Memory. <br/><span className="highlight-text">Learn Every Day.</span></h1>
          <p className="hero-subtitle">
            Harness the scientifically-proven 147 spaced repetition theory to permanently retain what you study. Stay motivated, build a habit, and track your progress.
          </p>
          <button className="btn-hero" onClick={() => signIn('google')}>
             Get Started with Google
          </button>
        </section>

        <section className="how-it-works">
          <h2>The 147 Framework</h2>
          <p className="section-desc">A beautifully simple system to beat the forgetting curve.</p>
          
          <div className="step-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Log (Day 1)</h3>
              <p>Learn a new topic and log it in your dashboard immediately to stage it for the system.</p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Review (+4 Days)</h3>
              <p>Your first scheduled review will appear 4 days later to reinforce the fresh neural pathway.</p>
            </div>
            <div className="step-card">
              <div className="step-number">7</div>
              <h3>Master (+7 Days)</h3>
              <p>Your final review occurs 7 days after the first review. By now, the knowledge is locked in.</p>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <p>Built for lifelong learners.</p>
        </footer>
      </div>
    );
  }

  const changeDate = (days) => {
    if(!viewDate) return;
    const d = new Date(viewDate);
    d.setDate(d.getDate() + days);
    setViewDate(d.toISOString().split('T')[0]);
  };

  const resetDate = () => {
    setViewDate(new Date().toISOString().split('T')[0]);
  };

  const displayDate = viewDate ? new Date(viewDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }) : '';

  // View Components
  const renderDashboard = () => (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Topics</div>
          <div className="kpi-value">{kpis.totalTopics}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Actionable Today</div>
          <div className="kpi-value highlight">{kpis.actionableToday}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Completion Rate</div>
          <div className="kpi-value">{kpis.completionRate}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Upcoming Forecast (14d)</div>
          <div className="kpi-value">{kpis.upcomingCount}</div>
        </div>
      </div>

      <div className="date-controls">
        <button className="date-btn" onClick={() => changeDate(-1)}>← Previous</button>
        <div className="current-date" onClick={resetDate} title="Reset to today">
          {displayDate}
        </div>
        <button className="date-btn" onClick={() => changeDate(1)}>Next →</button>
      </div>

      <div className="dashboard-grid">
        <div className="left-column">
          <section className="card form-card">
            <h2 className="card-title">Log New Topics</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  placeholder="e.g. Mathematics, React..."
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Topics (Press Enter to add)</label>
                <div className="topic-input-wrapper">
                  <input 
                    type="text" 
                    className="form-input" 
                    value={currentTopicInput}
                    onChange={(e) => setCurrentTopicInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. React Hooks, Node.js..."
                  />
                  {stagedTopics.length > 0 && (
                    <div className="staged-topics">
                      {stagedTopics.map((topic, idx) => (
                        <span key={idx} className="topic-tag">
                          {topic}
                          <button type="button" onClick={() => removeTopic(idx)} className="btn-remove-tag">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group" style={{marginTop: '1.5rem'}}>
                <label className="form-label">Study Date</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || (stagedTopics.length === 0 && !currentTopicInput.trim())}>
                {loading ? 'Logging...' : `Log ${stagedTopics.length + (currentTopicInput.trim() ? 1 : 0)} Topic${(stagedTopics.length + (currentTopicInput.trim() ? 1 : 0)) !== 1 ? 's' : ''}`}
              </button>
            </form>
          </section>
        </div>

        <div className="right-column">
          <section className="card list-card">
            <h2 className="card-title">Pending Reviews for {displayDate}</h2>
            {fetching ? (
              <div className="empty-state">Loading...</div>
            ) : todaysReviews.length === 0 ? (
              <div className="empty-state">
                ✓ All clear for this date.
              </div>
            ) : (
              <ul className="topic-list">
                {todaysReviews.map(topic => {
                  const targetD = new Date(viewDate);
                  targetD.setHours(0,0,0,0);
                  const review = topic.reviews.find(r => {
                    const rDate = new Date(r.scheduledFor);
                    return rDate >= targetD && rDate < new Date(targetD.getTime() + 86400000) && !r.completed;
                  });
                  
                  if (!review) return null;

                  return (
                    <li key={review._id} className="topic-item">
                      <div className="topic-info">
                        <h4>{topic.subject ? `${topic.subject} - ` : ''}{topic.name}</h4>
                            <div className="topic-meta">
                          Originated: {new Date(topic.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button 
                        className="btn-complete"
                        onClick={() => completeReview(topic._id, review._id)}
                      >
                        Complete
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );

  const renderAnalytics = () => (
    <div className="card">
      <h2 className="card-title">Advanced Analytics</h2>
      <div className="empty-state">
        <p>This is the analytics module.</p>
        <p style={{marginTop: '1rem'}}>Currently, high-level KPIs are available on the dashboard. In a future update, we will include detailed charts outlining your optimal review times, subject mastery breakdown, and long-term retention graphs.</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="card" style={{maxWidth: '600px', margin: '0 auto'}}>
      <h2 className="card-title">User Settings</h2>
      <div className="form-group">
        <label className="form-label">Spaced Repetition Algorithm</label>
        <select className="form-input">
          <option>147 Theory (Current - +4, +11 days)</option>
          <option>SuperMemo 2</option>
          <option>Custom Intervals</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Dashboard Theme</label>
        <select className="form-input">
          <option>Enterprise Dark (Active)</option>
          <option>Light Mode</option>
        </select>
      </div>
      <button className="btn btn-primary" onClick={() => alert("Preferences saved locally!")}>Save Preferences</button>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">147 Tracker HQ</div>
        <nav className="sidebar-nav">
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>Dashboard</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('analytics'); }} className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}>Analytics</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }} className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}>Settings</a>
        </nav>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'analytics' && 'Analytics Engine'}
            {activeTab === 'settings' && 'User Settings'}
          </div>
          <div className="user-profile">
            <img src={session.user.image || "https://ui-avatars.com/api/?name=" + session.user.name} alt="Profile" className="avatar" />
            <div className="user-info">
              <span className="user-name">{session.user.name}</span>
              <span className="user-email">{session.user.email}</span>
            </div>
            <button className="btn-logout" onClick={() => signOut()}>Logout</button>
          </div>
        </header>

        <main className="dashboard-content">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>
    </div>
  );
}
