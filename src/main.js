import './style.css';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { WebGLEngine } from './webgl/Engine.js';
import { ModelShowcaseLoader } from './webgl/ModelLoader.js';
import { SceneEnvironment } from './webgl/Environment.js';
import { SplitSceneTimeline } from './webgl/SplitScene.js';

// Factions database
const FACTIONS = {
  fallen: {
    tag: "KOZMİK PARYALAR",
    title: "DÜŞMÜŞLER",
    crest: "/assets/emblem_fallen.png",
    description: "Yüce göklerden kovulan, kanatları ebedi ateşle kavrulmuş melekler. Dünyayı kendi yozlaşmış tasvirlerine göre yeniden inşa etmek için bozulmuş ilahi enerjiyi kuşanırlar.",
    stats: { corruption: 92, might: 85, essence: 15 },
    activeColor: "#b20d21",
    activeGlow: "rgba(178, 13, 33, 0.35)",
    cameraOffset: { x: 0, y: 1.1, z: 9.0 },
    lookAtY: 1.95,
    customizer: { corruption: 66, instability: 45 },
    lore: `
      <p><strong>İlahiyatın Düşüşü:</strong> Kırılma'dan önceki çağda, kanatlılar ordusu Gümüş Kemer'in kapılarında nöbet tutuyordu. Ancak yıldızlar soğudukça bir gerçek açığa çıktı: Işık saf değildi, yaratıcıları beslemek için boşluğun kaotik görkemini süzgeçten geçiren bir kafesti.</p>
      <p>Baş General liderliğindeki ordu, kılıçlarını içeriye çevirdi. Ortaya çıkan çatışma gök kubbeyi parçaladı. Ölümlü diyarların kalıntılarına fırlatılan meleklerin kanatları ebedi alevlerle kavruldu ve altın haleleri yozlaşmayla çatladı.</p>
      <p><strong>Mekanikler & Güç:</strong> Düşmüşler, kutsal ışık ile boşluk ateşi arasındaki sınırda güçlenirler. Yanmış kanatlarından ham kinetik kuvvet çekerek, düşman yapılarını bozan ve hayati enerjileri emen karanlık köz şelaleleri yaratırlar.</p>
    `
  },
  order: {
    tag: "KUTSAL SAVUNUCULAR",
    title: "DÜZEN",
    crest: "/assets/emblem_order.png",
    description: "Kadim ışığın solmakta olan kalıntılarına tutunan kutsal şövalyeler ve ortodoks rahiplerden oluşan fanatik bir topluluk. Çürümenin her türlü belirtisini kör edici, zalimce bir ateşle temizlerler.",
    stats: { corruption: 5, might: 60, essence: 98 },
    activeColor: "#c5a880",
    activeGlow: "rgba(197, 168, 128, 0.35)",
    cameraOffset: { x: -1.4, y: 1.5, z: 8.4 },
    lookAtY: 2.35,
    customizer: { corruption: 5, instability: 15 },
    lore: `
      <p><strong>Demir Sözleşme:</strong> Gökler parçalandığında, rahipler sınıfının hayatta kalan üyeleri birincil ışığın saçılan parçalarını topladı. Büyük Tabya'nın surları içinde, ruhlarını demir sözleşmelerle bağladılar ve yeryüzünü düşmüşlerin sapkınlığından temizlemeye yemin ettiler.</p>
      <p>Düzen, göksel kubbenin ancak mutlak bağlılık ve yapısal saflıkla yeniden inşa edilebileceğine inanır. Onlar için taviz, mutasyona doğru atılan ilk adımdır.</p>
      <p><strong>Mekanikler & Güç:</strong> Işıltılı Arma'yı kuşanan Düzen üyeleri; savunma tahkimatlarına, mutlak kinetik dirence ve iyileştirici ışık akışlarına odaklanır. Yozlaşmış varlıkları zayıflatan hacimsel kutsal aura alanlarını manipüle ederler.</p>
    `
  },
  heretics: {
    tag: "SAPKIN TARİKATÇILAR",
    title: "SAPKINLAR",
    crest: "/assets/emblem_heretics.png",
    description: "Hem Düzen'in zorbalığını hem de Düşmüşler'in deliliğini reddeden bağımsız büyücüler ve ölümlü asiler. Mutlak özgürlüklerini ilan etmek için boşluğun ham kaosunu hasat ederler.",
    stats: { corruption: 78, might: 95, essence: 8 },
    activeColor: "#691b9a",
    activeGlow: "rgba(105, 27, 154, 0.35)",
    cameraOffset: { x: 1.6, y: 0.8, z: 8.6 },
    lookAtY: 1.65,
    customizer: { corruption: 85, instability: 90 },
    lore: `
      <p><strong>Hükümran İrade:</strong> Sapkınlar hiçbir tanrıya veya boşluk yaratığına köle değildirler. Onlar, Düzen ile Düşmüşler arasındaki savaşı iki köle efendisi arasındaki bir çatışma olarak gören alimler, dışlanmışlar ve özgür düşünürlerdir. Gizli kütüphanelerden faaliyet göstererek doğrudan boşluğu dizginlemeye çalışırlar.</p>
      <p>Karanlık ateşi aklını kaybetmeden bükmek, korkunç bir odaklanma ve özel olarak işlenmiş rünik implantlar gerektirir. Başarısızlığın bedeli mutasyona uğramaktır, ancak ödülü tam bağımsızlıktır.</p>
      <p><strong>Mekanikler & Güç:</strong> Sapkınlar kararsız büyücülük, ışınlanma kapıları ve çağrılan boşluk asalaklarını kullanırlar. Camdan kale (glass-cannon) stratejilerine - hızlı çarpışma, düşman düğümlerini lanetleme ve kararsızlık alanlarını patlatma - odaklanırlar.</p>
    `
  }
};

