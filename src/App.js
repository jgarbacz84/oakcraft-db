import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [view, setView] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [qaPairs, setQaPairs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  // Admin state
  const [adminQuestion, setAdminQuestion] = useState('');
  const [adminAnswer, setAdminAnswer] = useState('');
  const [adminImage, setAdminImage] = useState(null);
  const [adminCategory, setAdminCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Menu state
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (catError) throw catError;
      setCategories(catData || []);

      // Fetch Q&A pairs
      const { data: qaData, error: qaError } = await supabase
        .from('qa_pairs')
        .select('*, categories(name)')
        .order('created_at', { ascending: false });
      if (qaError) throw qaError;
      setQaPairs(qaData || []);
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

// Convert image to base64
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

  // Handle paste events
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

  // Search & filter
  const filteredResults = qaPairs.filter((qa) => {
    const matchesQuery =
      qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qa.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || qa.category_id === parseInt(selectedCategory);
    return matchesQuery && matchesCategory;
  });

  // Admin search & filter
  const filteredAdminResults = qaPairs.filter((qa) => {
    return (
      qa.question.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      qa.answer.toLowerCase().includes(adminSearchQuery.toLowerCase())
    );
  });

  // Admin: Add/Update Q&A
  const handleSaveQA = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (!adminQuestion.trim() || !adminAnswer.trim() || !adminCategory) {
      setAdminError('Question, answer, and category are required');
      return;
    }

    try {
      const categoryId = parseInt(adminCategory);

      if (editingId) {
        // Update
        const { error: updateError } = await supabase
          .from('qa_pairs')
          .update({
            question: adminQuestion,
            answer: adminAnswer,
            image: adminImage,
            category_id: categoryId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        setAdminSuccess('Q&A updated');
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('qa_pairs')
          .insert({
            question: adminQuestion,
            answer: adminAnswer,
            image: adminImage,
            category_id: categoryId,
          });

        if (insertError) throw insertError;
        setAdminSuccess('Q&A added');
      }

      // Reset form and reload
      setAdminQuestion('');
      setAdminAnswer('');
      setAdminImage(null);
      setAdminCategory('');
      setEditingId(null);
      await loadData();

      setTimeout(() => setAdminSuccess(''), 3000);
    } catch (err) {
      setAdminError(`Error: ${err.message}`);
    }
  };

  // Admin: Edit (populate form)
  const handleEdit = (qa) => {
    setEditingId(qa.id);
    setAdminQuestion(qa.question);
    setAdminAnswer(qa.answer);
    setAdminImage(qa.image || null);
    setAdminCategory(qa.category_id?.toString() || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin: Delete
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

  // Admin: Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setAdminQuestion('');
    setAdminAnswer('');
    setAdminImage(null);
    setAdminCategory('');
    setAdminError('');
  };

  // Handle admin access
  const handleManageClick = () => {
    if (!adminAuthenticated) {
      setShowPasswordPrompt(true);
    } else {
      setView('admin');
      setMenuOpen(false);
    }
  };

  // Render
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
                      <span className="category-badge">{qa.categories?.name}</span>
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
          </div>
        )}

        {view === 'admin' && (
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
                  <label>Category</label>
                  <select
                    value={adminCategory}
                    onChange={(e) => setAdminCategory(e.target.value)}
                    className="form-select-large"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
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
                        <span className="category-badge">{qa.categories?.name}</span>
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
