import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [view, setView] = useState('search'); // 'search' or 'admin'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [qaPairs, setQaPairs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin state
  const [adminQuestion, setAdminQuestion] = useState('');
  const [adminAnswer, setAdminAnswer] = useState('');
  const [adminCategory, setAdminCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

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

  // Search & filter
  const filteredResults = qaPairs.filter((qa) => {
    const matchesQuery =
      qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qa.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || qa.category_id === parseInt(selectedCategory);
    return matchesQuery && matchesCategory;
  });

  // Admin: Add/Update Q&A
  const handleSaveQA = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (!adminQuestion.trim() || !adminAnswer.trim() || !adminCategory) {
      setAdminError('All fields are required');
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
            category_id: categoryId,
          });

        if (insertError) throw insertError;
        setAdminSuccess('Q&A added');
      }

      // Reset form and reload
      setAdminQuestion('');
      setAdminAnswer('');
      setAdminCategory('');
      setEditingId(null);
      await loadData();

      // Clear success message after 3 seconds
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
    setAdminCategory('');
    setAdminError('');
  };

  // Render
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Engineering Questions</h1>
          <div className="nav">
            <button
              className={`nav-btn ${view === 'search' ? 'active' : ''}`}
              onClick={() => setView('search')}
            >
              Search
            </button>
            <button
              className={`nav-btn ${view === 'admin' ? 'active' : ''}`}
              onClick={() => setView('admin')}
            >
              Manage
            </button>
          </div>
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
                    <h2>{qa.question}</h2>
                    <span className="category-badge">{qa.categories?.name}</span>
                  </div>
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
                  />
                </div>

                <div className="form-group">
                  <label>Answer</label>
                  <textarea
                    value={adminAnswer}
                    onChange={(e) => setAdminAnswer(e.target.value)}
                    placeholder="Type the answer here..."
                    rows="6"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={adminCategory}
                    onChange={(e) => setAdminCategory(e.target.value)}
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

              {loading && <div className="loading">Loading...</div>}

              <div className="qa-list">
                {qaPairs.map((qa) => (
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
                    <p className="qa-list-answer">{qa.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
