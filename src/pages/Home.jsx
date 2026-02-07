import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import ChatSidebar from '../components/ChatSidebar';
import './Home.css';

function Home() {
  const [menu, setMenu] = useState([]);
  const [hour, sethour] = useState(null);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [usernumber, setusernumber] = useState('');
  const user = JSON.parse(localStorage.getItem('user'));
  useEffect(() => {

    const token = localStorage.getItem('token');

    if (!user || !token) {
      navigate('/login');
      return;
    }

    fetchData();
  }, []);



  const fetchData = async () => {
    try {
      const menuRes = await axios.get('http://localhost:5000/api/menu');
      const tablesRes = await axios.get('http://localhost:5000/api/tables');

      setMenu(menuRes.data);
      setTables(tablesRes.data);

      try {
        const ordersRes = await axios.get(
          `http://localhost:5000/api/orders`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        setOrders(ordersRes.data);
      } catch (err) {
        console.warn('Orders API not available yet');
        setOrders([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoading(false);
    }
  };

  const booktable = async () => {
    if (!selectedTable || !hour) {
      alert("Please select table and hours");
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/tables/book', {
        tableId: selectedTable._id,
        hours: Number(hour)
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Table booked successfully!');
      setSelectedTable(null);
      sethour(null);
      fetchData(); // refresh tables

    } catch (err) {
      console.error(err.response?.data || err);
      alert(err.response?.data?.error || 'Failed to book table');
    }
  };



  const addToCart = (item) => {
    const existingItem = cart.find(c => c.menuItemId === item._id);
    if (existingItem) {
      setCart(cart.map(c =>
        c.menuItemId === item._id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        quantity: 1
      }]);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(c => c.menuItemId !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(c =>
      c.menuItemId === itemId ? { ...c, quantity } : c
    ));
  };

  const placeOrder = async () => {
    if (!usernumber) {
      alert('Please enter your phone number');
      return;
    }
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    try {
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const order = {
        items: cart,
        total: total,
        status: 'pending',
        usernumber: usernumber,

      };

      const response = await axios.post('http://localhost:5000/api/orders', order, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders([...orders, response.data]);
      setCart([]);
      alert('Order placed successfully!');
    } catch (err) {
      console.error('Error placing order:', err);
      alert('Failed to place order');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-container">
      <header className="home-header glass-panel">
        <div className="header-content">
          <h1 className="text-gradient">Restaurant Dashboard</h1>
          <div className="header-actions">
            <span className="user-name">Welcome, {user?.username}</span>
            <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <div className="home-content">
        <div className="main-section">
          <section className="menu-section glass-panel">
            <h2>Menu</h2>
            <div className="menu-grid">
              {menu.map(item => {


                return (
                  <div key={item._id} className="menu-item">
                    <img src={item.image} alt={item.name} className="menu-image" />
                    <div className="menu-info">
                      <h3>{item.name}</h3>
                      <p className="menu-description">{item.description}</p>
                      <div className="menu-footer">
                        <span className="menu-price"> ${Number(item.price || 0).toFixed(2)}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="btn btn-primary btn-sm"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="tables-section glass-panel">
            <h2>Available Tables</h2>
            <div className="tables-grid">
              {tables.map(table => (
                <div
                  key={table._id}
                  className={`table-card ${!table.isAvailable ? 'occupied' : ''}  ${selectedTable?._id === table._id ? 'selected' : ''}`}
                  onClick={() => {
                    if (table.isAvailable) {
                      setSelectedTable(table);
                    }
                  }}
                >
                  <div className="table-number">Table {table.number}</div>
                  <div className="table-seats">{table.seats} seats</div>
                  <div className="table-status">
                    {table.isAvailable ? '✓ Available' : '✗ Occupied'}


                  </div>
                  {table.userId === user.id ? 'you own this table' : ''}


                </div>
              ))}
            </div>
            <h2 className='label1'>Select Booking Duration</h2>

            <div className="hours">
              <input type="radio" name="hours" value="1" onChange={() => sethour(1)} /> 1 Hour
              <input type="radio" name="hours" value="2" onChange={() => sethour(2)} /> 2 Hours
              <input type="radio" name="hours" value="3" onChange={() => sethour(3)} /> 3 Hours

            </div>
            {selectedTable && (
              <div className="selected-table-info">
                Table {selectedTable.number} selected
              </div>
            )}


            <button onClick={booktable} disabled={!selectedTable || !hour} className='buttontable'>Book Table</button>
          </section>
        </div>

        <aside className="order-section glass-panel">
          <h2>Your Order</h2>


          <div className="cart-items">
            {cart.length === 0 ? (
              <p className="empty-cart">Cart is empty</p>
            ) : (
              cart.map(item => (
                <div key={item.menuItemId} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">${(Number(item.price || 0) * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="cart-item-controls">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                      className="btn-quantity"
                    >
                      -
                    </button>
                    <span className="cart-quantity">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                      className="btn-quantity"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.menuItemId)}
                      className="btn-remove"
                    >
                      ×
                    </button>
                  </div>

                </div>

              ))
            )}

            <div>
              {cart.length > 0 ? (
                <div>
                  <input type="text" placeholder="Your Phone Number" value={usernumber} onChange={(e) => setusernumber(e.target.value)} />
                </div>
              ) : (

                ''
              )}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="cart-footer">
              <div className="cart-total">
                Total: ${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
              </div>
              <button
                onClick={placeOrder}
                className="btn btn-primary btn-block"
              >
                Place Order
              </button>
            </div>
          )}

          <div className="orders-list">
            <h3>Recent Orders</h3>
            {orders.length === 0 ? (
              <p className="no-orders">No orders yet</p>
            ) : (
              <div className="orders">
                {orders.map(order => (
                  <div key={order._id} className="order-card">
                    <div className="order-header">
                      <span>Your Order</span>
                      <span className={`order-status ${order.status}`}>{order.status}</span>
                    </div>
                    <div className="order-items">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="order-item">
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                    </div>
                    <div className="order-total">Total: ${Number(order.total || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <button
        className="chat-toggle-btn"
        onClick={() => setChatOpen(!chatOpen)}
        aria-label="Toggle chat"
      >
        💬
      </button>

      <ChatSidebar isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}

export default Home;
