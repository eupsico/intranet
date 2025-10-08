// Arquivo: /modulos/voluntario/js/supervisao.js
// Versão 3.0 (Corrigido o caminho de importação dinâmica dos módulos)

const tabContent = {
  "ficha-supervisao": "ficha-supervisao.html",
  "meus-acompanhamentos": "fichas-preenchidas.html",
  "ver-supervisores": "ver-supervisores.html",
};
const tabScripts = {
  "ficha-supervisao": "./ficha-supervisao.js",
  "meus-acompanhamentos": "./fichas-preenchidas.js",
  "ver-supervisores": "./ver-supervisores.js",
};

let db, user, userData;

export function init(dbRef, userRef, userDataRef) {
  db = dbRef;
  user = userRef;
  userData = userDataRef;

  const tabsContainer = document.getElementById("supervisao-tabs");
  if (tabsContainer) {
    // Remove listeners antigos para evitar duplicação
    const newTabsContainer = tabsContainer.cloneNode(true);
    tabsContainer.parentNode.replaceChild(newTabsContainer, tabsContainer);

    newTabsContainer.addEventListener("click", (event) => {
      const clickedTab = event.target.closest(".tab-link");
      if (clickedTab) {
        event.preventDefault();
        loadTabContent(clickedTab.dataset.tab);
      }
    });
    const initialTab = newTabsContainer.querySelector(".tab-link.active");
    if (initialTab) {
      loadTabContent(initialTab.dataset.tab);
    }
  }
}

async function loadTabContent(tabName) {
  const contentArea = document.getElementById("supervisao-content");
  if (!contentArea) return;

  document
    .querySelectorAll("#supervisao-tabs .tab-link")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelector(`.tab-link[data-tab="${tabName}"]`)
    ?.classList.add("active");

  contentArea.innerHTML = '<div class="loading-spinner"></div>';

  // O HTML já tem um caminho relativo correto (../page/), não precisa mudar
  const htmlFile = `../page/${tabContent[tabName]}`;

  // *** AQUI ESTÁ A CORREÇÃO ***
  // O caminho para o script precisa ser relativo ao arquivo JS atual.
  const scriptFile = tabScripts[tabName]; // Ex: './ver-supervisores.js'

  try {
    const response = await fetch(htmlFile);
    if (!response.ok) throw new Error(`HTML não encontrado: ${htmlFile}`);
    contentArea.innerHTML = await response.text();

    if (scriptFile) {
      // O import() resolve o caminho relativo ao arquivo atual (supervisao.js),
      // então './ver-supervisores.js' funcionará corretamente.
      const module = await import(scriptFile);
      if (module.init) {
        module.init(db, user, userData);
      }
    }
  } catch (error) {
    console.error(`Erro ao carregar aba ${tabName}:`, error);
    contentArea.innerHTML =
      '<p class="alert alert-error">Ocorreu um erro ao carregar o conteúdo.</p>';
  }
}
