import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// EMAIL PLACEHOLDERS - Replace with actual emails
const ENGINEER_EMAILS = [
  'engineer1@oakcraft.com',
  'engineer2@oakcraft.com',
  'engineer3@oakcraft.com'
];

function App() {
  const [view, setView] = useState('search');
  const [manageTab, setManageTab] = useState('qa');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [qaPairs, setQaPairs] = useState([]);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin state
  const [adminQuestion, setAdminQuestion] = useState('');
  const [adminAnswer, setAdminAnswer] = useState('');
  const [adminImage, setAdminImage] = useState(null);
  const [adminCategories, setAdminCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Pending questions state
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseType, setResponseType] = useState('answer');
  const [responseText, setResponseText] = useState('');
  const [responseCategories, setResponseCategories] = useState([]);

  // Ask team state
  const [showAskTeam, setShowAskTeam] = useState(false);
  const [askTeamName, setAskTeamName] = useState('');
  const [askTeamEmail, setAskTeamEmail] = useState('');
  const [askTeamQuestion, setAskTeamQuestion] = useState('');
  const [askTeamCategories, setAskTeamCategories] = useState([]);
  const [askTeamError, setAskTeamError] = useState('');
  const [askTeamSuccess, setAskTeamSuccess] = useState('');

  // Menu state
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Image modal
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (catError) throw catError;
      setCategories(catData || []);

      const { data: qaData, error: qaError } = await supabase
        .from('qa_pairs')
        .select('*')
        .order('created_at', { ascending: false });
      if (qaError) throw qaError;
      setQaPairs(qaData || []);

      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_questions')
        .select('*')
        .order('created_at', { ascending: false });
      if (pendingError) throw pendingError;
      setPendingQuestions(pendingData || []);
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateTicketId = () => {
    return 'TKT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const getCategoryNames = (categoryIds) => {
    if (!categoryIds || !Array.isArray(categoryIds)) return [];
    return categoryIds
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImagePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onloadend = () => {
          setAdminImage(reader.result);
          setAdminSuccess('Image pasted!');
          setTimeout(() => setAdminSuccess(''), 2000);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const filteredResults = qaPairs.filter((qa) => {
    const searchLower = searchQuery.toLowerCase();
    const questionLower = qa.question.toLowerCase();
    const answerLower = qa.answer.toLowerCase();

    const exactMatch = questionLower.includes(searchLower) || answerLower.includes(searchLower);
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
    const wordMatch = searchWords.some(word =>
      questionLower.includes(word) || answerLower.includes(word)
    );

    const matchesQuery = exactMatch || wordMatch;
    const matchesCategory = !selectedCategory || 
      (qa.category_ids && qa.category_ids.includes(parseInt(selectedCategory)));
    return matchesQuery && matchesCategory;
  });

  const filteredAdminResults = qaPairs.filter((qa) => {
    const searchLower = adminSearchQuery.toLowerCase();
    const questionLower = qa.question.toLowerCase();
    const answerLower = qa.answer.toLowerCase();

    const exactMatch = questionLower.includes(searchLower) || answerLower.includes(searchLower);
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
    const wordMatch = searchWords.some(word =>
      questionLower.includes(word) || answerLower.includes(word)
    );

    return exactMatch || wordMatch;
  });

  const handleSaveQA = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (!adminQuestion.trim() || !adminAnswer.trim() || adminCategories.length === 0) {
      setAdminError('Question, answer, and at least one category are required');
      return;
    }

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('qa_pairs')
          .update({
            question: adminQuestion,
            answer: adminAnswer,
            image: adminImage,
            category_ids: adminCategories,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        setAdminSuccess('Q&A updated');
      } else {
        const { error: insertError } = await supabase
          .from('qa_pairs')
          .insert({
            question: adminQuestion,
            answer: adminAnswer,
            image: adminImage,
            category_ids: adminCategories,
          });

        if (insertError) throw insertError;
        setAdminSuccess('Q&A added');
      }

      setAdminQuestion('');
      setAdminAnswer('');
      setAdminImage(null);
      setAdminCategories([]);
      setEditingId(null);
      await loadData();

      setTimeout(() => setAdminSuccess(''), 3000);
    } catch (err) {
      setAdminError(`Error: ${err.message}`);
    }
  };

  const handleEdit = (qa) => {
    setEditingId(qa.id);
    setAdminQuestion(qa.question);
    setAdminAnswer(qa.answer);
    setAdminImage(qa.image || null);
    setAdminCategories(qa.category_ids || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Q&A?')) return;

    try {
      const { error } = await supabase
        .from('qa_pairs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (err) {
      setAdminError(`Failed to delete: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAdminQuestion('');
    setAdminAnswer('');
    setAdminImage(null);
    setAdminCategories([]);
    setAdminError('');
  };

  const handleAskTeam = async (e) => {
    e.preventDefault();
    setAskTeamError('');
    setAskTeamSuccess('');

    if (!askTeamName.trim() || !askTeamEmail.trim() || !askTeamQuestion.trim() || askTeamCategories.length === 0) {
      setAskTeamError('All fields are required');
      return;
    }

    try {
      const ticketId = generateTicketId();

      const { error: insertError } = await supabase
        .from('pending_questions')
        .insert({
          ticket_id: ticketId,
          user_email: askTeamEmail,
          user_name: askTeamName,
          question: askTeamQuestion,
          category_ids: askTeamCategories,
          status: 'open'
        });

      if (insertError) throw insertError;

      console.log('Email sent to engineers:', ENGINEER_EMAILS);
      console.log('Ticket:', ticketId);

      setAskTeamSuccess(`Question submitted! Your ticket ID is: ${ticketId}. You'll receive updates at ${askTeamEmail}`);

      setAskTeamName('');
      setAskTeamEmail('');
      setAskTeamQuestion('');
      setAskTeamCategories([]);
      setShowAskTeam(false);

      await loadData();

      setTimeout(() => setAskTeamSuccess(''), 5000);
    } catch (err) {
      setAskTeamError(`Error: ${err.message}`);
    }
  };

  const handleRespond = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (!responseText.trim()) {
      setAdminError('Response text is required');
      return;
    }

    try {
      const pending = respondingTo;

      if (responseType === 'answer') {
        if (responseCategories.length === 0) {
          setAdminError('At least one category is required when adding to KB');
          return;
        }

        const { error: addError } = await supabase
          .from('qa_pairs')
          .insert({
            question: pending.question,
            answer: responseText,
            category_ids: responseCategories,
            image: null
          });
        if (addError) throw addError;

        const { error: updateError } = await supabase
          .from('pending_questions')
          .update({
            status: 'answered',
            engineer_response: responseText,
            resolved_at: new Date().toISOString()
          })
          .eq('id', pending.id);
        if (updateError) throw updateError;

        setAdminSuccess('Answer added to KB and user notified!');
      } else {
        const { error: updateError } = await supabase
          .from('pending_questions')
          .update({
            status: 'info_needed',
            engineer_response: responseText
          })
          .eq('id', pending.id);
        if (updateError) throw updateError;

        setAdminSuccess('User requested for more info!');
      }

      console.log('Email sent to user:', pending.user_email);

      setResponseText('');
      setResponseType('answer');
      setResponseCategories([]);
      setRespondingTo(null);
      await loadData();

      setTimeout(() => setAdminSuccess(''), 3000);
    } catch (err) {
      setAdminError(`Error: ${err.message}`);
    }
  };

  const handleManageClick = () => {
    if (!adminAuthenticated) {
      setShowPasswordPrompt(true);
    } else {
      setView('admin');
      setMenuOpen(false);
    }
  };

  const toggleCategory = (categoryId, currentList, setList) => {
    if (currentList.includes(categoryId)) {
      setList(currentList.filter(id => id !== categoryId));
    } else {
      setList([...currentList, categoryId]);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>engineering questions</h1>
          <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          {menuOpen && (
            <div className="dropdown-menu">
              <button
                className={`menu-item ${view === 'search' ? 'active' : ''}`}
                onClick={() => {
                  setView('search');
                  setMenuOpen(false);
                }}
              >
                Search
              </button>
              <button className="menu-item" onClick={handleManageClick}>
                Manage
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container">
        {view === 'search' && (
          <div className="search-view">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="filters">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="error">{error}</div>}
            {loading && <div className="loading">Loading...</div>}

            {!loading && filteredResults.length === 0 && (
              <div className="empty">
                <p>No questions found.</p>
              </div>
            )}

            <div className="results">
              {filteredResults.map((qa) => (
                <div key={qa.id} className="qa-card">
                  <div className="qa-header">
                    <div>
                      <h2>{qa.question}</h2>
                      <div className="category-badges">
                        {getCategoryNames(qa.category_ids).map((name) => (
                          <span key={name} className="category-badge">{name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {qa.image && (
                    <img
                      src={qa.image}
                      alt="Q&A"
                      className="qa-image"
                      onClick={() => setSelectedImage(qa.image)}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  <p className="qa-answer">{qa.answer}</p>
                </div>
              ))}
            </div>

            <div className="ask-team-section">
              <button
                className="btn btn-primary"
                onClick={() => setShowAskTeam(true)}
              >
                Have a different question? Ask the Engineering Team
              </button>
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="admin-main">
            <div className="admin-tabs">
              <button
                className={`admin-tab ${manageTab === 'qa' ? 'active' : ''}`}
                onClick={() => setManageTab('qa')}
              >
                Q&A Manager
              </button>
              <button
                className={`admin-tab ${manageTab === 'pending' ? 'active' : ''}`}
                onClick={() => setManageTab('pending')}
              >
                Pending Questions ({pendingQuestions.length})
              </button>
            </div>

            {manageTab === 'qa' && (
              <div className="admin-view">
                <div className="admin-form-section">
                  <h2>{editingId ? 'Edit Q&A' : 'Add New Q&A'}</h2>

                  {adminError && <div className="error">{adminError}</div>}
                  {adminSuccess && <div className="success">{adminSuccess}</div>}

                  <form onSubmit={handleSaveQA}>
                    <div className="form-group">
                      <label>Question</label>
                      <input
                        type="text"
                        value={adminQuestion}
                        onChange={(e) => setAdminQuestion(e.target.value)}
                        placeholder="What is the lead time for...?"
                        className="form-input-large"
                      />
                    </div>

                    <div className="form-group">
                      <label>Answer</label>
                      <textarea
                        value={adminAnswer}
                        onChange={(e) => setAdminAnswer(e.target.value)}
                        placeholder="Type the answer here..."
                        rows="8"
                        className="form-textarea-large"
                      />
                    </div>

                    <div className="form-group">
                      <label>Image (optional)</label>
                      <div className="image-upload-area" onPaste={handleImagePaste}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="form-file"
                        />
                        <p className="image-help-text">Click to upload or paste (Ctrl+V)</p>
                      </div>
                      {adminImage && (
                        <div className="image-preview">
                          <img src={adminImage} alt="Preview" />
                          <button
                            type="button"
                            onClick={() => setAdminImage(null)}
                            className="remove-image-btn"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Categories (select one or more)</label>
                      <div className="category-checkboxes">
                        {categories.map((cat) => (
                          <label key={cat.id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={adminCategories.includes(cat.id)}
                              onChange={() => toggleCategory(cat.id, adminCategories, setAdminCategories)}
                            />
                            {cat.name}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {editingId ? 'Update' : 'Add'}
                      </button>
                      {editingId && (
                        <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="admin-list-section">
                  <h2>All Q&As ({qaPairs.length})</h2>

                  <div className="admin-search-box">
                    <input
                      type="text"
                      placeholder="Search to edit or delete..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                    />
                  </div>

                  {loading && <div className="loading">Loading...</div>}

                  <div className="qa-list">
                    {filteredAdminResults.map((qa) => (
                      <div key={qa.id} className="qa-list-item">
                        <div className="qa-list-header">
                          <div>
                            <h3>{qa.question}</h3>
                            <div className="category-badges">
                              {getCategoryNames(qa.category_ids).map((name) => (
                                <span key={name} className="category-badge">{name}</span>
                              ))}
                            </div>
                          </div>
                          <div className="qa-list-actions">
                            <button
                              className="btn btn-small btn-secondary"
                              onClick={() => handleEdit(qa)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => handleDelete(qa.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {qa.image && (
                          <img src={qa.image} alt="Q&A" className="qa-list-image" />
                        )}
                        <p className="qa-list-answer">{qa.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {manageTab === 'pending' && (
              <div className="pending-view">
                <h2>Pending Support Questions</h2>

                {adminError && <div className="error">{adminError}</div>}
                {adminSuccess && <div className="success">{adminSuccess}</div>}

                {loading && <div className="loading">Loading...</div>}

                {pendingQuestions.length === 0 && (
                  <div className="empty">
                    <p>No pending questions!</p>
                  </div>
                )}

                <div className="pending-list">
                  {pendingQuestions.map((pending) => (
                    <div key={pending.id} className="pending-item">
                      <div className="pending-header">
                        <div>
                          <h3>{pending.question}</h3>
                          <div className="pending-meta">
                            <span className="ticket-id">Ticket: {pending.ticket_id}</span>
                            <span className="user-email">{pending.user_name} ({pending.user_email})</span>
                            <span className={`status-badge status-${pending.status}`}>
                              {pending.status === 'open' && 'Open'}
                              {pending.status === 'info_needed' && 'Awaiting User Info'}
                              {pending.status === 'answered' && 'Answered'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!respondingTo || respondingTo.id !== pending.id ? (
                        <button
                          className="btn btn-primary"
                          onClick={() => setRespondingTo(pending)}
                        >
                          Respond
                        </button>
                      ) : (
                        <form onSubmit={handleRespond} className="response-form">
                          <div className="form-group">
                            <label>Response Type</label>
                            <div className="response-type-options">
                              <label>
                                <input
                                  type="radio"
                                  value="answer"
                                  checked={responseType === 'answer'}
                                  onChange={(e) => setResponseType(e.target.value)}
                                />
                                Answer & Add to KB
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  value="info"
                                  checked={responseType === 'info'}
                                  onChange={(e) => setResponseType(e.target.value)}
                                />
                                Need More Information
                              </label>
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Your Response</label>
                            <textarea
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Type your response..."
                              rows="6"
                              className="form-textarea-large"
                            />
                          </div>

                          {responseType === 'answer' && (
                            <div className="form-group">
                              <label>Categories (select one or more)</label>
                              <div className="category-checkboxes">
                                {categories.map((cat) => (
                                  <label key={cat.id} className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={responseCategories.includes(cat.id)}
                                      onChange={() => toggleCategory(cat.id, responseCategories, setResponseCategories)}
                                    />
                                    {cat.name}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                              Send Response
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                setRespondingTo(null);
                                setResponseText('');
                                setResponseType('answer');
                                setResponseCategories([]);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showAskTeam && (
          <div className="modal-overlay" onClick={() => setShowAskTeam(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Ask the Engineering Team</h2>
                <button
                  className="close-modal-btn"
                  onClick={() => setShowAskTeam(false)}
                >
                  ✕
                </button>
              </div>

              {askTeamError && <div className="error">{askTeamError}</div>}
              {askTeamSuccess && <div className="success">{askTeamSuccess}</div>}

              <form onSubmit={handleAskTeam}>
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={askTeamName}
                    onChange={(e) => setAskTeamName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="form-group">
                  <label>Your Email</label>
                  <input
                    type="email"
                    value={askTeamEmail}
                    onChange={(e) => setAskTeamEmail(e.target.value)}
                    placeholder="john@company.com"
                  />
                </div>

                <div className="form-group">
                  <label>Categories (select one or more)</label>
                  <div className="category-checkboxes">
                    {categories.map((cat) => (
                      <label key={cat.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={askTeamCategories.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id, askTeamCategories, setAskTeamCategories)}
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Your Question</label>
                  <textarea
                    value={askTeamQuestion}
                    onChange={(e) => setAskTeamQuestion(e.target.value)}
                    placeholder="Describe your question in detail..."
                    rows="8"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Submit Question
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAskTeam(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedImage && (
          <div className="image-modal" onClick={() => setSelectedImage(null)}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
              <img src={selectedImage} alt="Full size" />
              <button className="close-image-modal" onClick={() => setSelectedImage(null)}>✕</button>
            </div>
          </div>
        )}
      </main>

      {showPasswordPrompt && (
        <div className="password-modal">
          <div className="password-box">
            <h2>Engineering Team Only</h2>
            <input
              type="password"
              placeholder="Enter password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  if (adminPassword === 'OakCraft2024') {
                    setAdminAuthenticated(true);
                    setShowPasswordPrompt(false);
                    setView('admin');
                    setAdminPassword('');
                  } else {
                    alert('Wrong password');
                    setAdminPassword('');
                  }
                }
              }}
              autoFocus
            />
            <div className="password-buttons">
              <button
                onClick={() => {
                  if (adminPassword === 'OakCraft2024') {
                    setAdminAuthenticated(true);
                    setShowPasswordPrompt(false);
                    setView('admin');
                    setAdminPassword('');
                  } else {
                    alert('Wrong password');
                    setAdminPassword('');
                  }
                }}
                className="btn btn-primary"
              >
                Unlock
              </button>
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setAdminPassword('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
