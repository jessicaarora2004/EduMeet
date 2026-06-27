import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms/my-rooms');
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms');
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const createRoom = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/rooms/create', { title });
      setTitle('');
      fetchRooms();
    } catch (err) {
      setError('Failed to create room');
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
        {/* Create Room */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Create a New Class</h2>
          {error && <p style={styles.error}>{error}</p>}
          <div style={styles.createRow}>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter class title e.g. Math Class 101"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createRoom()}
            />
            <button style={styles.createBtn} onClick={createRoom} disabled={loading}>
              {loading ? 'Creating...' : '+ Create'}
            </button>
          </div>
        </div>

        {/* My Rooms */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>My Classes</h2>
          {rooms.length === 0 ? (
            <p style={styles.empty}>No classes yet. Create one above!</p>
          ) : (
            <div style={styles.roomGrid}>
              {rooms.map((room) => (
                <div key={room._id} style={styles.roomCard}>
                  <div style={styles.roomHeader}>
                    <h3 style={styles.roomTitle}>{room.title}</h3>
                    <span style={room.isActive ? styles.activeBadge : styles.inactiveBadge}>
                      {room.isActive ? 'Active' : 'Ended'}
                    </span>
                  </div>
                  <div style={styles.roomCode}>
                    Room Code: <strong>{room.code}</strong>
                  </div>
                  <div style={styles.roomMeta}>
                    {room.students.length} student{room.students.length !== 1 ? 's' : ''} joined
                  </div>
                  <button
                    style={styles.joinBtn}
                    onClick={() => window.location.href = `/room/${room._id}`}
                  >
                    Enter Class →
                  </button>
                </div>
              ))}
            </div>
          )}
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
  content: { padding: '32px', maxWidth: '900px', margin: '0 auto' },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  cardTitle: { fontSize: '18px', marginBottom: '16px', color: '#333' },
  createRow: { display: 'flex', gap: '12px' },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '15px',
    outline: 'none'
  },
  createBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600'
  },
  error: { color: 'red', fontSize: '14px', marginBottom: '12px' },
  empty: { color: '#999', textAlign: 'center', padding: '32px 0' },
  roomGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' },
  roomCard: {
    border: '1px solid #eee',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  roomHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  roomTitle: { fontSize: '16px', color: '#333' },
  activeBadge: {
    background: '#e8f5e9',
    color: '#2e7d32',
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '12px'
  },
  inactiveBadge: {
    background: '#fafafa',
    color: '#999',
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '12px'
  },
  roomCode: { fontSize: '14px', color: '#666' },
  roomMeta: { fontSize: '13px', color: '#999' },
  joinBtn: {
    marginTop: '8px',
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    background: '#f0f2f5',
    color: '#667eea',
    fontWeight: '600',
    fontSize: '14px'
  }
};

export default TeacherDashboard;