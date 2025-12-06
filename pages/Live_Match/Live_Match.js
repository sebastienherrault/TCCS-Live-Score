
	// Import the functions you need from the SDKs you need
	import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
	import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
	import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
	
	// TODO: Add SDKs for Firebase products that you want to use
	// https://firebase.google.com/docs/web/setup#available-libraries

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

	// Initialize Firebase
	const app = initializeApp(firebaseConfig);
	const auth = getAuth(app);
	const db = getDatabase(app);
	const matchesRef = ref(db, 'matches');
	const excelFileRef = ref(db, 'excelFile');
	const updatesRef = ref(db, 'lastUpdate');
	const guard = document.getElementById('guard');
	const appRoot = document.getElementById('app');
	const whoami = document.getElementById('whoami');

	let matches = [];

	// Check le statut d'authentification utilisateur
	onAuthStateChanged(auth, (user) => {
	  if (!user) {
		// Non connecté -> retour au login
		window.location.href = "index.html";
		return;
	  }
	  // Connecté -> révèle l’app
	  guard.style.display = 'none';
	  appRoot.style.display = 'block';
	  whoami.textContent = user.email || 'Connecté';
	  // console.log(user);
	});
	document.getElementById('logout').addEventListener('click', async () => {
	  try {
		await signOut(auth);
	  } finally {
		window.location.href = "index.html";
	  }
	});


	// Lecture des données dans la base Firebase
	async function ReadFromFirebase() {
		try {	
			const snapshot = await get(matchesRef);			
			if (snapshot.exists()) {
				matches = snapshot.val();
				console.log("ReadFromFirebase :", matches);
			} else {
				console.log("ReadFromFirebase : Aucune donnée trouvée dans Firebase.");
				matches = [];
			}
		} catch (error) {
		console.error("Erreur lors de la lecture des données :", error);
		matches = [];
		}
	}

	document.addEventListener('DOMContentLoaded', async () => {
		console.log("Listener DOMContentLoaded");
		await ReadFromFirebase();
		displayMatches();
	});


	// Lecture des données depuis fichier Excel, enregistrement dans Firebase et affichage des matchs
    document.getElementById('fileInput').addEventListener('change', (e) => {
		const file = e.target.files[0];
		const reader = new FileReader();
		reader.onload = function(evt) {
			const data = new Uint8Array(evt.target.result);
			const workbook = XLSX.read(data, { type: 'array' });
			const sheet = workbook.Sheets[workbook.SheetNames[0]];
			const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

			matches = [];
			for (let i = 1; i < rows.length; i++) {
			  if (!rows[i]|| rows[i].length < 3) continue;
			  matches.push({
				id: rows[i][0],
				joueur1: rows[i][1],
				joueur2: rows[i][2],
				court: rows[i][3] || "",
				set1j1: rows[i][4] || 0,
				set1j2: rows[i][5] || 0,
				set2j1: rows[i][6] || 0,
				set2j2: rows[i][7] || 0,
				set3j1: rows[i][8] || 0,
				set3j2: rows[i][9] || 0,
				status: rows[i][10] || "en attente",
				startTime : rows[i][11] || "00:00:00",
				duration : rows[i][12] || "00:00:00",
				vainqueur : rows[i][13] || "",
			  });
			}

			//localStorage.setItem('matches', JSON.stringify(matches));
			console.log("Excel file loaded :", file);
			uploadMatchesToFirebase();
			displayMatches();
		};
		reader.readAsArrayBuffer(file);
		set(excelFileRef, file.name);
    });
	
	// Formatage pour affichage des matchs dans la page HTML
	function displayMatches() {
		const container = document.getElementById('forms');
		container.innerHTML = ""; // Nettoyer avant d'afficher

		if (!matches || matches.length === 0) {
			// matches est null, undefined ou vide
			const div = document.createElement('div');
			div.id = 'no-match-message';
			div.textContent = "Aucun match actuellement disponible, veuillez charger une feuille de match !";
			container.appendChild(div);		  
			return;
		}

		matches.forEach(match => {
			const formDiv = document.createElement('div');
			formDiv.className = 'grid';
			formDiv.innerHTML = `
			<h3>Match ${match.id}</h3>
			<p><strong>${match.joueur1}</strong> vs <strong>${match.joueur2}</strong></p>
			`;
			container.appendChild(formDiv);
		});
	}
	
	// Ecriture de la table des matchs dans Firebase
	function uploadMatchesToFirebase() {
		if (matches.length === 0) {
		  alert("Aucun match à importer !");
		  return;
		}
		// ✅ Écriture dans Firebase
		set(ref(db, 'matches'), matches)
		 // .then(() => alert("Liste des matchs importée avec succès dans Firebase !"))
		  .catch(err => console.error(err));
		  
		set(updatesRef, Date.now());
	}

	// Effacement de la table des matchs dans Firebase
	function ClearDataFirebase() {
		const lastUpdateRef = ref(db, 'lastUpdate');
		const lastDataUpdateRef = ref(db, 'lastDataUpdate');
		const matchesRef = ref(db, 'matches');
		const excelFileRef = ref(db, 'excelFile');
		
		matches = [];
		
		remove(lastUpdateRef);
		remove(lastDataUpdateRef);
		remove(matchesRef);
		remove(excelFileRef);
		displayMatches();
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
	
	// Bouton chargement fichier Excel
	document.getElementById('openExcel').addEventListener('click', () => { document.getElementById('fileInput').click(); });
	document.getElementById('fileInput').addEventListener('click', () => { fileInput.value = ''; });
	
	// Bouton effacement de la table des matchs dans Firebase
	document.getElementById('deleteBtn').addEventListener('click', () => { ClearDataFirebase();});
	