// Character details database (Turkish Lore)
const CHARACTERS = {
  auren: {
    name: "Auren",
    title: "The Last Saint",
    lore: `
      <p>Auren, The Order tarafından insanlığın son umudu olarak yetiştirildi.</p>
      <p>Halk onu yaşayan bir aziz olarak görüyor.</p>
      <p>Ancak kullandığı kutsal güç her geçen gün bedenini değiştiriyor.</p>
      <p>Yüzünde oluşan altın çatlaklar yaklaşan dönüşümün işaretleri.</p>
      <p>Auren bir seçim yapmak zorunda kalacak: İnsanlığı kurtarmak mı? Yoksa kutsallığın son kurbanı olmak mı?</p>
    `,
    concept: "Umut",
    slogan: "If faith dies, humanity follows."
  },
  elias: {
    name: "Lyra",
    title: "The Fallen Vessel",
    lore: `
      <p>Lyra doğduğu andan itibaren kutsal enerji taşıyordu.</p>
      <p>The Order onu kutsal bir silah olarak yetiştirdi.</p>
      <p>Ancak içinde taşıdığı güç artık kontrol edilemez hale geldi.</p>
      <p>Her savaşta biraz daha değişiyor.</p>
      <p>Her zaferde insanlığından biraz daha uzaklaşıyor.</p>
    `,
    concept: "Dönüşüm",
    slogan: "I can hear them inside me."
  },
  executioner: {
    name: "Cain",
    title: "The Executor",
    lore: `
      <p>Cain, The Order'ın en sadık savaşçısıydı.</p>
      <p>Yıllar boyunca kutsallığı korumak adına sayısız infaz gerçekleştirdi.</p>
      <p>İnsanlar onu adaletin eli olarak görürken, düşmanları onu Azizin Celladı olarak anıyordu.</p>
      <p>Fakat artık Cain bile hizmet ettiği düzenin doğruluğunu sorgulamaya başlamıştır.</p>
    `,
    concept: "Adalet",
    slogan: "Mercy is weakness."
  },
  eron: {
    name: "Vesper",
    title: "The Heretic",
    lore: `
      <p>Bir zamanlar kutsal arşivlerin koruyucusuydu.</p>
      <p>Yasak metinleri keşfettiğinde tanrıların mükemmel olmadığını öğrendi.</p>
      <p>Gerçeği açıklamaya çalışınca sürgün edildi.</p>
      <p>Şimdi dünyanın dört bir yanında saklanan insanlara gerçeği anlatıyor.</p>
      <p>The Order için bir hain. Takipçileri için bir kurtarıcı.</p>
    `,
    concept: "Gerçek",
    slogan: "Faith blinded them. Truth condemned me."
  },
  throg: {
    name: "Throg",
    title: "The Abomination",
    lore: `
      <p>The Falling'den önce kutsal muhafızlardan biriydi.</p>
      <p>İlk dönüşenlerden biri oldu.</p>
      <p>İlahi enerji bedenini parçaladı ve yeniden şekillendirdi.</p>
      <p>Şimdi geriye yalnızca kırık anılar ve bitmeyen öfke kaldı.</p>
    `,
    concept: "Çürüme",
    slogan: "This is what divinity became."
  },
  orion: {
    name: "Orion",
    title: "The Watcher",
    lore: `
      <p>Orion, The Falling'e tanıklık eden birkaç kişiden biridir.</p>
      <p>Tanrıların çöküşünü kendi gözleriyle gördü.</p>
      <p>Yüzyıllardır dünyanın harabelerinde dolaşıyor.</p>
      <p>Hiçbir tarafa hizmet etmiyor.</p>
      <p>Çünkü ona göre artık kurtarılabilecek hiçbir şey kalmadı.</p>
    `,
    concept: "Bilgi",
    slogan: "I witnessed the day heaven learned how to die."
  },
  raven: {
    name: "Raven",
    title: "The Outcast",
    lore: `
      <p>Raven ne The Order'a ne de Heretic'lere güveniyor.</p>
      <p>Ailesini The Falling sırasında kaybetti.</p>
      <p>Şimdi yalnızca hayatta kalmak için savaşıyor.</p>
      <p>Onun gözünde inanç da, kutsallık da insanların yarattığı zincirlerden başka bir şey değildir.</p>
    `,
    concept: "İnsanlık",
    slogan: "Faith never saved anyone."
  },
  solarius: {
    name: "Seraphiel",
    title: "The Choir of the Fallen",
    lore: `
      <p>Bir zamanlar göklerin en yüce kutsal varlığıydı.</p>
      <p>The Falling sırasında yüzlerce kutsal ruh onun bedeninde birleşti.</p>
      <p>Artık tek bir varlık değil.</p>
      <p>Binlerce sesin aynı anda konuştuğu yaşayan bir ilahi.</p>
      <p>Dünyadaki tüm yozlaşmanın kaynağı olduğu söylenir.</p>
    `,
    concept: "Çürümüş İlahilik",
    slogan: "We were the voice of heaven. Now we are its echo."
  }
};

