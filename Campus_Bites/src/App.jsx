import React, { useState, useEffect } from 'react';

const MENU_ITEMS = [
  { id: 1, name: "Classic Butter Croissant", price: 45, icon: "🥐", cat: "Pastry" },
  { id: 2, name: "Strawberry Cupcake", price: 65, icon: "🧁", cat: "Sweets" },
  { id: 3, name: "Artisan Sourdough", price: 120, icon: "🍞", cat: "Breads" },
  { id: 4, name: "Blueberry Muffin", price: 55, icon: "🥯", cat: "Pastry" },
  { id: 5, name: "Cutting Chai", price: 15, icon: "☕", cat: "Drinks" },
  { id: 6, name: "Veg Cheese Burger", price: 85, icon: "🍔", cat: "Snacks" },
  { id: 7, name: "Masala Dosa", price: 70, icon: "🍛", cat: "Meals" },
  { id: 8, name: "Cold Coffee", price: 50, icon: "🥤", cat: "Drinks" }
];

const OPEN_TIME = { hour: 8, minute: 30 };
const CLOSE_TIME = { hour: 19, minute: 30 };

export default function App() {
  // --- Local State ---
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('cb_user_auth');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('cb_orders_v4');
    return saved ? JSON.parse(saved) : [];
  });
  const [inquiries, setInquiries] = useState(() => {
    const saved = localStorage.getItem('cb_inquiries_v4');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  // Delivery State
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState("");

  // Live Status State
  const [isCanteenOpen, setIsCanteenOpen] = useState(true);

  // --- Auth Handlers ---
  const handleAuth = (e) => {
    e.preventDefault();
    const name = e.target.elements.userName.value;
    const uid = e.target.elements.userUid.value;
    const userData = { name, uid };
    setCurrentUser(userData);
    localStorage.setItem('cb_user_auth', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cb_user_auth');
    setCart([]);
    setActiveOrderId(null);
  };

  // --- Check Canteen Hours ---
  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = OPEN_TIME.hour * 60 + OPEN_TIME.minute;
      const closeMinutes = CLOSE_TIME.hour * 60 + CLOSE_TIME.minute;
      setIsCanteenOpen(currentMinutes >= openMinutes && currentMinutes <= closeMinutes);
    };

    checkStatus();
    const timer = setInterval(checkStatus, 60000);
    return () => clearInterval(timer);
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('cb_orders_v4', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('cb_inquiries_v4', JSON.stringify(inquiries));
  }, [inquiries]);

  const activeOrderData = orders.find(o => o.id === activeOrderId);

  // --- Choice Handlers ---
  const choosePath = (delivery) => {
    setIsDelivery(delivery);
    window.location.href = '#menu';
    if (delivery) {
      setTimeout(() => setIsCartOpen(true), 500);
    }
  };

  // --- Cart Actions ---
  const addToCart = (item) => {
    if (!isCanteenOpen) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const cartTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);

  // --- Place Order Logic ---
  const handlePlaceOrder = () => {
    if (cart.length === 0 || !isCanteenOpen) return;
    if (isDelivery && !deliveryLocation.trim()) {
      alert("Please provide a delivery location within campus.");
      return;
    }
    
    const estimatedMinutes = 5 + (cart.length * 2) + (isDelivery ? 10 : 0);
    const orderId = Date.now().toString();

    const newOrder = {
      id: orderId,
      studentName: currentUser.name,
      studentUid: currentUser.uid,
      token: "CB-" + Math.floor(100 + Math.random() * 900),
      items: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
      total: `₹${(cartTotal + (isDelivery ? 20 : 0)).toFixed(2)}`,
      status: 'received',
      type: isDelivery ? 'Delivery' : 'Dine-in (Pickup)',
      location: isDelivery ? deliveryLocation : 'Counter 01',
      estimatedTime: estimatedMinutes,
      createdAt: new Date().toISOString()
    };

    setOrders(prev => [newOrder, ...prev]);
    setActiveOrderId(orderId);
    setCart([]);
    setIsCartOpen(false);
    setDeliveryLocation("");
    setIsDelivery(false);

    setTimeout(() => {
      setOrders(current => 
        current.map(o => o.id === orderId ? { ...o, status: 'preparing' } : o)
      );
    }, 3000);
  };

  const handleInquiry = (e) => {
    e.preventDefault();
    const form = e.target;
    const newInq = {
      id: Date.now().toString(),
      studentName: currentUser.name,
      studentUid: currentUser.uid,
      email: form.elements['inq-email'].value,
      message: form.elements['inq-msg'].value,
      createdAt: new Date().toISOString()
    };
    setInquiries(prev => [newInq, ...prev]);
    form.reset();
    setInquirySuccess(true);
    setTimeout(() => setInquirySuccess(false), 5000);
  };

  const updateStatus = (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const getStepClass = (status, stepName) => {
    const steps = { received: 1, preparing: 2, ready: 3 };
    const current = steps[status] || 1;
    const target = steps[stepName];
    if (current > target) return "step completed";
    if (current === target) return "step active";
    return "step";
  };

  // If no user is logged in, show Auth Screen
  if (!currentUser) {
    return (
      <div className="auth-container">
        <style>{`
          .auth-container { height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fff5f6 0%, #fef9f1 100%); font-family: 'Segoe UI', sans-serif; }
          .auth-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 15px 35px rgba(214, 51, 132, 0.1); width: 90%; max-width: 400px; text-align: center; }
          .auth-card h1 { color: #d63384; margin-bottom: 10px; font-weight: 800; }
          .auth-card p { color: #888; margin-bottom: 30px; font-size: 0.9rem; }
          .auth-input { width: 100%; padding: 15px; margin-bottom: 15px; border-radius: 12px; border: 1px solid #eee; outline: none; box-sizing: border-box; transition: 0.3s; }
          .auth-input:focus { border-color: #d63384; box-shadow: 0 0 0 4px rgba(214, 51, 132, 0.1); }
          .auth-btn { width: 100%; padding: 15px; border-radius: 12px; border: none; background: #a02050; color: white; font-weight: 700; cursor: pointer; transition: 0.3s; }
          .auth-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(160, 32, 80, 0.3); }
        `}</style>
        <div className="auth-card">
          <h1>CAMPUS BITES.</h1>
          <p>Please authenticate to access the canteen</p>
          <form onSubmit={handleAuth}>
            <input name="userName" className="auth-input" required placeholder="Enter Full Name" />
            <input name="userUid" className="auth-input" required placeholder="Enter College UID" />
            <button type="submit" className="auth-btn">Enter Canteen</button>
          </form>
          <div style={{ marginTop: '20px', fontSize: '0.7rem', color: '#ccc' }}>Authorized Student Access Only</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <style>{`
        :root {
          --primary: #f8d7da; --accent: #d63384; --dark-pink: #a02050;
          --bg-gradient: linear-gradient(135deg, #fff5f6 0%, #fef9f1 100%);
          --card-bg: #ffffff; --text: #4a4a4a; --radius: 20px;
          --green: #2ecc71; --red: #e74c3c;
        }
        body { margin: 0; background: var(--bg-gradient); color: var(--text); font-family: 'Segoe UI', sans-serif; line-height: 1.6; }
        
        /* Nav */
        nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 5%; background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 100; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .logo { font-size: 1.5rem; font-weight: 800; color: var(--dark-pink); letter-spacing: -1px; }
        
        .status-badge { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 700; background: white; padding: 6px 12px; border-radius: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.open { background: var(--green); box-shadow: 0 0 8px var(--green); }
        .dot.closed { background: var(--red); box-shadow: 0 0 8px var(--red); }

        .user-nav-info { display: flex; align-items: center; gap: 15px; font-size: 0.85rem; }
        .logout-btn { background: none; border: 1px solid #ddd; padding: 5px 10px; border-radius: 8px; cursor: pointer; color: #888; font-size: 0.75rem; }
        .logout-btn:hover { color: var(--red); border-color: var(--red); }

        /* Hero */
        .hero { display: flex; padding: 60px 5%; align-items: center; gap: 40px; min-height: 70vh; }
        .hero-content h1 { font-size: 3.5rem; line-height: 1.1; margin-bottom: 20px; color: #2d2d2d; }
        .hero-content span { color: var(--accent); }
        .hero-img { max-width: 100%; border-radius: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transform: rotate(2deg); }
        
        .hero-actions { display: flex; gap: 15px; margin-top: 30px; flex-wrap: wrap; }
        .hero-btn { flex: 1; min-width: 200px; padding: 20px; border-radius: 15px; border: 2px solid transparent; cursor: pointer; transition: 0.3s; text-align: center; background: white; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .hero-btn h4 { margin: 0 0 5px; color: var(--dark-pink); font-size: 1.1rem; }
        .hero-btn p { margin: 0; font-size: 0.85rem; color: #888; }
        .hero-btn:hover { border-color: var(--accent); transform: translateY(-3px); }
        .hero-btn.closed { opacity: 0.6; cursor: not-allowed; }

        /* Grid */
        .section-title { text-align: center; margin: 60px 0 40px; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; padding: 0 5%; }
        .card { background: white; border-radius: var(--radius); padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); text-align: center; transition: 0.3s; border: 1px solid transparent; }
        .card:hover { transform: translateY(-5px); border-color: var(--primary); }
        .card-icon { font-size: 3.5rem; margin-bottom: 15px; display: block; }
        .btn { padding: 12px 25px; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; transition: 0.3s; }
        .btn-add { background: #fdf2f4; color: var(--dark-pink); width: 100%; }
        .btn-add:hover { background: var(--primary); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: var(--dark-pink); color: white; }

        /* Cart */
        .cart-panel { position: fixed; right: -400px; top: 0; width: 350px; height: 100vh; background: white; transition: 0.4s; z-index: 200; padding: 30px; box-shadow: -10px 0 30px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
        .cart-panel.open { right: 0; }
        .cart-item { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #f9f9f9; }
        .btn-remove { background: none; border: none; color: #ff6b6b; font-size: 0.7rem; cursor: pointer; padding: 0; margin-top: 5px; font-weight: 700; text-transform: uppercase; }

        /* Delivery Toggle */
        .option-toggle { display: flex; background: #f5f5f5; padding: 4px; border-radius: 10px; margin: 20px 0; }
        .opt-btn { flex: 1; padding: 8px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; transition: 0.2s; font-size: 0.8rem; }
        .opt-btn.active { background: white; color: var(--dark-pink); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

        /* Tracker */
        .tracker-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 300; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .tracker-card { background: white; padding: 40px; border-radius: 30px; width: 90%; max-width: 450px; text-align: center; }
        .steps { display: flex; justify-content: space-between; margin: 40px 0; position: relative; }
        .steps::before { content: ''; position: absolute; top: 20px; left: 10%; right: 10%; height: 4px; background: #f0f0f0; z-index: 1; }
        .step { position: relative; z-index: 2; width: 40px; height: 40px; background: white; border: 4px solid #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ccc; font-weight: bold; }
        .step.active { border-color: var(--accent); color: var(--accent); box-shadow: 0 0 15px rgba(214, 51, 132, 0.2); }
        .step.completed { background: var(--accent); border-color: var(--accent); color: white; }
        .step-label { position: absolute; top: 50px; left: 50%; transform: translateX(-50%); font-size: 0.75rem; white-space: nowrap; font-weight: 700; color: #999; }
        .timer-badge { background: #fdf2f4; color: var(--dark-pink); padding: 10px 20px; border-radius: 12px; font-weight: 700; margin-top: 20px; display: inline-block; }

        /* Admin */
        .admin-toggle { position: fixed; bottom: 20px; left: 20px; background: #333; color: white; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; z-index: 1000; opacity: 0.5; }
        .admin-panel { position: fixed; top: 5%; left: 5%; width: 90%; height: 90%; background: white; z-index: 1001; padding: 40px; border-radius: 20px; overflow: auto; box-shadow: 0 0 50px rgba(0,0,0,0.3); }

        @media (max-width: 768px) {
          .hero { flex-direction: column; text-align: center; }
          .hero-content h1 { font-size: 2.8rem; }
          .contact-hub { flex-direction: column; padding: 40px 5%; }
        }
      `}</style>

      <nav>
        <div className="logo">CAMPUS BITES.</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="status-badge">
            <div className={`dot ${isCanteenOpen ? 'open' : 'closed'}`}></div>
            {isCanteenOpen ? "Open" : "Closed"}
          </div>
          
          <div className="user-nav-info">
             <span>Hi, <strong>{currentUser.name}</strong></span>
             <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>

          <div onClick={() => setIsCartOpen(true)} style={{ cursor: 'pointer', background: 'var(--primary)', padding: '10px 20px', borderRadius: '30px', fontWeight: 700 }}>
            Tray ({cart.reduce((a, c) => a + c.qty, 0)})
          </div>
        </div>
      </nav>

      <header className="hero">
        <div style={{ flex: 1 }}>
          <h1>Welcome back, <br/><span>{currentUser.name.split(' ')[0]}!</span></h1>
          <p>Skip the long queues and pre-order your favorite campus meals. authenticated student access enabled.</p>
          
          <div className="hero-actions">
            <div 
              className={`hero-btn ${!isCanteenOpen ? 'closed' : ''}`} 
              onClick={() => isCanteenOpen && choosePath(false)}
            >
              <h4>🏪 Dine-in / Pickup</h4>
              <p>Skip the line, grab & go</p>
            </div>
            <div 
              className={`hero-btn ${!isCanteenOpen ? 'closed' : ''}`} 
              onClick={() => isCanteenOpen && choosePath(true)}
            >
              <h4>🚴 Campus Delivery</h4>
              <p>To your block (+₹20)</p>
            </div>
          </div>
          
          {!isCanteenOpen && (
             <p style={{ marginTop: '20px', color: 'var(--red)', fontWeight: 700 }}>
               ⚠️ Canteen is currently closed. We'll be back at 08:30 AM!
             </p>
          )}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <img className="hero-img" src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600" alt="Fresh Bakery" />
        </div>
      </header>

      <section id="menu">
        <div className="section-title">
          <h2>Our Daily Selection</h2>
          <div style={{ width: '40px', height: '3px', background: 'var(--accent)', margin: '10px auto' }}></div>
        </div>
        <div className="menu-grid">
          {MENU_ITEMS.map(item => (
            <div key={item.id} className="card">
              <span className="card-icon">{item.icon}</span>
              <small style={{ color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>{item.cat}</small>
              <h3 style={{ margin: '10px 0' }}>{item.name}</h3>
              <div style={{ fontWeight: 800, margin: '10px 0', fontSize: '1.2rem' }}>₹{item.price.toFixed(2)}</div>
              <button className="btn btn-add" onClick={() => addToCart(item)} disabled={!isCanteenOpen}>
                {isCanteenOpen ? "Add to Tray" : "Closed"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" style={{ display: 'flex', padding: '80px 5%', gap: '50px', background: 'white', marginTop: '60px' }} className="contact-hub">
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '2rem' }}>Contact Info</h2>
          <p style={{ color: '#888', margin: '20px 0' }}>Authorized portal for student inquiries. For club events or feedback, reach out to the canteen manager.</p>
          <div style={{ lineHeight: 2.2 }}>
            <div><strong>📍 Campus Location:</strong> Main Block, Ground Floor</div>
            <div><strong>📞 Help Desk:</strong> +91 98765 43210 (Ext: 4055)</div>
            <div><strong>⏰ Service Hours:</strong> 08:30 AM - 07:30 PM</div>
          </div>
        </div>
        <form onSubmit={handleInquiry} style={{ flex: 1, background: '#fdf2f4', padding: '30px', borderRadius: '20px' }}>
          <h3 style={{ marginBottom: '20px' }}>Manager Inquiry</h3>
          <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: '#888' }}>Sending as: {currentUser.name} ({currentUser.uid})</div>
          <input name="inq-email" type="email" required placeholder="College Email" style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
          <textarea name="inq-msg" required rows="4" placeholder="How can we assist you?" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}></textarea>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Send Message</button>
          {inquirySuccess && <p style={{ color: 'green', fontWeight: 700, marginTop: '10px', textAlign: 'center' }}>✓ Message sent!</p>}
        </form>
      </section>

      {/* Cart Side Panel */}
      <div className={`cart-panel ${isCartOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>My Tray</h2>
          <span onClick={() => setIsCartOpen(false)} style={{ cursor: 'pointer', fontSize: '1.5rem' }}>✕</span>
        </div>

        <div className="option-toggle">
          <button className={`opt-btn ${!isDelivery ? 'active' : ''}`} onClick={() => setIsDelivery(false)}>Pickup</button>
          <button className={`opt-btn ${isDelivery ? 'active' : ''}`} onClick={() => setIsDelivery(true)}>Delivery</button>
        </div>

        {isDelivery && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>CAMPUS LOCATION</label>
            <input 
              type="text" 
              placeholder="e.g. Block A, Room 202" 
              value={deliveryLocation} 
              onChange={(e) => setDeliveryLocation(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #eee', outline: 'none' }}
            />
            <small style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>Delivery Fee: ₹20.00</small>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.length === 0 ? <p style={{ textAlign: 'center', color: '#ccc', marginTop: '100px' }}>Tray is empty.</p> : cart.map(item => (
            <div key={item.id} className="cart-item">
              <div>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <small>₹{item.price} each</small><br/>
                <button className="btn-remove" onClick={() => removeFromCart(item.id)}>Remove</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => changeQty(item.id, -1)} style={{ width: '25px', height: '25px', borderRadius: '50%', border: '1px solid #eee' }}>-</button>
                <span style={{ fontWeight: 700 }}>{item.qty}</span>
                <button onClick={() => changeQty(item.id, 1)} style={{ width: '25px', height: '25px', borderRadius: '50%', border: '1px solid #eee' }}>+</button>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ borderTop: '2px solid #eee', paddingTop: '20px', marginTop: '20px' }}>
          {isDelivery && cart.length > 0 && (
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px', color: '#888' }}>
                <span>Delivery Fee</span><span>₹20.00</span>
             </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem' }}>
            <span>Total</span><span>₹{(cartTotal + (isDelivery && cart.length > 0 ? 20 : 0)).toFixed(2)}</span>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '20px' }} 
            onClick={handlePlaceOrder} 
            disabled={cart.length === 0 || !isCanteenOpen}
          >
            {isCanteenOpen ? "Place Order" : "Closed"}
          </button>
        </div>
      </div>

      {/* Real-time Order Tracker */}
      {activeOrderData && (
        <div className="tracker-overlay">
          <div className="tracker-card">
            <h1 style={{ color: 'var(--dark-pink)', margin: '0 0 5px' }}>{activeOrderData.token}</h1>
            <p style={{ color: '#888', fontWeight: 600 }}>LIVE TRACKER ({activeOrderData.type})</p>
            
            <div className="steps">
              <div className={getStepClass(activeOrderData.status, 'received')}>1<div className="step-label">Received</div></div>
              <div className={getStepClass(activeOrderData.status, 'preparing')}>2<div className="step-label">Preparing</div></div>
              <div className={getStepClass(activeOrderData.status, 'ready')}>3<div className="step-label">{activeOrderData.type === 'Delivery' ? 'In Transit' : 'Ready'}</div></div>
            </div>

            <div className="timer-badge">
              ⏳ Est. {activeOrderData.type === 'Delivery' ? 'Arrival' : 'Prep'} Time: {activeOrderData.estimatedTime} Mins
            </div>

            <p style={{ textAlign: 'left', background: '#f9f9f9', padding: '15px', borderRadius: '12px', fontSize: '0.85rem', marginTop: '20px' }}>
              <strong>Student:</strong> {activeOrderData.studentName} ({activeOrderData.studentUid})<br/>
              <strong>Location:</strong> {activeOrderData.location}<br/>
              <strong>Items:</strong> {activeOrderData.items}
            </p>
            <button className="btn btn-primary" style={{ width: '100%', background: '#333', marginTop: '20px' }} onClick={() => setActiveOrderId(null)}>Close Tracker</button>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      <button className="admin-toggle" onClick={() => setIsAdminOpen(true)}>⚙️</button>
      {isAdminOpen && (
        <div className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2>Manager Dashboard</h2>
            <button className="btn btn-primary" onClick={() => setIsAdminOpen(false)}>Close</button>
          </div>
          <h3>Live Orders</h3>
          <table>
            <thead><tr><th>Token</th><th>Student Info</th><th>Items</th><th>Type / Location</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No orders yet.</td></tr> : orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{o.token}</td>
                  <td><strong>{o.studentName}</strong><br/><small>{o.studentUid}</small></td>
                  <td style={{ maxWidth: '150px' }}>{o.items}</td>
                  <td>
                    <strong>{o.type}</strong><br/>
                    <small style={{ color: '#888' }}>{o.location}</small>
                  </td>
                  <td>{o.total}</td>
                  <td>
                    <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} style={{ padding: '8px', borderRadius: '8px' }}>
                      <option value="received">Received</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">{o.type === 'Delivery' ? 'In Transit' : 'Ready to Collect'}</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={{ marginTop: '40px' }}>Student Inquiries</h3>
          <table>
            <thead><tr><th>Student Name</th><th>UID</th><th>Email</th><th>Message</th></tr></thead>
            <tbody>
              {inquiries.map(i => (
                <tr key={i.id}>
                  <td><strong>{i.studentName}</strong></td>
                  <td>{i.studentUid}</td>
                  <td>{i.email}</td>
                  <td>{i.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '40px 5%', color: '#999', fontSize: '0.8rem' }}>
        &copy; 2024 Campus Bites. Fast Pre-ordering and Delivery for Students.
      </footer>
    </div>
  );
}