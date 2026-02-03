(function () {
  const STORAGE_KEY = "perfume_vault_data_v1";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  window.dataSdk = {
    _handler: null,

    async init(handler) {
      this._handler = handler;

      try {
        const sb = window.supabaseClient;
        const { data: { user } } = await sb.auth.getUser();
        
        if (user) {
          const { data, error } = await sb
            .from('user_perfumes')
            .select('*')
            .eq('user_id', user.id);

          if (error) throw error;
          
          handler.onDataChanged(data || []);
          return { isOk: true };
        }
      } catch (e) {
        console.warn("Supabase init fallback local:", e);
      }

      const data = load();
      handler.onDataChanged(data);
      return { isOk: true };
    },

    async create(record) {
      try {
        const sb = window.supabaseClient;
        const { data: { user } } = await sb.auth.getUser();
        
        if (user) {
          const payload = { ...record, user_id: user.id };

          const { data, error } = await sb
            .from('user_perfumes')
            .insert(payload)
            .select();

          if (error) throw error;

          const { data: all, error: e2 } = await sb
            .from('user_perfumes')
            .select('*')
            .eq('user_id', user.id);

          if (e2) throw e2;

          this._handler?.onDataChanged(all || []);
          return { isOk: true, data };
        }
      } catch (e) {
        console.warn("Supabase create fallback local:", e);
      }

      const data = load();
      const newRec = { ...record, id: record.id || crypto.randomUUID() };
      data.push(newRec);
      save(data);
      this._handler?.onDataChanged(data);
      return { isOk: true };
    },

    async update(record) {
      try {
        const sb = window.supabaseClient;
        const { data: { user } } = await sb.auth.getUser();
        
        if (user) {
          const userId = user.id;
          let existing = null;

          if (record.id) {
            const { data, error } = await sb
              .from('user_perfumes')
              .select('*')
              .eq('user_id', userId)
              .eq('id', record.id)
              .maybeSingle();
            if (error) throw error;
            existing = data;
          } else if (record.perfume_id) {
            const { data, error } = await sb
              .from('user_perfumes')
              .select('*')
              .eq('user_id', userId)
              .eq('perfume_id', record.perfume_id)
              .maybeSingle();
            if (error) throw error;
            existing = data;
          } else if (record.friend_id) {
            const { data, error } = await sb
              .from('user_perfumes')
              .select('*')
              .eq('user_id', userId)
              .eq('friend_id', record.friend_id)
              .maybeSingle();
            if (error) throw error;
            existing = data;
          } else if (record.profile_username) {
            const { data, error } = await sb
              .from('user_perfumes')
              .select('*')
              .eq('user_id', userId)
              .not('profile_username', 'is', null)
              .maybeSingle();
            if (error) throw error;
            existing = data;
          }

          if (existing?.id) {
            const { error } = await sb
              .from('user_perfumes')
              .update({ ...record, user_id: userId })
              .eq('user_id', userId)
              .eq('id', existing.id);

            if (error) throw error;
          } else {
            const { error } = await sb
              .from('user_perfumes')
              .insert({ ...record, user_id: userId });

            if (error) throw error;
          }

          const { data: all, error: e2 } = await sb
            .from('user_perfumes')
            .select('*')
            .eq('user_id', userId);

          if (e2) throw e2;

          this._handler?.onDataChanged(all || []);
          return { isOk: true };
        }
      } catch (e) {
        console.warn("Supabase update fallback local:", e);
      }

      const data = load();
      let idx = record.id ? data.findIndex(r => r.id === record.id) : -1;
      if (idx === -1 && record.perfume_id) idx = data.findIndex(r => r.perfume_id === record.perfume_id);
      if (idx === -1 && record.friend_id) idx = data.findIndex(r => r.friend_id === record.friend_id);
      if (idx === -1 && record.profile_username) idx = data.findIndex(r => r.profile_username);

      if (idx >= 0) data[idx] = { ...data[idx], ...record };
      else data.push({ ...record, id: record.id || crypto.randomUUID() });

      save(data);
      this._handler?.onDataChanged(data);
      return { isOk: true };
    }
  };

  window.elementSdk = {
    init() {},
    setConfig() {}
  };

  function createBottleSVG(color1, color2) {
    return `
      <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" style="width: 80%; height: 80%;">
        <defs>
          <linearGradient id="grad-${color1}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
          </linearGradient>
          <filter id="shine">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="35" y="10" width="30" height="15" fill="${color1}" rx="2"/>
        <rect x="32" y="20" width="36" height="8" fill="${color1}" opacity="0.8"/>
        <rect x="38" y="28" width="24" height="20" fill="url(#grad-${color1})" opacity="0.9"/>
        <rect x="25" y="48" width="50" height="130" rx="8" fill="url(#grad-${color1})" filter="url(#shine)"/>
        <rect x="30" y="55" width="8" height="100" rx="4" fill="white" opacity="0.3"/>
        <rect x="28" y="100" width="44" height="75" rx="6" fill="${color2}" opacity="0.6"/>
        <rect x="30" y="120" width="40" height="30" fill="rgba(255,255,255,0.2)" rx="2"/>
      </svg>
    `;
  }

  const PERFUME_CATALOG = [
    { id: 'acqua-colonia', brand: 'ACQUA DI PARMA', name: 'Colonia', svg: createBottleSVG('#ca8a04', '#fbbf24'), color: 'from-yellow-700 to-amber-800' },
    { id: 'acqua-essenza', brand: 'ACQUA DI PARMA', name: 'Colonia Essenza', svg: createBottleSVG('#0e7490', '#22d3ee'), color: 'from-cyan-800 to-blue-700' },
    { id: 'armani-acqua', brand: 'ARMANI', name: 'Acqua di Gio Profumo', svg: createBottleSVG('#0c4a6e', '#0ea5e9'), color: 'from-blue-900 to-cyan-800' },
    { id: 'armani-acqua-absolu', brand: 'ARMANI', name: 'Acqua di Gio Absolu', svg: createBottleSVG('#1e3a8a', '#3b82f6'), color: 'from-blue-900 to-indigo-800' },
    { id: 'armani-code', brand: 'ARMANI', name: 'Code Profumo', svg: createBottleSVG('#92400e', '#d97706'), color: 'from-amber-900 to-orange-900' },
    { id: 'armani-code-absolu', brand: 'ARMANI', name: 'Code Absolu', svg: createBottleSVG('#78350f', '#ca8a04'), color: 'from-amber-900 to-yellow-700' },
    { id: 'armani-stronger', brand: 'ARMANI', name: 'Stronger With You', svg: createBottleSVG('#7c2d12', '#ea580c'), color: 'from-orange-900 to-red-800' },
    { id: 'dior-sauvage', brand: 'DIOR', name: 'Sauvage', svg: createBottleSVG('#1e3a8a', '#3b82f6'), color: 'from-blue-900 to-slate-900' },
    { id: 'chanel-bleu', brand: 'CHANEL', name: 'Bleu de Chanel', svg: createBottleSVG('#1e40af', '#60a5fa'), color: 'from-blue-800 to-indigo-900' },
  ];

  const APP_STATE = {
    currentUser: null,
    currentView: 'catalog',
    userPerfumes: [],
    userProfile: null,
    friends: [],
    selectedPerfume: null,
    selectedFriend: null,
    catalogSearch: ''
  };

  async function checkAuth() {
    const sb = window.supabaseClient;
    const { data: { user } } = await sb.auth.getUser();
    
    if (user) {
      APP_STATE.currentUser = user;
      document.getElementById('auth-logged-out').classList.add('hidden');
      document.getElementById('auth-logged-in').classList.remove('hidden');
      document.getElementById('auth-user-email').textContent = user.email;
      
      await window.dataSdk.init({
        onDataChanged: (data) => {
          APP_STATE.userPerfumes = data || [];
          renderCurrentView();
        }
      });
    } else {
      APP_STATE.currentUser = null;
      document.getElementById('auth-logged-out').classList.remove('hidden');
      document.getElementById('auth-logged-in').classList.add('hidden');
      
      await window.dataSdk.init({
        onDataChanged: (data) => {
          APP_STATE.userPerfumes = data || [];
          renderCurrentView();
        }
      });
    }
  }

  async function handleSignup() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    
    if (!email || !password) {
      alert('Por favor completa email y contraseÃ±a');
      return;
    }

    const sb = window.supabaseClient;
    const { error } = await sb.auth.signUp({ email, password });
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Registro exitoso. Revisa tu email.');
    }
  }

  async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    
    if (!email || !password) {
      alert('Por favor completa email y contraseÃ±a');
      return;
    }

    const sb = window.supabaseClient;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      await checkAuth();
    }
  }

  async function handleLogout() {
    const sb = window.supabaseClient;
    await sb.auth.signOut();
    await checkAuth();
  }

  function renderCurrentView() {
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    const activeView = document.getElementById(`${APP_STATE.currentView}-view`);
    if (activeView) activeView.classList.remove('hidden');

    if (APP_STATE.currentView === 'catalog') renderCatalog();
    else if (APP_STATE.currentView === 'collection') renderCollection();
    else if (APP_STATE.currentView === 'wishlist') renderWishlist();
    
    updateStats();
  }

  function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    const search = APP_STATE.catalogSearch.toLowerCase();
    
    const filtered = PERFUME_CATALOG.filter(p => 
      p.brand.toLowerCase().includes(search) || p.name.toLowerCase().includes(search)
    );

    grid.innerHTML = filtered.map(perfume => {
      const userPerfume = APP_STATE.userPerfumes.find(up => up.perfume_id === perfume.id);
      const owned = userPerfume?.owned;
      const wishlist = userPerfume?.wishlist;
      const fake = userPerfume?.fake;

      return `
        <div class="perfume-item ${owned ? 'owned' : ''} ${wishlist ? 'wishlist' : ''} ${fake ? 'fake' : ''} gradient-border rounded-lg overflow-hidden" 
             data-perfume-id="${perfume.id}"
             style="background: #1a1a1a;">
          <div class="h-40 bg-gradient-to-br ${perfume.color} flex items-center justify-center p-4">
            ${perfume.svg}
          </div>
          <div class="p-3">
            <h3 class="text-white font-bold text-sm mb-1">${perfume.brand}</h3>
            <p class="text-gray-400 text-xs">${perfume.name}</p>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.perfume-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.perfumeId;
        openDetailModal(id);
      });
    });
  }

  function renderCollection() {
    const grid = document.getElementById('collection-grid');
    const empty = document.getElementById('collection-empty');
    
    const owned = PERFUME_CATALOG.filter(p => 
      APP_STATE.userPerfumes.find(up => up.perfume_id === p.id && up.owned)
    );

    if (owned.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      grid.innerHTML = owned.map(perfume => `
        <div class="perfume-item gradient-border rounded-lg overflow-hidden" 
             data-perfume-id="${perfume.id}"
             style="background: #1a1a1a;">
          <div class="h-40 bg-gradient-to-br ${perfume.color} flex items-center justify-center p-4">
            ${perfume.svg}
          </div>
          <div class="p-3">
            <h3 class="text-white font-bold text-sm mb-1">${perfume.brand}</h3>
            <p class="text-gray-400 text-xs">${perfume.name}</p>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.perfume-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.perfumeId;
          openDetailModal(id);
        });
      });
    }
  }

  function renderWishlist() {
    const grid = document.getElementById('wishlist-grid');
    const empty = document.getElementById('wishlist-empty');
    
    const wished = PERFUME_CATALOG.filter(p => 
      APP_STATE.userPerfumes.find(up => up.perfume_id === p.id && up.wishlist)
    );

    if (wished.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      grid.innerHTML = wished.map(perfume => `
        <div class="perfume-item gradient-border rounded-lg overflow-hidden" 
             data-perfume-id="${perfume.id}"
             style="background: #1a1a1a;">
          <div class="h-40 bg-gradient-to-br ${perfume.color} flex items-center justify-center p-4">
            ${perfume.svg}
          </div>
          <div class="p-3">
            <h3 class="text-white font-bold text-sm mb-1">${perfume.brand}</h3>
            <p class="text-gray-400 text-xs">${perfume.name}</p>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.perfume-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.perfumeId;
          openDetailModal(id);
        });
      });
    }
  }

  function updateStats() {
    const owned = APP_STATE.userPerfumes.filter(p => p.owned).length;
    const wishlist = APP_STATE.userPerfumes.filter(p => p.wishlist).length;
    const fake = APP_STATE.userPerfumes.filter(p => p.fake).length;

    document.getElementById('header-stat-owned').textContent = owned;
    document.getElementById('header-stat-wishlist').textContent = wishlist;
    document.getElementById('sidebar-stat-owned').textContent = owned;
    document.getElementById('sidebar-stat-wishlist').textContent = wishlist;
    document.getElementById('sidebar-stat-fake').textContent = fake;
  }

  function openDetailModal(perfumeId) {
    const perfume = PERFUME_CATALOG.find(p => p.id === perfumeId);
    if (!perfume) return;

    APP_STATE.selectedPerfume = perfumeId;
    
    const userPerfume = APP_STATE.userPerfumes.find(up => up.perfume_id === perfumeId) || {};

    document.getElementById('detail-brand').textContent = perfume.brand;
    document.getElementById('detail-name').textContent = perfume.name;
    document.getElementById('detail-image').innerHTML = perfume.svg;
    document.getElementById('detail-review').value = userPerfume.review || '';
    document.getElementById('detail-owned').checked = userPerfume.owned || false;
    document.getElementById('detail-wishlist').checked = userPerfume.wishlist || false;
    document.getElementById('detail-fake').checked = userPerfume.fake || false;

    updateDetailButtons();
    updateRatingStars(userPerfume.rating || 0);

    document.getElementById('detail-modal').classList.add('active');
  }

  function updateDetailButtons() {
    const owned = document.getElementById('detail-owned').checked;
    const wishlist = document.getElementById('detail-wishlist').checked;
    const fake = document.getElementById('detail-fake').checked;

    const ownedBtn = document.getElementById('detail-owned-btn').querySelector('div');
    const wishlistBtn = document.getElementById('detail-wishlist-btn').querySelector('div');
    const fakeBtn = document.getElementById('detail-fake-btn').querySelector('div');

    if (owned) {
      ownedBtn.style.border = '2px solid #10b981';
      ownedBtn.style.background = 'rgba(16, 185, 129, 0.1)';
      ownedBtn.style.color = '#10b981';
    } else {
      ownedBtn.style.border = '2px solid #333';
      ownedBtn.style.background = '#0f0f0f';
      ownedBtn.style.color = '#888';
    }

    if (wishlist) {
      wishlistBtn.style.border = '2px solid #fbbf24';
      wishlistBtn.style.background = 'rgba(251, 191, 36, 0.1)';
      wishlistBtn.style.color = '#fbbf24';
    } else {
      wishlistBtn.style.border = '2px solid #333';
      wishlistBtn.style.background = '#0f0f0f';
      wishlistBtn.style.color = '#888';
    }

    if (fake) {
      fakeBtn.style.border = '2px solid #ef4444';
      fakeBtn.style.background = 'rgba(239, 68, 68, 0.1)';
      fakeBtn.style.color = '#ef4444';
    } else {
      fakeBtn.style.border = '2px solid #333';
      fakeBtn.style.background = '#0f0f0f';
      fakeBtn.style.color = '#888';
    }
  }

  function updateRatingStars(rating) {
    document.querySelectorAll('#detail-rating-stars .star').forEach((star, index) => {
      if (index < rating) {
        star.classList.add('filled');
      } else {
        star.classList.remove('filled');
      }
    });
  }

  async function saveDetailModal() {
    const perfumeId = APP_STATE.selectedPerfume;
    const owned = document.getElementById('detail-owned').checked;
    const wishlist = document.getElementById('detail-wishlist').checked;
    const fake = document.getElementById('detail-fake').checked;
    const review = document.getElementById('detail-review').value.trim();
    const rating = document.querySelectorAll('#detail-rating-stars .star.filled').length;

    const existing = APP_STATE.userPerfumes.find(up => up.perfume_id === perfumeId);

    const record = {
      ...(existing || {}),
      perfume_id: perfumeId,
      owned,
      wishlist,
      fake,
      review,
      rating
    };

    if (existing) {
      await window.dataSdk.update(record);
    } else {
      await window.dataSdk.create(record);
    }

    document.getElementById('detail-modal').classList.remove('active');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();

    document.getElementById('btn-signup').addEventListener('click', handleSignup);
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    document.getElementById('menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('overlay').classList.add('active');
    });

    document.getElementById('close-menu').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('overlay').classList.remove('active');
    });

    document.getElementById('overlay').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('overlay').classList.remove('active');
    });

    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        APP_STATE.currentView = view;
        renderCurrentView();
        
        document.querySelectorAll('.menu-item').forEach(i => {
          i.classList.remove('text-white');
          i.classList.add('text-gray-400');
        });
        item.classList.add('text-white');
        item.classList.remove('text-gray-400');

        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('active');
      });
    });

    document.getElementById('catalog-search').addEventListener('input', (e) => {
      APP_STATE.catalogSearch = e.target.value;
      renderCatalog();
    });

    document.getElementById('close-detail').addEventListener('click', () => {
      document.getElementById('detail-modal').classList.remove('active');
    });

    document.getElementById('save-detail-btn').addEventListener('click', saveDetailModal);

    document.getElementById('detail-owned').addEventListener('change', updateDetailButtons);
    document.getElementById('detail-wishlist').addEventListener('change', updateDetailButtons);
    document.getElementById('detail-fake').addEventListener('change', updateDetailButtons);

    document.querySelectorAll('#detail-rating-stars .star').forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating);
        updateRatingStars(rating);
      });
    });

    renderCurrentView();
  });
})();