// State Variables
let currentFactionName = 'order';
let currentChampionName = 'solarius';
let isLoreMode = false;
let audioPlaying = false;
let isDragSeparatorActive = false;
let isInitialModelLoaded = false;
let isFakeProgressComplete = false;
let initialModelProgress = 0;

// DOM Elements
const preloader = document.getElementById('preloader');
const preloaderBarFill = document.getElementById('loader-bar-fill');
const preloaderPercent = document.getElementById('preloader-percent');
const hud = document.getElementById('hud');

const navItems = document.querySelectorAll('.nav-item');
const audioToggleBtn = document.getElementById('audio-toggle');
const ambientAudio = document.getElementById('ambient-audio');

// Faction Details
const loreOpenBtn = document.getElementById('lore-open-btn');

// Lore Split Screen Elements
const loreSplitScreen = document.getElementById('lore-split-screen');
const loreSplitExit = document.getElementById('lore-split-exit');
const splitPaneTop = document.getElementById('split-pane-top');
const splitPaneBottom = document.getElementById('split-pane-bottom');
const splitDragBar = document.getElementById('split-drag-bar');

const footerPulse = document.getElementById('footer-pulse');
const footerStatus = document.getElementById('footer-status');



// Lore Modal
const loreModal = document.getElementById('lore-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close');
const modalOverlay = document.getElementById('modal-overlay');

// Model Loader & Champion Selector Elements
const modelLoaderOverlay = document.getElementById('model-loader');
const modelProgressFill = document.getElementById('model-progress-fill');
const modelProgressPercent = document.getElementById('model-progress-percent');
const championCards = document.querySelectorAll('.champion-card');

// Character Lore Panel DOM Elements
const charName = document.getElementById('char-name');
const charTitle = document.getElementById('char-title');
const charLore = document.getElementById('char-lore');
const charConcept = document.getElementById('char-concept');
const charSlogan = document.getElementById('char-slogan');
const charPanelGlow = document.getElementById('char-panel-glow');

// Global GSAP instance attach
window.gsap = gsap;

// 1. Initialize WebGL Engine and Components
const engine = new WebGLEngine('webgl-canvas');
const modelLoader = new ModelShowcaseLoader(engine);
const environment = new SceneEnvironment(engine);
const splitTimelineScene = new SplitSceneTimeline(engine);

engine.addUpdatable(modelLoader);
engine.addUpdatable(environment);
engine.addUpdatable(splitTimelineScene);

// Initial state visibility
modelLoader.group.visible = true;
splitTimelineScene.group.visible = false;

// Start render loop
engine.start();

// 2. HUD Initialization & Entrance
switchFaction('order', false);

// Start background loading of default champion solarius (without showing the overlay)
loadChampion('solarius', false);

// Autoplay-safe audio is handled below when the user clicks the preloader entry button.

// 3. Audio Handlers
if (audioToggleBtn) {
  audioToggleBtn.addEventListener('click', () => {
    toggleAudio(!audioPlaying);
  });
}

