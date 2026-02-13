// SITE BLEU - OCEAN D'AMOUR - AVEC FIREBASE
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ref as storageRef, uploadString, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

const COLLECTION_MESSAGES = 'messages_rouge';
const COLLECTION_DESSINS = 'dessins_rouge';
const COLLECTION_DESIRS = 'desirs_rouge';
const COLLECTION_PHOTOS_RECTO = 'photos_recto_rouge';
const COLLECTION_PHOTOS_VERSO = 'photos_verso_rouge';

const AppState = {
  canvas: null,
  ctx: null,
  isDrawing: false,
  currentTool: 'brush',
  currentColor: '#dc143c',
  currentSize: 5,
  modalOuverte: null,
  modeEdition: false,
  itemEnEdition: null,
  ongletGalerieActif: 'recto',
  audioPlayer: null,
  currentTrackIndex: -1
};

const PLAYLIST = [
  {titre: 'Je t\'aime - Lara Fabian', artiste: 'Lara Fabian', pensee: 'Ces trois mots résument tout... Une déclaration puissante et passionnée. ❤️', fichier: 'musique/01-je-taime.mp3'},
  {titre: 'All of Me - John Legend', artiste: 'John Legend', pensee: 'Je te donne tout de moi, sans réserve. 🔥', fichier: 'musique/02-all-of-me.mp3'},
  {titre: 'Thinking Out Loud - Ed Sheeran', artiste: 'Ed Sheeran', pensee: 'Je penserai à toi jusqu\'à ce que nous soyons vieux et gris...', fichier: 'musique/03-thinking-out-loud.mp3'},
  {titre: 'La Vie en Rose - Edith Piaf', artiste: 'Edith Piaf', pensee: 'Tout est rose... ou plutôt rouge passion ! ❤️', fichier: 'musique/04-la-vie-en-rose.mp3'},
  {titre: 'Crazy in Love - Beyoncé', artiste: 'Beyoncé', pensee: 'Tu me rends folle/fou d\'amour ! 🔥💖', fichier: 'musique/05-crazy-in-love.mp3'},
  {titre: 'Your Song - Elton John', artiste: 'Elton John', pensee: 'Cette chanson est pour toi, du plus profond de mon cœur.', fichier: 'musique/06-your-song.mp3'},
  {titre: 'Endless Love - Diana Ross', artiste: 'Diana Ross & Lionel Richie', pensee: 'Un amour sans fin, c\'est ma promesse. ❤️', fichier: 'musique/07-endless-love.mp3'},
  {titre: 'Can\'t Help Falling in Love - Elvis', artiste: 'Elvis Presley', pensee: 'Je ne peux m\'empêcher de tomber amoureux/amoureuse. 💕', fichier: 'musique/08-cant-help-falling-in-love.mp3'}
];

// Initialisation
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🎨 Initialisation...');
  initialiserCanvas();
  initialiserEvenements();
  initialiserLecteurAudio();
  afficherPlaylist();
  await chargerDonneesFirebase();
  demarrerAnimations();
});

function initialiserCanvas() {
  AppState.canvas = document.getElementById('canvas-dessin');
  if (AppState.canvas) {
    AppState.ctx = AppState.canvas.getContext('2d');
    AppState.ctx.lineJoin = 'round';
    AppState.ctx.lineCap = 'round';
    AppState.ctx.fillStyle = 'white';
    AppState.ctx.fillRect(0, 0, AppState.canvas.width, AppState.canvas.height);
  }
}

