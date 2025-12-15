const versionSelect = document.getElementById('versionSelect') as HTMLSelectElement;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const modGrid = document.getElementById('modGrid') as HTMLDivElement;
const modDetails = document.getElementById('modDetails') as HTMLDivElement;

type ModIndex = Record<string, string[]>;
let modIndex: ModIndex = {};
let currentMods: any[] = [];

async function loadIndex() {
  const res = await fetch('/mods/index.json');
  modIndex = await res.json();

  for (const version of Object.keys(modIndex).sort()) {
    const option = document.createElement('option');
    option.value = version;
    option.textContent = version;
    versionSelect.appendChild(option);
  }
}

versionSelect.addEventListener('change', loadMods);
searchInput.addEventListener('input', renderMods);

async function loadMods() {
  modGrid.innerHTML = '';
  modDetails.innerHTML = '<p>Select a mod to see details</p>';
  modDetails.classList.add('empty');
  currentMods = [];

  const version = versionSelect.value;
  if (!version) return;

  for (const file of modIndex[version]) {
    const res = await fetch(`/mods/${version}/${file}`);
    const mod = await res.json();
    currentMods.push(mod);
  }

  renderMods();
}

function renderMods() {
  const query = searchInput.value.toLowerCase();
  modGrid.innerHTML = '';

  for (const mod of currentMods) {
    if (!mod.name.toLowerCase().includes(query)) continue;

    const card = document.createElement('div');
    card.className = 'mod-card';
    card.innerHTML = `
      <h3>${mod.name}</h3>
      <p class="mod-version">v${mod.version}</p>
      <p class="mod-author">${mod.author}</p>
    `;

    card.onclick = () => showMod(mod);
    modGrid.appendChild(card);
  }
}

function showMod(mod: any) {
  modDetails.classList.remove('empty');
  modDetails.innerHTML = `
    <h2>${mod.name}</h2>
    <p class="description">${mod.description.replace(/\r?\n/g, '<br>')}</p>

    <div class="meta">
      <div><strong>Version:</strong> ${mod.version}</div>
      <div><strong>Author:</strong> ${mod.author}</div>
      <div><strong>Loader:</strong> ${mod.modloader}</div>
    </div>

    <a class="download" href="${mod.download}" target="_blank">
      Download
    </a>
  `;
}

loadIndex();