function toggleAudio(playState) {
  audioPlaying = playState;
  const soundText = audioToggleBtn ? audioToggleBtn.querySelector('.control-text') : null;
  const soundIcon = audioToggleBtn ? audioToggleBtn.querySelector('.audio-icon') : null;

  if (audioPlaying) {
    ambientAudio.play().then(() => {
      if (soundText) soundText.innerText = "SES AÇIK";
      if (soundIcon) soundIcon.classList.add('playing');
    }).catch(e => {
      console.warn("Audio autoplay blocked.", e);
      audioPlaying = false;
      if (soundText) soundText.innerText = "SES KAPALI";
      if (soundIcon) soundIcon.classList.remove('playing');
    });
  } else {
    ambientAudio.pause();
    if (soundText) soundText.innerText = "SES KAPALI";
    if (soundIcon) soundIcon.classList.remove('playing');
  }
}

function updateCharacterPanel(championName) {
  const character = CHARACTERS[championName];
  if (!character) return;

  const charView = document.querySelector('.character-view');
  if (!charView) return;

  gsap.timeline()
    .to(charView, {
      opacity: 0,
      y: 15,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        if (charName) charName.innerText = character.name;
        if (charTitle) charTitle.innerText = character.title;
        if (charLore) charLore.innerHTML = character.lore;
        if (charConcept) charConcept.innerText = character.concept;
        if (charSlogan) charSlogan.innerText = character.slogan;
      }
    })
    .to(charView, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power2.out"
    });
}

// Champion loading logic
function loadChampion(championName, showOverlay = true) {
  currentChampionName = championName;
  
  // Update right side character info panel
  updateCharacterPanel(championName);
  
  let progressObj = { value: 0 };
  let progressTween = null;
  
  if (showOverlay && modelLoaderOverlay) {
    modelLoaderOverlay.classList.remove('hidden');
    if (modelProgressFill) modelProgressFill.style.width = '0%';
    if (modelProgressPercent) modelProgressPercent.innerText = '0%';
    const loaderStatus = modelLoaderOverlay.querySelector('.loader-status');
    if (loaderStatus) loaderStatus.innerText = `${championName.toUpperCase()} AÇIĞA ÇIKARILIYOR...`;
    
    // Start adaptive progress tween for champion switcher overlay
    progressTween = gsap.to(progressObj, {
      value: 90,
      duration: 3.5,
      ease: "power1.out",
      onUpdate: () => {
        const displayVal = Math.floor(progressObj.value);
        if (modelProgressFill) modelProgressFill.style.width = `${displayVal}%`;
        if (modelProgressPercent) modelProgressPercent.innerText = `${displayVal}%`;
      }
    });
  } else {
    // Start adaptive progress tween for initial preloader
    if (preloaderBarFill) preloaderBarFill.style.width = '0%';
    if (preloaderPercent) preloaderPercent.innerText = '0%';
    
    progressTween = gsap.to(progressObj, {
      value: 90,
      duration: 5.0,
      ease: "power1.out",
      onUpdate: () => {
        const displayVal = Math.floor(progressObj.value);
        if (preloaderBarFill) preloaderBarFill.style.width = `${displayVal}%`;
        if (preloaderPercent) preloaderPercent.innerText = `${displayVal}%`;
      }
    });
  }
  
  modelLoader.loadModel(
    championName,
    (percent) => {
      // If we get an actual progress from server, sync the tween
      if (percent > progressObj.value) {
        if (progressTween) progressTween.kill();
        progressObj.value = percent;
        if (showOverlay) {
          if (modelProgressFill) modelProgressFill.style.width = `${percent}%`;
          if (modelProgressPercent) modelProgressPercent.innerText = `${percent}%`;
        } else {
          if (preloaderBarFill) preloaderBarFill.style.width = `${percent}%`;
          if (preloaderPercent) preloaderPercent.innerText = `${percent}%`;
        }
      }
    },
    (error) => {
      if (error) {
        console.warn(`Failed to load GLTF model ${championName}:`, error);
      }
      
      if (progressTween) progressTween.kill();
      
      // Animate progress to 100% immediately
      gsap.to(progressObj, {
        value: 100,
        duration: 0.4,
        ease: "power2.out",
        onUpdate: () => {
          const displayVal = Math.floor(progressObj.value);
          if (showOverlay) {
            if (modelProgressFill) modelProgressFill.style.width = `${displayVal}%`;
            if (modelProgressPercent) modelProgressPercent.innerText = `${displayVal}%`;
          } else {
            if (preloaderBarFill) preloaderBarFill.style.width = `${displayVal}%`;
            if (preloaderPercent) preloaderPercent.innerText = `${displayVal}%`;
          }
        },
        onComplete: () => {
          if (showOverlay) {
            // Small delay for smooth exit transition
            setTimeout(() => {
              if (modelLoaderOverlay) modelLoaderOverlay.classList.add('hidden');
            }, 300);
          } else {
            isInitialModelLoaded = true;
            initialModelProgress = 100;
            
            // Show the Enter button with animation when initial load is complete
            const preloaderEnterBtn = document.getElementById('preloader-enter-btn');
            if (preloaderEnterBtn) {
              preloaderEnterBtn.classList.remove('hidden');
              gsap.fromTo(preloaderEnterBtn, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" });
              
              preloaderEnterBtn.addEventListener('click', () => {
                // Play background music immediately as user enters the page
                toggleAudio(true);
                
                // Fade out preloader smoothly with backdrop blur fading as well
                gsap.to(preloader, {
                  opacity: 0,
                  backdropFilter: "blur(0px)",
                  WebkitBackdropFilter: "blur(0px)",
                  duration: 1.2,
                  ease: "power2.out",
                  onComplete: () => {
                    preloader.style.display = 'none';
                    
                    // Slide in HUD components immediately after preloader fades out
                    gsap.fromTo('.hud-header', { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power2.out" });
                    
                    if (window.innerWidth > 900) {
                      gsap.fromTo('.panel-left', { x: -100, opacity: 0 }, { x: 0, opacity: 1, duration: 1.2, delay: 0.2, ease: "power2.out" });
                      gsap.fromTo('.panel-right', { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 1.2, delay: 0.2, ease: "power2.out" });
                    } else {
                      gsap.set('.panel-left', { clearProps: 'all' });
                      gsap.set('.panel-right', { clearProps: 'all' });
                      // Slide in the mobile HUD toggles row instead
                      gsap.fromTo('.mobile-hud-toggles', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.2, ease: "power2.out" });
                    }
                    
                    gsap.fromTo('.champion-selector-container', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, delay: 0.3, ease: "power2.out" });
                    gsap.fromTo('.hud-footer', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.4, ease: "power2.out" });
                  }
                });
              }, { once: true });
            } else {
              // Fallback if the button is missing
              if (preloader) {
                preloader.style.display = 'none';
              }
            }
          }
        }
      });
      
      // Update camera positioning based on the loaded champion (center Solarius)
      updateCameraForChampion(championName);

      // Adjust lighting for specific champions (bottom uplight for Vesper and Cain)
      engine.updateChampionLighting(championName);
    }
  );
}