function initialiserEvenements() {
  document.getElementById('btn-nouveau-message')?.addEventListener('click', ouvrirModalNouveauMessage);
  document.getElementById('form-message')?.addEventListener('submit', e => { e.preventDefault(); sauvegarderMessage(); });
  document.getElementById('input-message')?.addEventListener('input', e => document.getElementById('count-chars').textContent = e.target.value.length);
  
  document.getElementById('btn-nouveau-desir')?.addEventListener('click', ouvrirModalNouveauDesir);
  document.getElementById('form-desir')?.addEventListener('submit', e => { e.preventDefault(); sauvegarderDesir(); });
  document.getElementById('filtre-categorie')?.addEventListener('change', filtrerDesirs);
  document.getElementById('filtre-statut')?.addEventListener('change', filtrerDesirs);
  
  document.getElementById('upload-recto')?.addEventListener('change', e => ajouterPhotos(e, 'recto'));
  document.getElementById('upload-verso')?.addEventListener('change', e => ajouterPhotos(e, 'verso'));
  document.getElementById('form-photo')?.addEventListener('submit', e => { e.preventDefault(); sauvegarderInfoPhoto(); });
  
  if (AppState.canvas) {
    AppState.canvas.addEventListener('mousedown', demarrerDessin);
    AppState.canvas.addEventListener('mousemove', dessiner);
    AppState.canvas.addEventListener('mouseup', arreterDessin);
    AppState.canvas.addEventListener('mouseout', arreterDessin);
    AppState.canvas.addEventListener('touchstart', e => { e.preventDefault(); const touch = e.touches[0]; AppState.canvas.dispatchEvent(new MouseEvent('mousedown', {clientX: touch.clientX, clientY: touch.clientY})); });
    AppState.canvas.addEventListener('touchmove', e => { e.preventDefault(); const touch = e.touches[0]; AppState.canvas.dispatchEvent(new MouseEvent('mousemove', {clientX: touch.clientX, clientY: touch.clientY})); });
    AppState.canvas.addEventListener('touchend', e => { e.preventDefault(); AppState.canvas.dispatchEvent(new MouseEvent('mouseup', {})); });
  }
  
  document.querySelectorAll('.btn-outil').forEach(btn => btn.addEventListener('click', function() {
    document.querySelectorAll('.btn-outil').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    AppState.currentTool = this.dataset.outil;
  }));
  
  document.querySelectorAll('.btn-couleur').forEach(btn => btn.addEventListener('click', function() {
    document.querySelectorAll('.btn-couleur').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    AppState.currentColor = this.dataset.couleur;
  }));
  
  document.getElementById('color-picker')?.addEventListener('change', function() {
    AppState.currentColor = this.value;
    document.querySelectorAll('.btn-couleur').forEach(b => b.classList.remove('active'));
  });
  
  document.getElementById('brush-size')?.addEventListener('input', function() {
    AppState.currentSize = parseInt(this.value);
    document.getElementById('taille-display').textContent = this.value;
  });
  
  document.getElementById('btn-sauvegarder-dessin')?.addEventListener('click', sauvegarderDessin);
  document.getElementById('btn-telecharger-dessin')?.addEventListener('click', telechargerDessin);
  document.getElementById('btn-effacer-canvas')?.addEventListener('click', effacerCanvas);
  
  document.querySelectorAll('.modal-overlay, .btn-fermer-modal, .btn-annuler-modal').forEach(el => el.addEventListener('click', function() {
    fermerModal(this.closest('.modal').id);
  }));
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && AppState.modalOuverte) fermerModal(AppState.modalOuverte);
  });
}

function initialiserLecteurAudio() {
  AppState.audioPlayer = document.getElementById('audio-player');
  if (AppState.audioPlayer) {
    AppState.audioPlayer.addEventListener('ended', () => {
      if (AppState.currentTrackIndex < PLAYLIST.length - 1) {
        jouerPiste(AppState.currentTrackIndex + 1);
      }
    });
  }
}

function afficherPlaylist() {
  const container = document.getElementById('playlist');
  if (!container) return;
  container.innerHTML = '';
  PLAYLIST.forEach((piste, index) => {
    const carte = document.createElement('article');
    carte.className = 'carte-chanson';
    carte.onclick = () => jouerPiste(index);
    carte.innerHTML = '<div class="header-carte-chanson"><div class="numero-track"><span class="icone">🎵</span><span>Track #' + (index + 1) + '</span></div></div><div class="corps-carte-chanson"><h3 class="titre-chanson"><span class="icone">🎤</span><span>' + piste.titre + '</span></h3><div class="pensee-chanson"><span class="icone">💭</span><p class="texte-pensee">' + piste.pensee + '</p></div></div>';
    container.appendChild(carte);
  });
}

function jouerPiste(index) {
  if (!AppState.audioPlayer) return;
  const piste = PLAYLIST[index];
  AppState.currentTrackIndex = index;
  AppState.audioPlayer.src = piste.fichier;
  AppState.audioPlayer.play();
  document.getElementById('titre-piste-actuelle').textContent = piste.titre;
  document.getElementById('pensee-piste-actuelle').textContent = piste.pensee;
  document.querySelectorAll('.carte-chanson').forEach((c, i) => c.classList.toggle('playing', i === index));
}

