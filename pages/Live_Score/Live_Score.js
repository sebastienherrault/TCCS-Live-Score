
	import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
	import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
	import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
		
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
	const db = getDatabase(app);
	const auth = getAuth(app);
	const matchesRef = ref(db, 'matches');
	const updateRef = ref(db, 'lastUpdate');
	let intervalId_updateMatchClock = '';
	
	let timers = {}; // stocke les timers par match.id

	// Ecriture d'une donnée d'un match dans Firebase
	function uploadSingleMatchFieldToFirebase(match, field, value) {
		const matchfieldRef = ref(db, `matches/${match.id - 1}/${field}`); // index basé sur id
		set(matchfieldRef, value)
		.catch(err => console.error(err));
	}

    // Mise à jour et affichage de l'horlage du Header
	function updateHeaderClock() {
		const clock = document.getElementById("header-clock");
		const now = new Date();
		const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
		const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
				
		const dayName = days[now.getDay()];
		const day = now.getDate();
		const month = months[now.getMonth()];
		const year = now.getFullYear();
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');
		clock.textContent = `${dayName} ${day} ${month} ${year} - ${hours}:${minutes}:${seconds}`;
	}
    setInterval(updateHeaderClock, 1000);
    window.onload = updateHeaderClock;

	// Formatage hh:mm:ss
	function formatDuration(ms) {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
		const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
		const seconds = String(totalSeconds % 60).padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`;
	}

	// Formatage en ms
	function parseDuration(durationStr) {
		const [h, m, s] = durationStr.split(':').map(Number);
		return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;
	}

	// MAJ et enregistrement des timers de match dans Firebase
	function startTimer(match) {
		if (timers[match.id]) return;
		console.log("Start Timer:", match.id);
		timers[match.id] = setInterval(() => {
			const elapsed = Date.now() - parseDuration(match.startTime);
			match.duration = formatDuration(elapsed);
			uploadSingleMatchFieldToFirebase(match, "duration", match.duration);
		}, 1000);
	}
	
	// RAZ et enregistrement des timers de match dans Firebase
	function stopTimer(match) {
		if (timers[match.id]) {
			console.log("Stop Timer:", match.id, timers[match.id]);
			clearInterval(timers[match.id]);
			delete timers[match.id];
		}
	}
	
	function stopAllTimer() {
		console.log("Stop All Timer:", timers);

		Object.keys(timers).forEach((key) => {
		  clearInterval(timers[key]);
		});
		timers = {};
	}

	// Détection chargement d'un nouveau fichier Excel de liste des matches
	onValue(updateRef, (snapshot) => {
		const timestamp = snapshot.val();
		if (timestamp) {
			console.log("Nouveau excel detecté :", timestamp);
			intervalId_updateMatchClock = setInterval(updateMatchClock, 1000);
		}
		else {
			console.log("Aucun fichier excel chargé");
			clearInterval(intervalId_updateMatchClock);
			stopAllTimer();
		}
	});

	// Gestion timers de match dans Firebase (@1s)
	async function updateMatchClock() {
		const snapshot = await get(matchesRef);
		if (snapshot.exists()) {
			const matches = snapshot.val();
			matches.forEach(match => {
				if (match.status === 'en cours') {
					startTimer(match);
				} 
				else  {
					stopTimer(match);
				}
			});
		}
	}
    window.onload = updateMatchClock;

	// Algo de check gain du set
	function isSetWon(j1, j2) {
	  if (j1 >= 6 && j1 - j2 >= 2) return 1; // joueur 1 gagne
	  if (j2 >= 6 && j2 - j1 >= 2) return 2; // joueur 2 gagne
	  if (j1 === 7) return 1;
	  if (j2 === 7) return 2;
	  return 0; // set non terminé ou égalité
	}
	
	// Update & Formatage pour affichage des match dans la page HTML
    function loadMatches() {
		const noMatchContainer = document.getElementById('no-match');
		const scoreboardsContainer = document.getElementById('scoreboards');
		const statusContainer = document.getElementById('match-status');
		
		onValue(matchesRef, (snapshot) => {
			if(snapshot.exists())
			{
				// Effacer les anciens contenus
				noMatchContainer.innerHTML = '';				
				scoreboardsContainer.innerHTML = '';
				statusContainer.innerHTML = '';
				
				const matches = snapshot.val();
				// Tableaux des courts
				for (let courtNum = 1; courtNum <= 6; courtNum++) {
					const match = Object.values(matches).find(m => m.court == courtNum.toString()) || null;
					let courtName = courtNum === 5 ? `COURT ${courtNum} (Mimoun)` : courtNum === 6 ? `COURT ${courtNum} (Cerdan)` : `COURT ${courtNum} (Ext.)`;
						
					const div = document.createElement('div');
					div.className = 'scoreboard';

					if(match)
					{
						const color = match.status === "terminé" 
						? "#00ff00"           // vert
						: match.status === "en cours" 
						? "#27F2F5"           // bleu
						: "#007BFF";          // rouge
						
						const colorSet1j1 = (match.set1j1 == 7 || (match.set1j1 >= 6 && match.set1j1 - match.set1j2 >= 2)) ? "#38F561" : "#F2E52C";
						const colorSet2j1 = (match.set2j1 == 7 || (match.set2j1 >= 6 && match.set2j1 - match.set2j2 >= 2)) ? "#38F561" : "#F2E52C";
						const colorSet3j1 = (match.set3j1 == 7 || (match.set3j1 >= 6 && match.set3j1 - match.set3j2 >= 2)) ? "#38F561" : "#F2E52C";

						const colorSet1j2 = (match.set1j2 == 7 || (match.set1j2 >= 6 && match.set1j2 - match.set1j1 >= 2)) ? "#38F561" : "#F2E52C";
						const colorSet2j2 = (match.set2j2 == 7 || (match.set2j2 >= 6 && match.set2j2 - match.set2j1 >= 2)) ? "#38F561" : "#F2E52C";
						const colorSet3j2 = (match.set3j2 == 7 || (match.set3j2 >= 6 && match.set3j2 - match.set3j1 >= 2)) ? "#38F561" : "#F2E52C";

						div.innerHTML = `
						<div class="header">
						  <span class="court">${courtName}</span>
						  <span class="clock" style="color: ${color};">${match.duration}</span>
						</div>
						<table>
						  <thead>
							<tr>
							  <th></th>
							  <th>SET 1</th>
							  <th>SET 2</th>
							  <th>SET 3</th>
							</tr>
						  </thead>
						  <tbody>
							<tr>
							  <td class="label">${match.joueur1}</td>
							  <td style="color: ${colorSet1j1};">${match.set1j1}</td>
							  <td style="color: ${colorSet2j1};">${match.set2j1}</td>
							  <td style="color: ${colorSet3j1};">${match.set3j1}</td>
							</tr>
							<tr>
							  <td class="label">${match.joueur2}</td>
							  <td style="color: ${colorSet1j2};">${match.set1j2}</td>
							  <td style="color: ${colorSet2j2};">${match.set2j2}</td>
							  <td style="color: ${colorSet3j2};">${match.set3j2}</td>
							</tr>
						  </tbody>
						</table>
						`;
					}
					else{
						// Court sans match
						div.innerHTML = `
						<div class="header">
						  <span class="court">${courtName}</span>
						  <span class="clock" style="color: #ff3333;">00:00:00</span>
						</div>
						<table>
						  <thead>
							<tr>
							  <th></th>
							  <th>SET 1</th>
							  <th>SET 2</th>
							  <th>SET 3</th>
							</tr>
						  </thead>
						  <tbody>
							<tr>
							  <td class="label">Joueur 1</td>
							  <td>0</td>
							  <td>0</td>
							  <td>0</td>
							</tr>
							<tr>
							  <td class="label">Joueur 2</td>
							  <td>0</td>
							  <td>0</td>
							  <td>0</td>
							</tr>
						  </tbody>
						</table>
						`;						
					}
					scoreboardsContainer.appendChild(div);
				}
				
				// Matchs terminés
				const endedMatches = Object.values(matches).filter(m => m.status === "terminé");
				const endedContainer = document.createElement('div');
				endedContainer.className = 'left-column';
				endedContainer.innerHTML = `<h2 style="color:white;text-align:center;">Matchs terminés</h2>`;
				endedMatches.forEach(match => {
				  const item = document.createElement('div');
				  item.className = 'ended-match';
				  item.innerHTML = match.vainqueur === "joueur1"
					? `🏆 ${match.joueur1} <span class="vs-box">VS</span> ${match.joueur2}`
					: `${match.joueur1} <span class="vs-box">VS</span> ${match.joueur2} 🏆`;
				  endedContainer.appendChild(item);
				});

				// Matchs en attente
				const pendingMatches = Object.values(matches).filter(m => m.status === "en attente");
				const pendingContainer = document.createElement('div');
				pendingContainer.className = 'left-column';
				pendingContainer.innerHTML = `<h2 style="color:white;text-align:center;">Matchs en attente</h2>`
				pendingMatches.forEach(match => {
				  const item = document.createElement('div');
				  item.className = 'pending-match';
				  item.innerHTML = `${match.joueur1} <span class="vs-box">VS</span> ${match.joueur2}`;
				  pendingContainer.appendChild(item);
				});					
				statusContainer.appendChild(endedContainer);
				statusContainer.appendChild(pendingContainer);	
			}			
			else {
				// Effacer les anciens contenus
				noMatchContainer.innerHTML = '';				
				scoreboardsContainer.innerHTML = '';
				statusContainer.innerHTML = '';
				
				const div = document.createElement('div');
				div.id = 'no-match-message';
				div.textContent = 'Aucun match actuellement, revenez en période de tournoi !';
				noMatchContainer.appendChild(div);
			}
      });
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
	

	document.addEventListener('DOMContentLoaded', () => { 
		loadMatches(); 
	});