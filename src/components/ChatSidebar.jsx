import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatSidebar.css';

function ChatSidebar({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const messagesEndRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [question, setQuestion] = useState(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch("http://localhost:5000/api/confirm/question", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.question) {
        setQuestion(
          typeof data.question === "string"
            ? JSON.parse(data.question)
            : data.question
        );
      } else {
        setQuestion(null);
      }

      if (!isUserScrolling && data.question) {
        setTimeout(() => scrollToBottom(true), 50);
      }

    }, 2000);

    return () => clearInterval(timer);
  }, []);

  async function sendAnswer(ans) {
    const token = localStorage.getItem('token');
    await fetch("http://localhost:5000/api/confirm/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ answer: ans })
    });
  }


  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.id) return;

      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `http://localhost:5000/api/messages/${user.id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (res.data.success) setMessages(res.data.messages);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
  }, []);


  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Agar scroll bottom se 50px se upar hai → user scroll kar raha
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      setIsUserScrolling(!atBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = (smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };


  useEffect(() => {
    if (isOpen && messages.length > 0 && !isUserScrolling) {
      setTimeout(() => scrollToBottom(true), 50);
    }
  }, [messages, isOpen, isUserScrolling]);



  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = {
      sender: user.username,
      id: user.id,
      content: newMessage.trim(),
      timestamp: new Date()
    };

    // Show user message immediately
    setMessages(prev => [...prev, userMessage]);

    setNewMessage('');
    if (!isUserScrolling) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/ai-chat', {
        message: userMessage.content,
        name: userMessage.sender,

      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const aiMessage = {
        sender: "AI",
        content: res.data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      if (!isUserScrolling) {
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (err) {
      console.error("AI Chat Error:", err);
    }
  };



  if (!isOpen) return null;

  return (
    <div className="chat-sidebar-overlay" onClick={onClose}>
      <div className="chat-sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <h3>💬 Chat Support</h3>
          <button className="chat-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="chat-messages" ref={messagesContainerRef}>

          {messages.length === 0 ? (
            <div className="chat-empty">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg) => (
              <div key={msg._id || msg.timestamp} className={`chat-message ${msg.sender === user?.username ? 'own-message' : ''}`}>
                <div className="message-sender">{msg.sender}</div>
                <div className="message-content">{msg.content}</div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}

          {question && (
            <div className="chat-message">
              <div className="message-sender">Agent Approval</div>
              <div className="message-content">
                {question?.items?.length > 0 && (
                  <>
                    Agent wants to order:{" "}
                    {question.items
                      .map(item => `${item.name} x${item.quantity} per piece (Rs${item.price})`)
                      .join(", ")
                    }
                    . Total: Rs {question.total} | Your Number: {question.usernumber}
                  </>
                )}
              </div>
              <button className="ap_btn" onClick={() => sendAnswer(true)}>Yes</button>
              <button className="ap_btn" onClick={() => sendAnswer(false)}>No</button>
              <div className="message-time">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={sendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button type="submit" className="chat-send-btn">Send</button>
        </form>
      </div>
    </div>
  );
}

export default ChatSidebar;