// Update camera offset and target dynamically based on the active champion
function updateCameraForChampion(championName) {
  if (isLoreMode) return; // Keep centered cinematic camera in lore mode

  const faction = FACTIONS[currentFactionName];
  if (!faction) return;

  let targetX = faction.cameraOffset.x;
  let targetY = faction.cameraOffset.y;
  let targetZ = faction.cameraOffset.z;
  let targetLookAtY = faction.lookAtY;

  // Center Solarius and Orion specifically
  if (championName === 'solarius' || championName === 'orion') {
    targetX = 0.0;
    targetY = 1.2;
    targetZ = 8.4;
    targetLookAtY = 1.95;
  }

  // Adjust Auren and Elias specifically to slide them slightly up
  if (championName === 'auren' || championName === 'elias') {
    targetX = faction.cameraOffset.x;
    targetY = 1.2;
    targetZ = faction.cameraOffset.z;
    targetLookAtY = 1.95;
  }

  gsap.to(engine.cameraBasePos, {
    x: targetX,
    y: targetY,
    z: targetZ,
    duration: 2.0,
    ease: "power2.inOut"
  });

  gsap.to(engine, {
    cameraLookAtY: targetLookAtY,
    duration: 2.0,
    ease: "power2.inOut"
  });
}

// Champion Carousel Event Listeners
championCards.forEach(card => {
  card.addEventListener('click', (e) => {
    if (modelLoader.isLoading) return; // Prevent clicking while loading
    const targetCard = e.currentTarget;
    if (targetCard.classList.contains('active')) return;
    
    championCards.forEach(c => c.classList.remove('active'));
    targetCard.classList.add('active');
    
    const championName = targetCard.dataset.champion;
    loadChampion(championName);
    
    // Auto-switch faction navigation if a champion from another faction is selected
    const faction = targetCard.dataset.faction;
    if (faction !== currentFactionName) {
      currentFactionName = faction;
      navItems.forEach(n => {
        if (n.dataset.faction === faction) {
          n.classList.add('active');
        } else {
          n.classList.remove('active');
        }
      });
      switchFaction(faction, false); // Pass flag to prevent re-loading default champion
    }
  });
});