async function chargerDonneesFirebase() {
  try {
    onSnapshot(query(collection(window.db, COLLECTION_MESSAGES), orderBy('dateCreation', 'desc')), snapshot => {
      afficherMessages(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    });
    onSnapshot(collection(window.db, COLLECTION_DESSINS), snapshot => {
      afficherDessins(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    });
    onSnapshot(collection(window.db, COLLECTION_DESIRS), snapshot => {
      afficherDesirs(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    });
    onSnapshot(collection(window.db, COLLECTION_PHOTOS_RECTO), snapshot => {
      afficherPhotos('recto', snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    });
    onSnapshot(collection(window.db, COLLECTION_PHOTOS_VERSO), snapshot => {
      afficherPhotos('verso', snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    });
  } catch (e) {
    console.error('Erreur Firebase:', e);
    afficherNotification('Erreur de connexion Firebase. Vérifiez votre configuration.', 'error');
  }
}

// Fonctions Messages
function ouvrirModalNouveauMessage() {
  AppState.modeEdition = false;
  document.getElementById('titre-modal-message').textContent = 'Nouveau Message';
  document.getElementById('form-message').reset();
  document.getElementById('count-chars').textContent = '0';
  ouvrirModal('modal-message');
}

async function sauvegarderMessage() {
  const texte = document.getElementById('input-message').value.trim();
  const tags = document.getElementById('input-tags').value.trim().split(',').map(t => t.trim()).filter(t => t);
  const humeur = document.querySelector('input[name="humeur"]:checked')?.value || 'heureux';
  if (!texte) return afficherNotification('Veuillez écrire un message', 'error');
  try {
    await addDoc(collection(window.db, COLLECTION_MESSAGES), {
      texte, tags, humeur,
      dateCreation: new Date().toISOString(),
      likes: 0
    });
    fermerModal('modal-message');
    afficherNotification('❤️ Message sauvegardé !', 'success');
  } catch (e) {
    afficherNotification('Erreur de sauvegarde', 'error');
  }
}

function afficherMessages(messages) {
  const liste = document.getElementById('liste-messages');
  const zoneVide = document.getElementById('messages-vide');
  if (!liste) return;
  if (messages.length === 0) {
    liste.innerHTML = '';
    if (zoneVide) zoneVide.style.display = 'block';
    return;
  }
  if (zoneVide) zoneVide.style.display = 'none';
  liste.innerHTML = '';
  messages.forEach((msg, idx) => {
    const carte = document.createElement('article');
    carte.className = 'carte-message';
    carte.innerHTML = '<div class="header-carte"><span class="numero-message">📝 Message #' + (messages.length - idx) + '</span></div><div class="corps-carte"><div class="texte-message">' + msg.texte + '</div>' + (msg.tags && msg.tags.length > 0 ? '<div class="tags-message">' + msg.tags.map(t => '<span class="tag">' + t + '</span>').join('') + '</div>' : '') + '</div><div class="footer-carte"><div class="meta-info"><span>⏰ ' + new Date(msg.dateCreation).toLocaleDateString('fr-FR') + '</span><span>❤️ ' + (msg.likes || 0) + ' J\'aime</span></div><div class="actions-message"><button class="btn-action" onclick="likerMessage(\'' + msg.id + '\')"><span>❤️</span> J\'aime</button><button class="btn-action" onclick="supprimerMessage(\'' + msg.id + '\')"><span>🗑️</span> Suppr</button></div></div>';
    liste.appendChild(carte);
  });
}

window.likerMessage = async function(id) {
  try {
    const docRef = doc(window.db, COLLECTION_MESSAGES, id);
    const snapshot = await getDocs(collection(window.db, COLLECTION_MESSAGES));
    const msg = snapshot.docs.find(d => d.id === id);
    if (msg) {
      await updateDoc(docRef, { likes: (msg.data().likes || 0) + 1 });
    }
  } catch (e) {
    afficherNotification('Erreur', 'error');
  }
};

window.supprimerMessage = async function(id) {
  if (!confirm('Supprimer ce message ?')) return;
  try {
    await deleteDoc(doc(window.db, COLLECTION_MESSAGES, id));
    afficherNotification('Message supprimé', 'info');
  } catch (e) {
    afficherNotification('Erreur', 'error');
  }
};

// Fonctions Canvas
function demarrerDessin(e) {
  AppState.isDrawing = true;
  const coords = getMousePos(e);
  AppState.ctx.beginPath();
  AppState.ctx.moveTo(coords.x, coords.y);
}

function dessiner(e) {
  if (!AppState.isDrawing) return;
  const coords = getMousePos(e);
  if (AppState.currentTool === 'brush' || AppState.currentTool === 'pencil') {
    AppState.ctx.strokeStyle = AppState.currentColor;
    AppState.ctx.lineWidth = AppState.currentSize;
    AppState.ctx.lineTo(coords.x, coords.y);
    AppState.ctx.stroke();
  } else if (AppState.currentTool === 'spray') {
    AppState.ctx.fillStyle = AppState.currentColor;
    for (let i = 0; i < 50; i++) {
      const offsetX = (Math.random() - 0.5) * AppState.currentSize * 2;
      const offsetY = (Math.random() - 0.5) * AppState.currentSize * 2;
      AppState.ctx.fillRect(coords.x + offsetX, coords.y + offsetY, 1, 1);
    }
  } else if (AppState.currentTool === 'eraser') {
    AppState.ctx.clearRect(coords.x - AppState.currentSize / 2, coords.y - AppState.currentSize / 2, AppState.currentSize, AppState.currentSize);
  }
}

function arreterDessin() {
  AppState.isDrawing = false;
}

function getMousePos(e) {
  const rect = AppState.canvas.getBoundingClientRect();
  const scaleX = AppState.canvas.width / rect.width;
  const scaleY = AppState.canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

async function sauvegarderDessin() {
  const dataURL = AppState.canvas.toDataURL('image/png');
  try {
    await addDoc(collection(window.db, COLLECTION_DESSINS), {
      dataURL: dataURL,
      dateCreation: new Date().toISOString()
    });
    afficherNotification('❤️ Dessin sauvegardé !', 'success');
  } catch (e) {
    afficherNotification('Erreur', 'error');
  }
}

function telechargerDessin() {
  const dataURL = AppState.canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'dessin_valentine_' + Date.now() + '.png';
  link.href = dataURL;
  link.click();
  afficherNotification('Dessin téléchargé !', 'success');
}

function effacerCanvas() {
  if (!confirm('Effacer tout ?')) return;
  AppState.ctx.fillStyle = 'white';
  AppState.ctx.fillRect(0, 0, AppState.canvas.width, AppState.canvas.height);
}

function afficherDessins(dessins) {
  const liste = document.getElementById('liste-dessins-sauvegardes');
  const zoneVide = document.getElementById('dessins-vide');
  if (!liste) return;
  if (dessins.length === 0) {
    liste.innerHTML = '';
    if (zoneVide) zoneVide.style.display = 'block';
    return;
  }
  if (zoneVide) zoneVide.style.display = 'none';
  liste.innerHTML = '';
  dessins.forEach(d => {
    const carte = document.createElement('div');
    carte.className = 'carte-dessin-miniature';
    carte.innerHTML = '<div class="preview-dessin"><img src="' + d.dataURL + '" class="image-dessin"></div><div class="info-dessin"><p class="date-dessin">' + new Date(d.dateCreation).toLocaleDateString() + '</p></div><div class="actions-dessin"><button class="btn-mini" onclick="supprimerDessin(\'' + d.id + '\')"🗑️</button></div>';
    liste.appendChild(carte);
  });
}

window.supprimerDessin = async function(id) {
  if (!confirm('Supprimer ?')) return;
  try {
    await deleteDoc(doc(window.db, COLLECTION_DESSINS, id));
    afficherNotification('Supprimé', 'info');
  } catch (e) {
    afficherNotification('Erreur', 'error');
  }
};

// Fonctions Désirs
function ouvrirModalNouveauDesir() {
  AppState.modeEdition = false;
  document.getElementById('titre-modal-desir').textContent = 'Nouveau Désir';
  document.getElementById('form-desir').reset();
  ouvrirModal('modal-desir');
}

async function sauvegarderDesir() {
  const titre = document.getElementById('input-titre-desir').value.trim();
  const description = document.getElementById('input-description-desir').value.trim();
  const priorite = parseInt(document.querySelector('input[name="priorite"]:checked')?.value || 3);
  const categorie = document.getElementById('select-categorie-desir').value;
  if (!titre || !description) return afficherNotification('Remplissez tous les champs', 'error');
  try {
    await addDoc(collection(window.db, COLLECTION_DESIRS), {
      titre, description, priorite, categorie,
      realise: false,
      dateCreation: new Date().toISOString()
    });
    fermerModal('modal-desir');
    afficherNotification('❤️ Désir sauvegardé !', 'success');
  } catch (e) {
    afficherNotification('Erreur', 'error');
  }
}

function afficherDesirs(desirs) {
  const liste = document.getElementById('liste-desirs');
  const zoneVide = document.getElementById('desirs-vide');
  if (!liste) return;
  
  const categorie = document.getElementById('filtre-categorie')?.value || 'tous';
  const statut = document.getElementById('filtre-statut')?.value || 'tous';
  
  let desirsFiltre = desirs;
  if (categorie !== 'tous') desirsFiltre = desirsFiltre.filter(d => d.categorie === categorie);
  if (statut === 'en-attente') desirsFiltre = desirsFiltre.filter(d => !d.realise);
  else if (statut === 'realise') desirsFiltre = desirsFiltre.filter(d => d.realise);
  
  if (desirsFiltre.length === 0) {
    liste.innerHTML = '';
    if (zoneVide) zoneVide.style.display = 'block';
    return;
  }
  if (zoneVide) zoneVide.style.display = 'none';
  liste.innerHTML = '';
  
  desirsFiltre.forEach(d => {
    const carte = document.createElement('article');
    carte.className = 'carte-desir' + (d.realise ? ' realise' : '');
    const etoiles = '★'.repeat(d.priorite) + '☆'.repeat(5 - d.priorite);
    carte.innerHTML = '<div class="header-carte-desir"><div class="titre-desir-groupe"><span class="icone-desir">🎁</span><h3 class="titre-desir">' + d.titre + '</h3></div><label class="checkbox-realise"><input type="checkbox" class="input-realise" ' + (d.realise ? 'checked' : '') + ' onchange="toggleRealiseDesir(\'' + d.id + '\')"></label></div><div class="corps-carte-desir"><p class="description-desir">' + d.description + '</p><div class="meta-desir"><div class="priorite-desir"><span>💎 Priorité:</span><div class="etoiles-priorite">' + etoiles + '</div></div></div></div><div class="footer-carte-desir"><button class="btn-action-desir" onclick="supprimerDesir(\'' + d.id + '\')"🗑️</button></div>';
    liste.appendChild(carte);
  });
  
  const total = desirs.length;
  const realises = desirs.filter(d => d.realise).length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-realise').textContent = realises;
  document.getElementById('stat-attente').textContent = total - realises;
}

window.toggleRealiseDesir = async function(id) {
  try {
    const snapshot = await getDocs(collection(window.db, COLLECTION_DESIRS));
    const desir = snapshot.docs.find(d => d.id === id);
    if (desir) {
      await updateDoc(doc(window.db, COLLECTION_DESIRS, id), { realise: !desir.data().realise });
    }
  } catch (e) {
    afficherNotification('Erreur', 'error');
  }
};

window.supprimerDesir = async function(id) {
  if (!confirm('Supprimer ?')) return;
  try {
    await deleteDoc(doc(window.db, COLLECTION_DESIRS, id));
    afficherNotification('Supprimé', 'info');
  } catch (e) {
    afficherNotification('Erreur', 'error');
  }
};

function filtrerDesirs() {
  const snapshot = getDocs(collection(window.db, COLLECTION_DESIRS));
  snapshot.then(s => afficherDesirs(s.docs.map(d => ({id: d.id, ...d.data()}))));
}

// Fonctions Galerie
window.changerOngletGalerie = function(onglet) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-contenu').forEach(c => c.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="' + onglet + '"]')?.classList.add('active');
  document.getElementById('tab-' + onglet)?.classList.add('active');
  AppState.ongletGalerieActif = onglet;
};

function ajouterPhotos(event, type) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      AppState.itemEnEdition = {dataURL: e.target.result, type: type};
      document.getElementById('preview-modal-photo').src = e.target.result;
      document.getElementById('input-legende-photo').value = '';
      document.getElementById('input-date-photo').value = new Date().toISOString().split('T')[0];
      ouvrirModal('modal-photo');
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

async function sauvegarderInfoPhoto() {
  if (!AppState.itemEnEdition) return;
  const legende = document.getElementById('input-legende-photo').value.trim();
  const dateSouvenir = document.getElementById('input-date-photo').value;
  if (!legende) return afficherNotification('Ajoutez une légende', 'error');
  try {
    const collectionName = AppState.itemEnEdition.type === 'recto' ? COLLECTION_PHOTOS_RECTO : COLLECTION_PHOTOS_VERSO;
    await addDoc(collection(window.db, collectionName), {
      dataURL: AppState.itemEnEdition.dataURL,
      legende, dateSouvenir,
      dateAjout: new Date().toISOString()
    });
    fermerModal('modal-photo');
    AppState.itemEnEdition = null;
    afficherNotification('❤️ Photo ajoutée !', 'success');
  } catch (e) {
    afficherNotification('Erreur', 'error');
  }
}

function afficherPhotos(type, photos) {
  const grille = document.getElementById('grille-' + type);
  const zoneVide = document.getElementById(type + '-vide');
  if (!grille) return;
  if (photos.length === 0) {
    grille.innerHTML = '';
    if (zoneVide) zoneVide.style.display = 'block';
    return;
  }
  if (zoneVide) zoneVide.style.display = 'none';
  grille.innerHTML = '';
  photos.forEach(p => {
    const carte = document.createElement('div');
    carte.className = 'carte-photo';
    carte.innerHTML = '<div class="conteneur-image" onclick="ouvrirLightbox(\'' + p.id + '\', \'' + type + '\')"><img src="' + p.dataURL + '" alt="' + p.legende + '" class="image-photo"><div class="overlay-photo"><span class="icone-zoom">🔍</span></div></div><div class="info-photo"><p class="date-photo">' + new Date(p.dateSouvenir).toLocaleDateString() + '</p><p class="legende-photo">' + p.legende + '</p></div><div class="actions-photo"><button class="btn-mini" onclick="supprimerPhoto(\'' + p.id + '\', \'' + type + '\')"🗑️</button></div>';
    grille.appendChild(carte);
  });
}

window.supprimerPhoto = async function(id, type) {
  if (!confirm('Supprimer ?')) return;
  try {
    const collectionName = type === 'recto' ? COLLECTION_PHOTOS_RECTO : COLLECTION_PHOTOS_VERSO;
    await deleteDoc(doc(window.db, collectionName, id));
    afficherNotification('Supprimé', 'info');
  } catch (e) {
    afficherNotification('Erreur', 'error');
  }
};

window.ouvrirLightbox = function(id, type) {
  // Lightbox non implémentée dans cette version condensée
};

// Utilitaires
function ouvrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    AppState.modalOuverte = modalId;
  }
}

function fermerModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    AppState.modalOuverte = null;
    const form = modal.querySelector('form');
    if (form) form.reset();
  }
}

