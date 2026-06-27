import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { io } from 'socket.io-client';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

const Room = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [localTracks, setLocalTracks] = useState({ audio: null, video: null });
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [summary, setSummary] = useState('');
  const [homework, setHomework] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activePanel, setActivePanel] = useState('transcript');

  // Quiz states
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizActive, setQuizActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [scores, setScores] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
const [files, setFiles] = useState([]);
const [uploading, setUploading] = useState(false);

  const clientRef = useRef(null);
  const localVideoRef = useRef(null);
  const recognitionRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await api.get(`/rooms/${id}`);
        setRoom(res.data);
      } catch (err) {
        setError('Room not found');
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  useEffect(() => {
    if (!room) return;
    joinAgora();
    setupSocket();
    return () => {
      leaveAgora();
      socketRef.current?.disconnect();
    };
  }, [room]);

 const setupSocket = () => {
  const socket = io('http://localhost:5000');
  socketRef.current = socket;
  socket.emit('join-room', id);

  socket.on('quiz-started', ({ questions }) => {
    setQuizQuestions(questions);
    setQuizActive(true);
    setCurrentQuestion(0);
    setScore(0);
    setQuizDone(false);
    setSelectedAnswer(null);
    setAnswered(false);
    setActivePanel('quiz');
  });

  socket.on('score-update', ({ studentName, score, total }) => {
    setScores((prev) => {
      const exists = prev.find((s) => s.studentName === studentName);
      if (exists) {
        return prev.map((s) => s.studentName === studentName ? { studentName, score, total } : s);
      }
      return [...prev, { studentName, score, total }];
    });
    setActivePanel('scores');
  });

  socket.on('quiz-ended', () => {
    setQuizActive(false);
    setQuizDone(true);
  });

  socket.on('new-note', (note) => {
    setNotes((prev) => [...prev, note]);
  });

  socket.on('new-file', (file) => {
    setFiles((prev) => [...prev, file]);
  });
};

  const joinAgora = async () => {
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    client.on('user-published', async (remoteUser, mediaType) => {
      await client.subscribe(remoteUser, mediaType);
      if (mediaType === 'video') {
        setUsers((prev) => {
          if (prev.find((u) => u.uid === remoteUser.uid)) return prev;
          return [...prev, remoteUser];
        });
        setTimeout(() => {
          remoteUser.videoTrack?.play(`remote-${remoteUser.uid}`);
        }, 500);
      }
      if (mediaType === 'audio') {
        remoteUser.audioTrack?.play();
      }
    });

    client.on('user-unpublished', (remoteUser) => {
      setUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid));
    });

    client.on('user-left', (remoteUser) => {
      setUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid));
    });

    try {
      const tokenRes = await api.post('/agora/token', { channelName: id });
      const agoraToken = tokenRes.data.token;
      await client.join(APP_ID, id, agoraToken, null);
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      await client.publish([audioTrack, videoTrack]);
      videoTrack.play(localVideoRef.current);
      setLocalTracks({ audio: audioTrack, video: videoTrack });
      setJoined(true);
    } catch (err) {
      console.error('Agora error:', err);
      setError('Failed to join video call. Check camera/mic permissions.');
    }
  };

  const leaveAgora = async () => {
    stopTranscript();
    localTracks.audio?.close();
    localTracks.video?.close();
    await clientRef.current?.leave();
  };

  const startTranscript = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported. Use Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const newText = Array.from(event.results).map((r) => r[0].transcript).join(' ');
      setTranscript((prev) => prev + ' ' + newText);
    };
    recognition.onerror = (e) => console.error('Speech error:', e);
    recognition.start();
    recognitionRef.current = recognition;
    setIsTranscribing(true);
  };

  const stopTranscript = () => {
    recognitionRef.current?.stop();
    setIsTranscribing(false);
  };

  const generateSummary = async () => {
    if (!transcript.trim()) { alert('No transcript yet!'); return; }
    setAiLoading(true);
    try {
      const res = await api.post('/ai/summary', { transcript });
      setSummary(res.data.summary);
      setHomework(res.data.homework);
      setActivePanel('summary');
    } catch (err) {
      alert('Failed to generate summary');
    } finally {
      setAiLoading(false);
    }
  };

  const generateAndStartQuiz = async () => {
    if (!transcript.trim()) { alert('No transcript yet!'); return; }
    setQuizLoading(true);
    try {
      const res = await api.post('/ai/quiz', { transcript });
      const questions = res.data.questions;
      socketRef.current.emit('start-quiz', { roomId: id, questions });
      setQuizQuestions(questions);
      setQuizActive(true);
      setCurrentQuestion(0);
      setScore(0);
      setQuizDone(false);
      setSelectedAnswer(null);
      setAnswered(false);
      setActivePanel('quiz');
    } catch (err) {
      alert('Failed to generate quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswer = (index) => {
  if (answered || user.role === 'teacher') return;
  setSelectedAnswer(index);
  setAnswered(true);
  const correct = quizQuestions[currentQuestion].correctAnswer;
  const newScore = index === correct ? score + 1 : score;
  if (index === correct) setScore(newScore);

  setTimeout(() => {
    if (currentQuestion + 1 < quizQuestions.length) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      setQuizDone(true);
      setQuizActive(false);
      socketRef.current.emit('submit-score', {
        roomId: id,
        studentName: user.name,
        score: newScore,
        total: quizQuestions.length
      });
    }
  }, 1000);
};

  const endQuiz = () => {
    socketRef.current.emit('end-quiz', id);
    setQuizActive(false);
  };
  const getFileIcon = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
  if (['xlsx', 'xls'].includes(ext)) return '📊';
  if (['docx', 'doc'].includes(ext)) return '📝';
  if (['pptx', 'ppt'].includes(ext)) return '📊';
  return '📎';
};
  const sendNote = () => {
  if (!noteInput.trim()) return;
  const note = {
    author: user.name,
    role: user.role,
    content: noteInput,
    time: new Date().toLocaleTimeString()
  };
  socketRef.current.emit('send-note', { roomId: id, note });
  setNoteInput('');
};
const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const fileData = {
      ...res.data,
      author: user.name,
      role: user.role,
      time: new Date().toLocaleTimeString()
    };
    socketRef.current.emit('share-file', { roomId: id, file: fileData });
  } catch (err) {
    alert('Failed to upload file');
  } finally {
    setUploading(false);
  }
};

  const toggleMic = () => {
    if (localTracks.audio) {
      localTracks.audio.setEnabled(!micOn);
      setMicOn(!micOn);
    }
  };

  const toggleCam = () => {
    if (localTracks.video) {
      localTracks.video.setEnabled(!camOn);
      setCamOn(!camOn);
    }
  };

  const leaveRoom = async () => {
    await leaveAgora();
    navigate(user.role === 'teacher' ? '/teacher' : '/student');
  };

  const endRoom = async () => {
    try {
      await api.put(`/rooms/end/${id}`);
      await leaveAgora();
      navigate('/teacher');
    } catch (err) {
      console.error('Failed to end room');
    }
  };

  if (loading) return <div style={styles.center}>Loading room...</div>;
  if (error) return <div style={styles.center}>{error}</div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.roomTitle}>{room?.title}</h2>
          <span style={styles.roomCode}>Code: {room?.code}</span>
        </div>
        <div style={styles.headerRight}>
          {joined && <span style={styles.liveBadge}>🔴 Live</span>}
          {user.role === 'teacher' ? (
            <button style={styles.endBtn} onClick={endRoom}>End Class</button>
          ) : (
            <button style={styles.leaveBtn} onClick={leaveRoom}>Leave</button>
          )}
        </div>
      </div>

      <div style={styles.main}>
        {/* Left — Video */}
        <div style={styles.videoSection}>
          <div style={styles.videoGrid}>
            <div style={styles.videoCard}>
              <div ref={localVideoRef} style={styles.videoBox} />
              <div style={styles.videoLabel}>
                {user.name} (You) {!micOn && '🔇'} {!camOn && '📷'}
              </div>
            </div>
            {users.map((remoteUser) => (
              <div key={remoteUser.uid} style={styles.videoCard}>
                <div id={`remote-${remoteUser.uid}`} style={styles.videoBox} />
                <div style={styles.videoLabel}>Participant {remoteUser.uid}</div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <button style={micOn ? styles.controlBtn : styles.controlBtnOff} onClick={toggleMic}>
              {micOn ? '🎤 Mute' : '🔇 Unmute'}
            </button>
            <button style={camOn ? styles.controlBtn : styles.controlBtnOff} onClick={toggleCam}>
              {camOn ? '📷 Stop Video' : '📷 Start Video'}
            </button>
            {user.role === 'teacher' && (
              <>
                <button
                  style={isTranscribing ? styles.controlBtnOff : styles.controlBtn}
                  onClick={isTranscribing ? stopTranscript : startTranscript}
                >
                  {isTranscribing ? '⏹ Stop Transcript' : '🎙 Start Transcript'}
                </button>
                <button style={styles.controlBtnAI} onClick={generateSummary} disabled={aiLoading}>
                  {aiLoading ? '⏳ Generating...' : '✨ AI Summary'}
                </button>
                <button style={styles.controlBtnQuiz} onClick={generateAndStartQuiz} disabled={quizLoading}>
                  {quizLoading ? '⏳ Creating Quiz...' : '📝 Start Quiz'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right — Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.tabs}>
            {['transcript', 'summary', 'homework', 'quiz', 'scores', 'notes'].map((panel) => (
              <button
                key={panel}
                style={activePanel === panel ? styles.tabActive : styles.tab}
                onClick={() => setActivePanel(panel)}
              >
                {panel === 'transcript' && '📝'}
                {panel === 'summary' && '✨'}
                {panel === 'homework' && '📚'}
                {panel === 'quiz' && '❓'}
                {panel === 'scores' && '🏆'}
                {panel === 'notes' && '📝'}
              </button>
            ))}
          </div>

          <div style={styles.panelContent}>
            {/* Transcript Panel */}
            {activePanel === 'transcript' && (
              <div>
                <div style={styles.panelHeader}>
                  <span>Live Transcript</span>
                  {isTranscribing && <span style={styles.recordingDot}>● Recording</span>}
                </div>
                <div style={styles.transcriptBox}>
                  {transcript || <span style={styles.placeholder}>Transcript will appear here when recording starts...</span>}
                </div>
              </div>
            )}

            {/* Summary Panel */}
            {activePanel === 'summary' && (
              <div>
                <div style={styles.panelHeader}>Lecture Summary</div>
                <div style={styles.transcriptBox}>
                  {summary || <span style={styles.placeholder}>Generate a summary using the ✨ AI Summary button...</span>}
                </div>
              </div>
            )}

            {/* Homework Panel */}
            {activePanel === 'homework' && (
              <div>
                <div style={styles.panelHeader}>Homework</div>
                <div style={styles.transcriptBox}>
                  {homework || <span style={styles.placeholder}>Homework will be generated along with the summary...</span>}
                </div>
              </div>
            )}

            {/* Quiz Panel */}
            {activePanel === 'quiz' && (
              <div>
                <div style={styles.panelHeader}>
                  <span>Quiz</span>
                  {user.role === 'teacher' && quizActive && (
                    <button style={styles.endQuizBtn} onClick={endQuiz}>End Quiz</button>
                  )}
                </div>

                {!quizActive && !quizDone && (
                  <div style={styles.placeholder}>
                    {user.role === 'teacher'
                      ? 'Click 📝 Start Quiz to generate and launch a quiz from the transcript.'
                      : 'Waiting for teacher to start a quiz...'}
                  </div>
                )}

                {quizActive && quizQuestions.length > 0 && (
                  <div>
                    <div style={styles.quizProgress}>
                      Question {currentQuestion + 1} of {quizQuestions.length}
                    </div>
                    <div style={styles.quizQuestion}>
                      {quizQuestions[currentQuestion].question}
                    </div>
                    <div style={styles.optionsList}>
                      {quizQuestions[currentQuestion].options.map((option, i) => {
                        const correct = quizQuestions[currentQuestion].correctAnswer;
                        let bg = '#0f3460';
                        if (answered) {
                          if (i === correct) bg = '#2e7d32';
                          else if (i === selectedAnswer) bg = '#c62828';
                        }
                        return (
                          <button
                            key={i}
                            style={{ ...styles.optionBtn, background: bg }}
                            onClick={() => handleAnswer(i)}
                            disabled={answered}
                          >
                            {String.fromCharCode(65 + i)}. {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {quizDone && (
                  <div style={styles.quizDone}>
                    <div style={styles.quizDoneIcon}>🎉</div>
                    <div style={styles.quizDoneText}>Quiz Complete!</div>
                    <div style={styles.quizScore}>
                      Your Score: {score} / {quizQuestions.length}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scores Panel */}
            {activePanel === 'scores' && (
              <div>
                <div style={styles.panelHeader}>🏆 Leaderboard</div>
                {scores.length === 0 ? (
                  <div style={styles.placeholder}>No scores yet. Start a quiz to see results!</div>
                ) : (
                  [...scores]
                    .sort((a, b) => b.score - a.score)
                    .map((s, i) => (
                      <div key={i} style={styles.scoreRow}>
                        <span style={styles.scoreRank}>#{i + 1}</span>
                        <span style={styles.scoreName}>{s.studentName}</span>
                        <span style={styles.scoreValue}>{s.score}/{s.total}</span>
                      </div>
                    ))
                )}
              </div>
            )}
            {activePanel === 'notes' && (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
    <div style={styles.panelHeader}>📌 Notes & Files</div>

    {/* Note Input */}
    <div style={styles.noteInputRow}>
      <input
        style={styles.noteInput}
        type="text"
        placeholder="Write a note and press Enter..."
        value={noteInput}
        onChange={(e) => setNoteInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendNote()}
      />
      <button style={styles.noteSendBtn} onClick={sendNote}>📌 Pin</button>
    </div>

    {/* File Upload */}
    <div style={styles.fileUploadRow}>
      <label style={styles.fileUploadBtn}>
        {uploading ? '⏳ Uploading...' : '📎 Share File'}
        <input
          type="file"
          style={{ display: 'none' }}
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc,.pptx,.ppt"
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </label>
      <span style={styles.fileHint}>PDF, Word, Excel, PPT, Images (max 10MB)</span>
    </div>

    {/* Notes and Files Feed */}
    <div style={styles.notesList}>
      {notes.length === 0 && files.length === 0 ? (
        <div style={styles.placeholder}>No notes or files shared yet!</div>
      ) : (
        <>
          {notes.map((note, i) => (
            <div key={`note-${i}`} style={{
              ...styles.noteCard,
              borderLeft: note.role === 'teacher' ? '3px solid #667eea' : '3px solid #f5576c'
            }}>
              <div style={styles.noteHeader}>
                <span style={styles.noteAuthor}>
                  {note.role === 'teacher' ? '👨‍🏫' : '👨‍🎓'} {note.author}
                </span>
                <span style={styles.noteTime}>{note.time}</span>
              </div>
              <div style={styles.noteContent}>{note.content}</div>
            </div>
          ))}

          {files.map((file, i) => (
            <div key={`file-${i}`} style={styles.fileCard}>
              <div style={styles.noteHeader}>
                <span style={styles.noteAuthor}>
                  {file.role === 'teacher' ? '👨‍🏫' : '👨‍🎓'} {file.author}
                </span>
                <span style={styles.noteTime}>{file.time}</span>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                style={styles.fileLink}
              >
                {getFileIcon(file.originalName)} {file.originalName}
              </a>
            </div>
          ))}
        </>
      )}
    </div>
  </div>
)}
                     
                      {/* Notes Panel */}
            {activePanel === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={styles.panelHeader}>📌 Shared Notes</div>
                <div style={styles.notesList}>
                  {notes.length === 0 ? (
                    <div style={styles.placeholder}>No notes yet. Share something!</div>
                  ) : (
                    notes.map((note, i) => (
                      <div key={i} style={styles.noteCard}>
                        <div style={styles.noteHeader}>
                          <span style={styles.noteAuthor}>{note.author}</span>
                          <span style={styles.noteRole}>{note.role}</span>
                          <span style={styles.noteTime}>{note.time}</span>
                        </div>
                        <div style={styles.noteContent}>{note.content}</div>
                      </div>
                    ))
                  )}
                </div>
                <div style={styles.noteInputRow}>
                  <input
                    style={styles.noteInput}
                    type="text"
                    placeholder="Share a note..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendNote()}
                  />
                  <button style={styles.noteSendBtn} onClick={sendNote}>Send</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'white', background: '#1a1a2e' },
  header: { padding: '16px 24px', background: '#16213e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #0f3460' },
  roomTitle: { fontSize: '18px', color: 'white' },
  roomCode: { fontSize: '13px', color: '#aaa' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  liveBadge: { fontSize: '13px', background: '#ff000033', padding: '4px 12px', borderRadius: '20px' },
  endBtn: { padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#e53935', color: 'white', fontWeight: '600' },
  leaveBtn: { padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#555', color: 'white', fontWeight: '600' },
  main: { display: 'flex', flex: 1, height: 'calc(100vh - 65px)' },
  videoSection: { flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' },
  videoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', flex: 1 },
  videoCard: { borderRadius: '12px', overflow: 'hidden', background: '#16213e' },
  videoBox: { width: '100%', height: '200px', background: '#0f3460' },
  videoLabel: { padding: '8px 12px', fontSize: '13px', color: '#ccc' },
  controls: { display: 'flex', gap: '12px', padding: '16px 0', flexWrap: 'wrap' },
  controlBtn: { padding: '10px 16px', borderRadius: '20px', border: 'none', background: '#0f3460', color: 'white', fontSize: '13px' },
  controlBtnOff: { padding: '10px 16px', borderRadius: '20px', border: 'none', background: '#e53935', color: 'white', fontSize: '13px' },
  controlBtnAI: { padding: '10px 16px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', fontSize: '13px', fontWeight: '600' },
  controlBtnQuiz: { padding: '10px 16px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: 'white', fontSize: '13px', fontWeight: '600' },
  sidebar: { width: '360px', background: '#16213e', borderLeft: '1px solid #0f3460', display: 'flex', flexDirection: 'column' },
  tabs: { display: 'flex', borderBottom: '1px solid #0f3460' },
  tab: { flex: 1, padding: '12px 4px', border: 'none', background: 'transparent', color: '#aaa', fontSize: '16px', cursor: 'pointer' },
  tabActive: { flex: 1, padding: '12px 4px', border: 'none', borderBottom: '2px solid #667eea', background: 'transparent', color: '#667eea', fontSize: '16px', cursor: 'pointer' },
  panelContent: { flex: 1, padding: '16px', overflowY: 'auto' },
  panelHeader: { fontSize: '14px', fontWeight: '600', color: '#ccc', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  recordingDot: { color: '#e53935', fontSize: '12px' },
  transcriptBox: { fontSize: '13px', color: '#ddd', lineHeight: '1.8', whiteSpace: 'pre-wrap' },
  placeholder: { color: '#555', fontStyle: 'italic', fontSize: '13px' },
  quizProgress: { fontSize: '12px', color: '#aaa', marginBottom: '12px' },
  quizQuestion: { fontSize: '15px', color: 'white', marginBottom: '16px', lineHeight: '1.5' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  optionBtn: { padding: '12px', borderRadius: '8px', border: '1px solid #0f3460', color: 'white', fontSize: '13px', textAlign: 'left', cursor: 'pointer' },
  endQuizBtn: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: '#e53935', color: 'white', fontSize: '12px', cursor: 'pointer' },
  quizDone: { textAlign: 'center', padding: '32px 0' },
  quizDoneIcon: { fontSize: '48px', marginBottom: '12px' },
  quizDoneText: { fontSize: '20px', fontWeight: '600', marginBottom: '8px' },
  quizScore: { fontSize: '32px', fontWeight: '700', color: '#667eea' },
  scoreRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#0f3460', borderRadius: '8px', marginBottom: '8px' },
  scoreRank: { fontSize: '16px', fontWeight: '700', color: '#667eea', width: '30px' },
  scoreName: { flex: 1, fontSize: '14px', color: 'white' },
  scoreValue: { fontSize: '14px', fontWeight: '600', color: '#4caf50' },
  notesList: { flex: 1, overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  noteCard: { background: '#0f3460', borderRadius: '8px', padding: '12px' },
  noteHeader: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' },
  noteAuthor: { fontSize: '13px', fontWeight: '600', color: '#667eea' },
  noteRole: { fontSize: '11px', color: '#aaa', background: '#16213e', padding: '2px 6px', borderRadius: '10px' },
  noteTime: { fontSize: '11px', color: '#555', marginLeft: 'auto' },
  noteContent: { fontSize: '13px', color: '#ddd', lineHeight: '1.5' },
  noteInputRow: { display: 'flex', gap: '8px' },
  noteInput: { flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #0f3460', background: '#0f3460', color: 'white', fontSize: '13px', outline: 'none' },
  noteSendBtn: { padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#667eea', color: 'white', fontSize: '13px', fontWeight: '600' },
  fileUploadRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  fileUploadBtn: { 
  padding: '8px 16px', 
  borderRadius: '8px', 
  background: '#0f3460', 
  color: 'white', 
  fontSize: '13px', 
  cursor: 'pointer', 
  border: '1px dashed #667eea',
  display: 'inline-block'
},
  fileHint: { fontSize: '11px', color: '#555' },
  fileCard: { background: '#0f3460', borderRadius: '8px', padding: '12px', borderLeft: '3px solid #4caf50' },
  fileLink: { display: 'block', marginTop: '8px', color: '#667eea', fontSize: '13px', textDecoration: 'none', wordBreak: 'break-all' },

  };
  

export default Room;