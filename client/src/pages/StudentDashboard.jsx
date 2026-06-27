import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const joinRoom = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/rooms/join', { code: code.toUpperCase() });
      window.location.href = `/room/${res.data._id}`;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.logo}>EduMeet</h1>
        <div style={styles.headerRight}>
          <span style={styles.welcome}>👋 {user?.name}</span>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.iconWrapper}>🎓</div>
          <h2 style={styles.cardTitle}>Join a Class</h2>
          <p style={styles.subtitle}>Enter the room code given by your teacher</p>
          {error && <p style={styles.error}>{error}</p>}
          <div style={styles.joinRow}>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter room code e.g. 14BE46"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              maxLength={6}
            />
            <button style={styles.joinBtn} onClick={joinRoom} disabled={loading}>
              {loading ? 'Joining...' : 'Join →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: '#f0f2f5' },
  header: {
    background: 'white',
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  logo: { color: '#667eea', fontSize: '24px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  welcome: { fontSize: '15px', color: '#555' },
  logoutBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: 'white',
    color: '#555',
    fontSize: '14px'
  },
  content: {
    padding: '32px',
    maxWidth: '500px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 70px)'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    textAlign: 'center'
  },
  iconWrapper: { fontSize: '48px', marginBottom: '16px' },
  cardTitle: { fontSize: '22px', marginBottom: '8px', color: '#333' },
  subtitle: { fontSize: '14px', color: '#999', marginBottom: '24px' },
  joinRow: { display: 'flex', gap: '12px' },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    outline: 'none',
    letterSpacing: '2px',
    textAlign: 'center',
    fontWeight: '600'
  },
  joinBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600'
  },
  error: { color: 'red', fontSize: '14px', marginBottom: '12px' }
};

export default StudentDashboard;