function afficherNotification(texte, type = 'info') {
  const notif = document.createElement('div');
  notif.textContent = texte;
  Object.assign(notif.style, {
    position: 'fixed', top: '20px', right: '20px',
    background: type === 'success' ? '#5dade2' : type === 'error' ? '#e74c3c' : '#dc143c',
    color: 'white', padding: '15px 25px', borderRadius: '10px',
    boxShadow: '0 5px 20px rgba(0,0,0,0.3)', zIndex: '10000'
  });
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

window.scrollToSection = function(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
};

function demarrerAnimations() {
  const container = document.getElementById('particules-ocean');
  if (!container) return;
  setInterval(() => {
    if (container.children.length < 20) {
      const bulle = document.createElement('div');
      bulle.style.cssText = 'position:absolute;bottom:-50px;left:' + Math.random() * 100 + '%;width:' + (5 + Math.random() * 15) + 'px;height:' + (5 + Math.random() * 15) + 'px;background:radial-gradient(circle at 30% 30%, rgba(93,173,226,0.6), rgba(174,214,241,0.3));border-radius:50%;animation:monterBulle ' + (5 + Math.random() * 5) + 's linear forwards;pointer-events:none;';
      container.appendChild(bulle);
      bulle.addEventListener('animationend', () => bulle.remove());
    }
  }, 500);
  if (!document.getElementById('bulle-animation')) {
    const style = document.createElement('style');
    style.id = 'bulle-animation';
    style.textContent = '@keyframes monterBulle { 0% { bottom: -50px; opacity: 0; } 10% { opacity: 0.6; } 90% { opacity: 0.3; } 100% { bottom: 110%; opacity: 0; } }';
    document.head.appendChild(style);
  }
}


// Fonction spécifique au scroll horizontal
window.scrollToNextSection = function(sectionIndex) {
  const sections = document.querySelectorAll('.section-horizontal');
  if (sections[sectionIndex]) {
    sections[sectionIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }
};

// Mise à jour de la navigation au scroll
const container = document.querySelector('.horizontal-scroll-container');
if (container) {
  container.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.section-horizontal');
    const scrollLeft = container.scrollLeft;
    const sectionWidth = container.offsetWidth;
    const currentSection = Math.round(scrollLeft / sectionWidth);
    
    document.querySelectorAll('.nav-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === currentSection);
    });
  });
}