// 4. Factions Switching Logic
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    if (modelLoader.isLoading) return; // Prevent clicking while loading
    if (isLoreMode) closeSplitScreenLore();

    const targetItem = e.currentTarget;
    if (targetItem.classList.contains('active')) return;
    
    navItems.forEach(n => n.classList.remove('active'));
    targetItem.classList.add('active');
    
    const factionName = targetItem.dataset.faction;
    currentFactionName = factionName;
    
    switchFaction(factionName);
  });
});

function switchFaction(factionKey, loadDefault = true) {
  const faction = FACTIONS[factionKey];
  if (!faction) return;

  if (loadDefault) {
    const factionDefaults = {
      order: 'solarius',
      heretics: 'executioner',
      fallen: 'raven'
    };
    currentChampionName = factionDefaults[factionKey];
  }

  document.documentElement.style.setProperty('--color-active', faction.activeColor);
  document.documentElement.style.setProperty('--color-active-glow', faction.activeGlow);

  // Update model parameters matching the faction
  modelLoader.updateParameters(faction.customizer.corruption, faction.customizer.instability);

  // Camera sweep based on loaded champion
  updateCameraForChampion(currentChampionName);

  // WebGL transitions
  engine.transitionFactionLights(factionKey, 2.0);
  environment.transitionFaction(factionKey, 2.0);
  modelLoader.transitionFaction(factionKey, 2.0);
  
  // Load default champion model for the faction if requested
  if (loadDefault) {
    const factionDefaults = {
      order: 'solarius',
      heretics: 'executioner',
      fallen: 'raven'
    };
    const defaultChamp = factionDefaults[factionKey];
    
    // Update active class on cards
    championCards.forEach(c => {
      if (c.dataset.champion === defaultChamp) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
    
    loadChampion(defaultChamp);
  }
}

// 5. Split-Screen Storytelling Lore Page Integration
if (loreOpenBtn) {
  loreOpenBtn.addEventListener('click', () => {
    openSplitScreenLore();
  });
}

function openSplitScreenLore() {
  isLoreMode = true;

  // Hide Standard HUD Overlay
  gsap.to(hud, { opacity: 0, duration: 0.5, onComplete: () => {
    hud.classList.add('hidden');
    loreSplitScreen.classList.remove('hidden');
    gsap.fromTo(loreSplitScreen, { opacity: 0 }, { opacity: 1, duration: 0.6 });
  }});

  // Hide Active Champion Model, reveal Split scene
  modelLoader.group.visible = false;
  splitTimelineScene.group.visible = true;

  // Move WebGL Camera to a centered, cinematic framing
  gsap.to(engine.cameraBasePos, {
    x: 0,
    y: 0.7,
    z: 5.6,
    duration: 2.0,
    ease: "power2.inOut"
  });

  gsap.to(engine, {
    cameraLookAtY: 0.7,
    duration: 2.0,
    ease: "power2.inOut"
  });

  // Enable double clashing lights in engine
  gsap.to(engine.spotLight.color, { r: 0.95, g: 0.82, b: 0.62, duration: 1.5 }); // Holy spot gold
  gsap.to(engine.pointLight.color, { r: 0.7, g: 0.0, b: 0.1, duration: 1.5 });   // Corrupted point red

  // Disable champion bottom light in timeline mode
  engine.updateChampionLighting('none', 1.5);

  // Initialize drag bar to center (50%)
  updateSplitLayout(0.5);
}

function closeSplitScreenLore() {
  isLoreMode = false;

  gsap.to(loreSplitScreen, { opacity: 0, duration: 0.5, onComplete: () => {
    loreSplitScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    gsap.to(hud, { opacity: 1, duration: 0.6 });
  }});

  // Hide split scene timeline
  splitTimelineScene.group.visible = false;
  modelLoader.group.visible = true;

  const faction = FACTIONS[currentFactionName];
  gsap.to(engine.cameraBasePos, {
    x: faction.cameraOffset.x,
    y: faction.cameraOffset.y,
    z: faction.cameraOffset.z,
    duration: 1.5
  });
  switchFaction(currentFactionName);
}

// Drag separator physics
if (splitDragBar) {
  splitDragBar.addEventListener('mousedown', (e) => {
    isDragSeparatorActive = true;
    splitDragBar.classList.add('active');
    document.body.style.cursor = 'row-resize';
  });
}

window.addEventListener('mouseup', () => {
  if (isDragSeparatorActive) {
    isDragSeparatorActive = false;
    if (splitDragBar) splitDragBar.classList.remove('active');
    document.body.style.cursor = 'default';
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isDragSeparatorActive || !isLoreMode) return;
  
  let pct = e.clientY / window.innerHeight;
  pct = Math.max(0.15, Math.min(0.85, pct));
  
  updateSplitLayout(pct);
});

// Mobile Touch drag support
if (splitDragBar) {
  splitDragBar.addEventListener('touchstart', (e) => {
    isDragSeparatorActive = true;
    splitDragBar.classList.add('active');
  }, { passive: true });
}

window.addEventListener('touchend', () => {
  if (isDragSeparatorActive) {
    isDragSeparatorActive = false;
    if (splitDragBar) splitDragBar.classList.remove('active');
  }
});

window.addEventListener('touchmove', (e) => {
  if (!isDragSeparatorActive || !isLoreMode || e.touches.length === 0) return;
  
  let pct = e.touches[0].clientY / window.innerHeight;
  pct = Math.max(0.15, Math.min(0.85, pct));
  
  updateSplitLayout(pct);
}, { passive: true });

// Handle split resizing and WebGL clipping offset updates
function updateSplitLayout(pct) {
  if (!splitDragBar || !splitPaneTop || !splitPaneBottom) return;

  // Update CSS sizes
  splitDragBar.style.top = `${pct * 100}vh`;
  splitPaneTop.style.height = `${pct * 100}vh`;
  splitPaneBottom.style.height = `${(1 - pct) * 100}vh`;

  // Content sliding parallax calculations
  const topContent = splitPaneTop.querySelector('.split-pane-content');
  const bottomContent = splitPaneBottom.querySelector('.split-pane-content');
  
  if (topContent) {
    const topOffset = (pct - 0.5) * 120;
    topContent.style.transform = `translateY(${topOffset}px)`;
  }
  if (bottomContent) {
    const bottomOffset = (pct - 0.5) * -120;
    bottomContent.style.transform = `translateY(${bottomOffset}px)`;
  }

  // Map percentage to WebGL coordinates height
  const worldY = (0.5 - pct) * 3.2;
  
  if (splitTimelineScene) {
    splitTimelineScene.updateSplitY(worldY);
  }
}

if (loreSplitExit) {
  loreSplitExit.addEventListener('click', () => {
    closeSplitScreenLore();
  });
}


// ==========================================
// 11. 3D Model Purchase Modal Logic
// ==========================================
const purchaseModal = document.getElementById('purchase-modal');
const purchaseOverlay = document.getElementById('purchase-overlay');
const purchaseClose = document.getElementById('purchase-close');
const buyModelBtn = document.getElementById('buy-model-btn');

const purchaseCharImg = document.getElementById('purchase-char-img');
const purchaseCharFaction = document.getElementById('purchase-char-faction');
const purchaseCharName = document.getElementById('purchase-char-name');
const purchaseCharTitle = document.getElementById('purchase-char-title');

const pricingCards = document.querySelectorAll('.pricing-card');
const purchaseForm = document.getElementById('purchase-form');
const addressContainer = document.getElementById('address-container');
const purchaseAddressInput = document.getElementById('purchase-address');
const purchaseSuccess = document.getElementById('purchase-success');
const successMessage = document.getElementById('success-message');
const successCloseBtn = document.getElementById('success-close-btn');

let activePurchaseType = 'digital';

const CHAMPION_MINIATURE_IMAGES = {
  solarius: "/assets/seraphiel_miniature.png",
  orion: "/assets/orion_miniature.png",
  auren: "/assets/fallen_hero.png",
  elias: "/assets/fallen_hero.png",
  eron: "/assets/fallen_hero.png",
  executioner: "/assets/fallen_hero.png",
  raven: "/assets/fallen_hero.png",
  throg: "/assets/fallen_hero.png"
};

if (buyModelBtn) {
  buyModelBtn.addEventListener('click', () => {
    openPurchaseModal(currentChampionName);
  });
}

function openPurchaseModal(championName) {
  const character = CHARACTERS[championName];
  if (!character) return;
  
  const faction = FACTIONS[currentFactionName];
  if (!faction) return;

  // Update content
  if (purchaseCharName) purchaseCharName.innerText = character.name;
  if (purchaseCharTitle) purchaseCharTitle.innerText = character.title;
  if (purchaseCharFaction) purchaseCharFaction.innerText = faction.tag.toUpperCase();
  
  if (purchaseCharImg) {
    // Geçici yer tutucu göster
    purchaseCharImg.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 115'><rect width='100' height='115' fill='rgba(0,0,0,0.5)'/></svg>";
    purchaseCharImg.alt = "Karakter görüntüsü alınıyor...";
    
    // WebGL sahnesinden anlık görüntü yakala
    engine.captureFrame((dataUrl) => {
      purchaseCharImg.src = dataUrl;
      purchaseCharImg.alt = `${character.name} 3B Model Görünümü`;
    });
  }

  // Reset state
  activePurchaseType = 'digital';
  pricingCards.forEach(card => {
    if (card.dataset.type === 'digital') {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  
  if (addressContainer) addressContainer.classList.add('hidden');
  if (purchaseAddressInput) purchaseAddressInput.required = false;
  if (purchaseForm) {
    purchaseForm.reset();
    purchaseForm.classList.remove('hidden');
  }
  if (purchaseSuccess) purchaseSuccess.classList.add('hidden');
  
  if (purchaseModal) {
    purchaseModal.classList.remove('hidden');
    gsap.fromTo(purchaseModal.querySelector('.purchase-wrapper'), { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" });
  }
}

function closePurchaseModal() {
  if (purchaseModal && !purchaseModal.classList.contains('hidden')) {
    gsap.to(purchaseModal.querySelector('.purchase-wrapper'), {
      scale: 0.92,
      opacity: 0,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        purchaseModal.classList.add('hidden');
      }
    });
  }
}

if (purchaseClose) purchaseClose.addEventListener('click', closePurchaseModal);
if (purchaseOverlay) purchaseOverlay.addEventListener('click', closePurchaseModal);

pricingCards.forEach(card => {
  card.addEventListener('click', () => {
    pricingCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    
    activePurchaseType = card.dataset.type;
    
    if (activePurchaseType === 'physical') {
      if (addressContainer) addressContainer.classList.remove('hidden');
      if (purchaseAddressInput) purchaseAddressInput.required = true;
    } else {
      if (addressContainer) addressContainer.classList.add('hidden');
      if (purchaseAddressInput) purchaseAddressInput.required = false;
    }
  });
});

if (purchaseForm) {
  purchaseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('purchase-name').value;
    const email = document.getElementById('purchase-email').value;
    
    // Hide form, show success
    purchaseForm.classList.add('hidden');
    if (purchaseSuccess) purchaseSuccess.classList.remove('hidden');
    
    if (successMessage) {
      if (activePurchaseType === 'digital') {
        successMessage.innerHTML = `Teşekkürler <strong>${name}</strong>! 3B yazdırılabilir yüksek çözünürlüklü STL dosya indirme bağlantısı <strong>${email}</strong> adresinize gönderildi.`;
      } else {
        successMessage.innerHTML = `Teşekkürler <strong>${name}</strong>! Reçine 3B baskı siparişiniz alınmıştır. Kargo takip numarası ve fatura detayları <strong>${email}</strong> adresinize iletilecektir.`;
      }
    }
  });
}

if (successCloseBtn) {
  successCloseBtn.addEventListener('click', closePurchaseModal);
}

// 10. Fallback Modals Logic
function openLoreModal(title, bodyHTML) {
  if (modalTitle) modalTitle.innerHTML = title;
  if (modalBody) modalBody.innerHTML = bodyHTML;
  if (loreModal) loreModal.classList.remove('hidden');
}

function closeLoreModal() {
  if (loreModal) loreModal.classList.add('hidden');
}

if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeLoreModal);
if (modalOverlay) modalOverlay.addEventListener('click', closeLoreModal);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLoreModal();
    closePurchaseModal();
    if (isLoreMode) closeSplitScreenLore();
    
    // Close mobile panels
    if (factionPanel) factionPanel.classList.remove('mobile-open');
    if (characterPanel) characterPanel.classList.remove('mobile-open');
  }
});

// 11. Mobile Panel Toggle Button Click Listeners
const mobileToggleLeft = document.getElementById('mobile-toggle-left');
const mobileToggleRight = document.getElementById('mobile-toggle-right');
const closeLeftPanel = document.getElementById('close-left-panel');
const closeRightPanel = document.getElementById('close-right-panel');
const factionPanel = document.getElementById('faction-panel');
const characterPanel = document.getElementById('character-panel');

if (mobileToggleLeft && factionPanel) {
  mobileToggleLeft.addEventListener('click', () => {
    factionPanel.classList.add('mobile-open');
    if (characterPanel) characterPanel.classList.remove('mobile-open');
  });
}

if (mobileToggleRight && characterPanel) {
  mobileToggleRight.addEventListener('click', () => {
    characterPanel.classList.add('mobile-open');
    if (factionPanel) factionPanel.classList.remove('mobile-open');
  });
}

if (closeLeftPanel && factionPanel) {
  closeLeftPanel.addEventListener('click', () => {
    factionPanel.classList.remove('mobile-open');
  });
}

if (closeRightPanel && characterPanel) {
  closeRightPanel.addEventListener('click', () => {
    characterPanel.classList.remove('mobile-open');
  });
}
