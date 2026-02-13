import React, { useState, useEffect } from 'react';

const MENU_ITEMS = [
  { id: 1, name: "Classic Butter Croissant", price: 45, icon: "🥐", cat: "Pastry", special: true },
  { id: 2, name: "Strawberry Cupcake", price: 65, icon: "🧁", cat: "Sweets", special: true },
  { id: 3, name: "Artisan Sourdough", price: 120, icon: "🍞", cat: "Breads", special: true },
  { id: 4, name: "Blueberry Muffin", price: 55, icon: "🥯", cat: "Pastry" },
  { id: 5, name: "Cutting Chai", price: 15, icon: "☕", cat: "Drinks" },
  { id: 6, name: "Veg Cheese Burger", price: 85, icon: "🍔", cat: "Snacks" },
  { id: 7, name: "Masala Dosa", price: 70, icon: "🍛", cat: "Meals" },
  { id: 8, name: "Cold Coffee", price: 50, icon: "🥤", cat: "Drinks" },
  { id: 9, name: "Hot Coffee", price: 30, icon: "☕", cat: "Drinks" }
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [validationError, setValidationError] = useState("");
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
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cb_user_auth');
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
    // Removed: The automatic basket popup logic here to stay on the menu
  };

  // --- Cart Actions ---
  const addToCart = (item) => {
    if (!isCanteenOpen) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
    // Basket pops up only when an item is actually selected/added
    setIsCartOpen(true);
  };

  const changeQty = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const cartTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const discount = currentUser ? cartTotal * 0.1 : 0;
  const deliveryFee = isDelivery && cart.length > 0 ? 20 : 0;
  const finalTotal = cartTotal - discount + deliveryFee;

  // --- Place Order Logic ---
  const handlePlaceOrder = () => {
    if (cart.length === 0 || !isCanteenOpen) return;
    if (isDelivery && !deliveryLocation.trim()) {
      setValidationError("Please enter the location");
      return;
    }
    
    const estimatedMinutes = 5 + (cart.length * 2) + (isDelivery ? 10 : 0);
    const orderId = Date.now().toString();

    const newOrder = {
      id: orderId,
      studentName: currentUser ? currentUser.name : "Guest User",
      studentUid: currentUser ? currentUser.uid : "N/A",
      token: "CB-" + Math.floor(100 + Math.random() * 900),
      items: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
      total: `₹${finalTotal.toFixed(2)}`,
      status: 'received',
      type: isDelivery ? 'Delivery' : 'Pickup',
      location: isDelivery ? deliveryLocation : 'Counter 01',
      estimatedTime: estimatedMinutes,
      createdAt: new Date().toISOString()
    };

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setIsCartOpen(false);
    setDeliveryLocation("");
    setIsDelivery(false);
    
    setShowThankYou(true);
    setTimeout(() => {
        setShowThankYou(false);
        setActiveOrderId(orderId);
    }, 2500);

    setTimeout(() => {
      setOrders(current => 
        current.map(o => o.id === orderId ? { ...o, status: 'preparing' } : o)
      );
    }, 5500);
  };

  const handleInquiry = (e) => {
    e.preventDefault();
    const form = e.target;
    const newInq = {
      id: Date.now().toString(),
      studentName: currentUser ? currentUser.name : "Guest",
      studentUid: currentUser ? currentUser.uid : "Guest",
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

        .user-nav-info { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }
        .logout-btn { background: none; border: 1px solid #ddd; padding: 5px 10px; border-radius: 8px; cursor: pointer; color: #888; font-size: 0.75rem; }

        /* Hero */
        .hero { display: flex; padding: 60px 5%; align-items: center; gap: 40px; min-height: 70vh; }
        .hero-content { flex: 1; }
        .hero-content h1 { font-size: 3.5rem; line-height: 1.1; margin-bottom: 20px; color: #2d2d2d; }
        .hero-content span { color: var(--accent); }
        
        .offer-pill { display: inline-block; background: #fff3cd; color: #856404; padding: 8px 16px; border-radius: 50px; font-weight: 800; font-size: 0.8rem; margin-bottom: 15px; border: 1px solid #ffeeba; }

        .hero-actions { display: flex; gap: 15px; margin-top: 30px; flex-wrap: wrap; }
        .hero-btn { flex: 1; min-width: 200px; padding: 25px; border-radius: 20px; border: 2px solid transparent; cursor: pointer; transition: 0.3s; text-align: center; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .hero-btn h4 { margin: 0 0 8px; color: var(--dark-pink); font-size: 1.25rem; }
        .hero-btn p { margin: 0; font-size: 0.9rem; color: #888; }
        .hero-btn:hover { border-color: var(--accent); transform: translateY(-5px); box-shadow: 0 15px 35px rgba(214, 51, 132, 0.1); }
        .hero-btn.closed { opacity: 0.6; cursor: not-allowed; }

        .hero-image-container { flex: 1; position: relative; text-align: center; }
        .hero-img { max-width: 100%; border-radius: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transition: 0.3s; }
        
        /* Specials Section */
        .specials-section { padding: 80px 5%; background: rgba(255, 255, 255, 0.5); border-radius: 40px; margin: 40px 5%; box-shadow: inset 0 0 40px rgba(214, 51, 132, 0.05); }
        .specials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
        .special-card { background: white; border-radius: 25px; overflow: hidden; display: flex; align-items: center; padding: 20px; gap: 20px; border: 2px solid var(--primary); transition: 0.3s; }
        .special-card:hover { transform: scale(1.02); box-shadow: 0 15px 30px rgba(0,0,0,0.05); }
        .special-icon { font-size: 3rem; }

        /* Grid */
        .section-title { text-align: center; margin: 60px 0 40px; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; padding: 0 5%; }
        .card { background: white; border-radius: var(--radius); padding: 25px; text-align: center; border: 1px solid transparent; transition: 0.3s; }
        .card:hover { border-color: var(--primary); transform: translateY(-5px); }
        .card-icon { font-size: 3.5rem; margin-bottom: 15px; display: block; }
        .btn { padding: 12px 25px; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; transition: 0.3s; }
        .btn-add { background: #fdf2f4; color: var(--dark-pink); width: 100%; }
        .btn-add:hover { background: var(--primary); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: var(--dark-pink); color: white; }

        /* Cart & Modals */
        .cart-panel { position: fixed; right: -400px; top: 0; width: 350px; height: 100vh; background: white; transition: 0.4s; zIndex: 200; padding: 30px; box-shadow: -10px 0 30px rgba(0,0,0,0.1); display: flex; flex-direction: column; z-index: 200; }
        .cart-panel.open { right: 0; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 500; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .modal-card { background: white; padding: 40px; border-radius: 24px; width: 90%; max-width: 400px; text-align: center; position: relative; }

        .auth-input { width: 100%; padding: 12px; margin-bottom: 12px; border-radius: 8px; border: 1px solid #eee; outline: none; }
        .discount-banner { background: #d4edda; color: #155724; padding: 10px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; margin-bottom: 15px; }

        .steps { display: flex; justify-content: space-between; margin: 40px 0; position: relative; }
        .steps::before { content: ''; position: absolute; top: 20px; left: 10%; right: 10%; height: 4px; background: #f0f0f0; z-index: 1; }
        .step { position: relative; z-index: 2; width: 40px; height: 40px; background: white; border: 4px solid #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ccc; font-weight: bold; }
        .step.active { border-color: var(--accent); color: var(--accent); }
        .step.completed { background: var(--accent); border-color: var(--accent); color: white; }

        /* Floating Controls Bottom Left */
        .bottom-left-controls { position: fixed; bottom: 20px; left: 20px; display: flex; align-items: center; gap: 10px; z-index: 1000; }
        .offer-validate-btn { background: #fff3cd; color: #856404; border: 2px solid #ffeeba; padding: 10px 20px; border-radius: 50px; cursor: pointer; font-weight: 800; font-size: 0.8rem; box-shadow: 0 4px 15px rgba(133, 100, 4, 0.15); transition: 0.3s; }
        .offer-validate-btn:hover { background: #ffeeba; transform: translateY(-2px); }
        .admin-toggle-btn { background: #333; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; opacity: 0.5; transition: 0.3s; }
        .admin-toggle-btn:hover { opacity: 1; }

        @media (max-width: 768px) { .hero { flex-direction: column; text-align: center; } .hero-image-container { margin-top: 40px; } }
      `}</style>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 style={{ color: 'var(--dark-pink)' }}>College Login</h2>
            <p style={{ color: '#888', marginBottom: '20px' }}>Staff & Students get 10% OFF instantly!</p>
            <form onSubmit={handleAuth}>
              <input name="userName" className="auth-input" required placeholder="Full Name" />
              <input name="userUid" className="auth-input" required placeholder="College UID" />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login & Claim Discount</button>
            </form>
            <button onClick={() => setIsAuthModalOpen(false)} style={{ background: 'none', border: 'none', marginTop: '15px', color: '#999', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Thank You Modal */}
      {showThankYou && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🎉</div>
            <h2 style={{ color: 'var(--dark-pink)', marginBottom: '10px' }}>Thank You!</h2>
            <p style={{ color: '#888' }}>Your order has been placed successfully. Redirecting to live tracker...</p>
          </div>
        </div>
      )}

      {/* Validation Error Modal */}
      {validationError && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ borderTop: '5px solid var(--red)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📍</div>
            <h2 style={{ color: 'var(--red)', marginBottom: '10px' }}>Wait!</h2>
            <p style={{ color: '#4a4a4a', fontWeight: 600 }}>{validationError}</p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '20px', background: '#333' }} 
              onClick={() => setValidationError("")}
            >
              OK, I'll add it
            </button>
          </div>
        </div>
      )}

      <nav>
        <div className="logo">CAMPUS BITES.</div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="status-badge">
            <div className={`dot ${isCanteenOpen ? 'open' : 'closed'}`}></div>
            {isCanteenOpen ? "Open" : "Closed"}
          </div>
          
          {currentUser && (
            <div className="user-nav-info">
              <span><strong>{currentUser.name}</strong></span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          )}

          <div onClick={() => setIsCartOpen(true)} style={{ cursor: 'pointer', background: 'var(--primary)', padding: '10px 22px', borderRadius: '30px', fontWeight: 800, fontSize: '1.1rem' }}>
            🧺 ({cart.reduce((a, c) => a + c.qty, 0)})
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-content">
          <div className="offer-pill">🔥 10% OFF FOR COLLEGE STAFF & STUDENTS</div>
          <h1>Freshly Made, <br/><span>Loved Daily.</span></h1>
          <p>The original campus canteen experience. Now with real-time tracking and campus-wide delivery.</p>
          
          <div className="hero-actions">
            <div className={`hero-btn ${!isCanteenOpen ? 'closed' : ''}`} onClick={() => isCanteenOpen && choosePath(false)}>
              <h4>🍽️ Dine-in / Pickup</h4>
              <p>Skip the line, grab & go</p>
            </div>
            <div className={`hero-btn ${!isCanteenOpen ? 'closed' : ''}`} onClick={() => isCanteenOpen && choosePath(true)}>
              <h4>🚴 Campus Delivery</h4>
              <p>To your block (+₹20)</p>
            </div>
          </div>
        </div>

        <div className="hero-image-container">
          <img className="hero-img" src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600" alt="Fresh Bread" />
        </div>
      </header>

      {/* TODAY'S SPECIALS SECTION */}
      <section className="specials-section">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--dark-pink)' }}>Today's Specials</h2>
          <p style={{ color: '#888' }}>Handpicked favorites for a perfect campus break</p>
        </div>
        <div className="specials-grid">
          {MENU_ITEMS.filter(item => item.special).map(item => (
            <div key={item.id} className="special-card">
              <span className="special-icon">{item.icon}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{item.name}</h3>
                <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#888' }}>{item.cat}</p>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.2rem' }}>₹{item.price.toFixed(2)}</div>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ padding: '10px 15px', borderRadius: '50%' }}
                onClick={() => addToCart(item)}
                disabled={!isCanteenOpen}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="menu">
        <div className="section-title">
          <h2>All Selection</h2>
          <div style={{ width: '40px', height: '3px', background: 'var(--accent)', margin: '10px auto' }}></div>
        </div>
        <div className="menu-grid">
          {MENU_ITEMS.map(item => (
            <div key={item.id} className="card">
              <span className="card-icon">{item.icon}</span>
              <small style={{ color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>{item.cat}</small>
              <h3 style={{ margin: '10px 0' }}>{item.name}</h3>
              <div style={{ fontWeight: 800, margin: '10px 0', fontSize: '1.2rem' }}>₹{item.price.toFixed(2)}</div>
              <button className="btn btn-add" onClick={() => addToCart(item)} disabled={!isCanteenOpen}>Add to Basket</button>
            </div>
          ))}
        </div>
      </section>

      {/* Cart Side Panel */}
      <div className={`cart-panel ${isCartOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>My Basket 🧺</h2>
          <span onClick={() => setIsCartOpen(false)} style={{ cursor: 'pointer', fontSize: '1.5rem' }}>✕</span>
        </div>

        <div className="option-toggle">
          <button className={`opt-btn ${!isDelivery ? 'active' : ''}`} onClick={() => setIsDelivery(false)}>Pickup</button>
          <button className={`opt-btn ${isDelivery ? 'active' : ''}`} onClick={() => setIsDelivery(true)}>Delivery</button>
        </div>

        {isDelivery && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>DELIVERY LOCATION</label>
            <input 
              type="text" 
              placeholder="e.g. Library, 2nd Floor" 
              value={deliveryLocation} 
              onChange={(e) => setDeliveryLocation(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #eee', outline: 'none' }}
            />
          </div>
        )}

        {currentUser ? (
          <div className="discount-banner">✨ 10% Member Discount Applied!</div>
        ) : (
          <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '10px', fontSize: '0.75rem', marginBottom: '15px' }}>
            <strong>College member?</strong> <button onClick={() => setIsAuthModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--dark-pink)', fontWeight: 800, cursor: 'pointer', padding: 0 }}>Login now</button> to save 10% on this order.
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.length === 0 ? <p style={{ textAlign: 'center', color: '#ccc', marginTop: '100px' }}>Your basket is empty.</p> : cart.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'red', fontSize: '0.65rem', cursor: 'pointer' }}>Remove</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => changeQty(item.id, -1)} style={{ width: '25px', height: '25px', borderRadius: '50%', border: '1px solid #eee' }}>-</button>
                <span>{item.qty}</span>
                <button onClick={() => changeQty(item.id, 1)} style={{ width: '25px', height: '25px', borderRadius: '50%', border: '1px solid #eee' }}>+</button>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ borderTop: '2px solid #eee', paddingTop: '20px', marginTop: '20px' }}>
          <div style={{ fontSize: '0.9rem', color: '#888' }}>Subtotal: ₹{cartTotal.toFixed(2)}</div>
          {currentUser && <div style={{ fontSize: '0.9rem', color: 'green' }}>Discount (10%): -₹{discount.toFixed(2)}</div>}
          {isDelivery && cart.length > 0 && <div style={{ fontSize: '0.9rem', color: '#888' }}>Delivery Fee: ₹20.00</div>}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', marginTop: '10px' }}>
            <span>Total</span><span>₹{finalTotal.toFixed(2)}</span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={handlePlaceOrder} disabled={cart.length === 0 || !isCanteenOpen}>Confirm Order</button>
        </div>
      </div>

      {/* Tracker Overlay */}
      {activeOrderData && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 style={{ color: 'var(--dark-pink)', marginBottom: '5px' }}>{activeOrderData.token}</h2>
            <p style={{ color: '#888', fontWeight: 600, fontSize: '0.8rem' }}>LIVE TRACKER</p>
            <div className="steps">
              <div className={getStepClass(activeOrderData.status, 'received')}>1</div>
              <div className={getStepClass(activeOrderData.status, 'preparing')}>2</div>
              <div className={getStepClass(activeOrderData.status, 'ready')}>3</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', margin: '20px 0' }}>
               <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Est. Time: {activeOrderData.estimatedTime} Mins</p>
               <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#888' }}>Mode: {activeOrderData.type}</p>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', background: '#333' }} onClick={() => setActiveOrderId(null)}>Continue Browsing</button>
          </div>
        </div>
      )}

      {/* Floating Controls Bottom Left */}
      <div className="bottom-left-controls">
        {!currentUser && (
            <button className="offer-validate-btn" onClick={() => setIsAuthModalOpen(true)}>
                🎁 Validate 10% Offer
            </button>
        )}
        <button className="admin-toggle-btn" onClick={() => setIsAdminOpen(true)}>⚙️</button>
      </div>
      
      {isAdminOpen && (
        <div className="admin-panel" style={{ position: 'fixed', top: '5%', left: '5%', width: '90%', height: '90%', background: 'white', zIndex: 1000, padding: '40px', borderRadius: '20px', overflow: 'auto', boxShadow: '0 0 50px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h2>Manager Dashboard</h2>
            <button className="btn btn-primary" onClick={() => setIsAdminOpen(false)}>Close</button>
          </div>
          <table>
            <thead><tr><th>Token</th><th>Student</th><th>Items</th><th>Mode</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.token}</td>
                  <td>{o.studentName} ({o.studentUid})</td>
                  <td>{o.items}</td>
                  <td>{o.type}</td>
                  <td>{o.total}</td>
                  <td>
                    <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                      <option value="received">Received</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '0.8rem' }}>&copy; 2024 Campus Bites. Fast Pre-ordering for Students.</footer>
    </div>
  );
}