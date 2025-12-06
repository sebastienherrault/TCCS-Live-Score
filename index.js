
    // === Firebase (modular v10) ===
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
    import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

	// Your web app's Firebase configuration
	// For Firebase JS SDK v7.20.0 and later, measurementId is optional
	const firebaseConfig = {
		apiKey: "AIzaSyBk63PQRrlg6647pGw5Dof5-I-LCLexJrg",
		authDomain: "tccs-live-score.firebaseapp.com",
		databaseURL: "https://tccs-live-score-default-rtdb.europe-west1.firebasedatabase.app",
		projectId: "tccs-live-score",
		storageBucket: "tccs-live-score.firebasestorage.app",
		messagingSenderId: "142574190845",
		appId: "1:142574190845:web:654340ce971abe7cf8fe94",
		measurementId: "G-E2Q9H3JRDG"
	};

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // ===== UI helpers =====
    const $ = (sel, root=document) => root.querySelector(sel);
    const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

    const authStatus = $('#auth-status');
    const loginBtn = $('#login-btn');
    const logoutBtn = $('#logout-btn');
    const modal = $('#modal-backdrop');
    const emailInput = $('#email');
    const passwordInput = $('#password');
    const loginError = $('#login-error');
    const cancelLogin = $('#cancel-login');
    const doLogin = $('#do-login');
    const remember = $('#remember');
    const showSignup = $('#show-signup');
    const signupBlock = $('#signup-block');
    const doSignup = $('#do-signup');

    let pendingRedirect = null;

    function openLogin(targetUrl = null) {
      pendingRedirect = targetUrl;
      modal.style.display = 'flex';
      loginError.textContent = '';
      setTimeout(() => emailInput.focus(), 0);
    }
    function closeLogin() {
      modal.style.display = 'none';
      pendingRedirect = null;
    }

    loginBtn.addEventListener('click', () => openLogin());
    cancelLogin.addEventListener('click', () => closeLogin());

    // Intercepter les liens protégés
    $$('.card[data-protected="true"]').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        if (!auth.currentUser) {
          e.preventDefault();
          openLogin(target);
        } else {
          // déjà connecté → navigue
          if (target) window.location.href = target;
        }
      });
    });

    // Connexion
    async function login() {
      try {
        const persistence = remember.checked ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        const email = emailInput.value.trim();
        const pass = passwordInput.value;
        await signInWithEmailAndPassword(auth, email, pass);
        loginError.textContent = '';
        closeLogin();
        if (pendingRedirect) {
          const url = pendingRedirect; pendingRedirect = null; window.location.href = url;
        }
      } catch (err) {
        console.error(err);
        loginError.textContent = normalizeAuthError(err);
      }
    }
    doLogin.addEventListener('click', login);
    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });

    // Création (optionnelle) – à n'utiliser que si tu autorises l'inscription
    async function signup() {
      try {
        const email = emailInput.value.trim();
        const pass = passwordInput.value;
        await createUserWithEmailAndPassword(auth, email, pass);
        loginError.textContent = '';
        closeLogin();
        if (pendingRedirect) { const url = pendingRedirect; pendingRedirect = null; window.location.href = url; }
      } catch (err) {
        console.error(err);
        loginError.textContent = normalizeAuthError(err);
      }
    }

    // Déconnexion
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error(err);
      }
    });

    // Observer l'état
    onAuthStateChanged(auth, (user) => {
      if (user) {
        authStatus.textContent = `Connecté : ${user.email ?? 'Utilisateur'}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
      } else {
        authStatus.textContent = 'Non connecté';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
      }
    });

    function normalizeAuthError(err) {
      const code = err?.code || '';
      if (code.includes('auth/invalid-email')) return 'Email invalide.';
      if (code.includes('auth/missing-password')) return 'Mot de passe manquant.';
      if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) return 'Email ou mot de passe incorrect.';
      if (code.includes('auth/user-not-found')) return "Aucun compte n'est associé à cet email.";
      if (code.includes('auth/weak-password')) return 'Mot de passe trop faible (6+ caractères).';
      if (code.includes('auth/email-already-in-use')) return 'Un compte existe déjà avec cet email.';
      return 'Erreur de connexion. Réessaie.';
    }

	// Gestion Menu de navigation
	(function () {
    const btn = document.getElementById('hamburgerBtn');
    const menu = document.getElementById('dropdownMenu');
    if (!btn || !menu) return;

    const links = [...menu.querySelectorAll('a[role="menuitem"]')];

    // Page active
    const current = location.pathname.split('/').pop() || 'index.html';
    links.forEach(a => {
      if (a.getAttribute('href') === current) a.classList.add('active');
      if (a.dataset.title && !a.title) a.title = a.dataset.title; // tooltip natif
    });

    // Ouvrir/fermer
    const openMenu = () => {
      menu.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      // Focus sur le 1er lien pour l’accessibilité
      setTimeout(() => links[0]?.focus(), 0);
      document.addEventListener('click', outsideClose, { once: true });
      document.addEventListener('keydown', onKey);
    };
    const closeMenu = () => {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey);
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');
      isOpen ? closeMenu() : openMenu();
    });

    // Fermer si clic à l’extérieur
    const outsideClose = (e) => {
      if (!menu.contains(e.target) && e.target !== btn) closeMenu();
    };

    // Clavier: Esc ferme, flèches naviguent, Tab cycle dans le menu
    function onKey(e) {
      const focusIndex = links.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault(); closeMenu(); btn.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const i = (focusIndex + 1) % links.length;
        links[i]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const i = (focusIndex - 1 + links.length) % links.length;
        links[i]?.focus();
      }
    }
  })();	