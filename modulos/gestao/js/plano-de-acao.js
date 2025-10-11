// /modulos/gestao/js/plano-de-acao.js
// VERSÃO 1.0 (Modularizada para SPA)

import {
  getDatabase,
  ref,
  get,
  update,
  push,
  set,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { db as firestoreDb } from "../../../assets/js/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Variáveis de cache do módulo
let todasAsTarefas = [],
  gestoresCache = [],
  departamentosCache = [];
let currentUser = null; // Para saber quem está fazendo a atualização

/**
 * Função de inicialização do módulo.
 */
export async function init(user, userData) {
  console.log("[PLANO] Módulo Plano de Ação iniciado.");
  currentUser = userData; // Armazena os dados do usuário logado
  await carregarDadosIniciais();
  setupEventListeners();
}

/**
 * Carrega todos os dados necessários do Firebase (atas, gestores, departamentos).
 */
async function carregarDadosIniciais() {
  const rtDb = getDatabase();
  const atasPromise = get(ref(rtDb, "gestao/atas"));
  const deptoPromise = get(ref(rtDb, "gestao/departamentos"));
  const gestoresPromise = fetchGestores(); // Usa a função que busca do Firestore

  try {
    const [atasSnapshot, deptoSnapshot] = await Promise.all([
      atasPromise,
      deptoPromise,
      gestoresPromise,
    ]);

    if (deptoSnapshot.exists()) {
      departamentosCache = Object.values(deptoSnapshot.val())
        .map((d) => d.nome)
        .sort();
    }

    todasAsTarefas = [];
    if (atasSnapshot.exists()) {
      atasSnapshot.forEach((ataSnapshot) => {
        const ata = { id: ataSnapshot.key, ...ataSnapshot.val() };
        const dataReuniao = ata.dataReuniao
          ? new Date(ata.dataReuniao + "T00:00:00").toLocaleDateString("pt-BR")
          : "Data Indefinida";
        const origem = `${ata.tipo} - ${dataReuniao}`;

        const processarItens = (lista, tipo) => {
          if (lista) {
            Object.keys(lista).forEach((itemId) => {
              if (lista[itemId]) {
                todasAsTarefas.push({
                  ...lista[itemId],
                  type: tipo,
                  ataId: ata.id,
                  itemId: itemId,
                  origem,
                });
              }
            });
          }
        };
        processarItens(ata.planoDeAcao, "atividade");
        processarItens(ata.encaminhamentos, "encaminhamento");
      });
    }

    await verificarEMoverAtrasadas();
    renderizarQuadroKanban();
  } catch (error) {
    console.error("[PLANO] Erro ao carregar dados iniciais:", error);
    document.querySelector(
      ".kanban-board"
    ).innerHTML = `<div class="alert alert-danger">Erro ao carregar dados.</div>`;
  }
}

/**
 * Busca gestores do Firestore e armazena em cache.
 */
async function fetchGestores() {
  if (gestoresCache.length > 0) return;
  try {
    const q = query(
      collection(firestoreDb, "usuarios"),
      where("funcoes", "array-contains", "gestor"),
      orderBy("nome")
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      gestoresCache = snapshot.docs.map((doc) => ({
        nome: doc.data().nome,
        departamento: doc.data().departamento || "",
      }));
    }
  } catch (error) {
    console.error("[PLANO] Erro ao buscar gestores:", error);
  }
}

/**
 * Verifica tarefas com prazo vencido e atualiza seu status para 'Atrasado'.
 */
async function verificarEMoverAtrasadas() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const updates = {};
  const rtDb = getDatabase();

  todasAsTarefas.forEach((item) => {
    if (
      item.prazo &&
      item.status !== "Concluído" &&
      item.status !== "Atrasado"
    ) {
      const prazo = new Date(item.prazo + "T00:00:00");
      if (prazo < hoje) {
        const itemType =
          item.type === "atividade" ? "planoDeAcao" : "encaminhamentos";
        updates[`gestao/atas/${item.ataId}/${itemType}/${item.itemId}/status`] =
          "Atrasado";
        item.status = "Atrasado";
      }
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(rtDb), updates);
  }
}

/**
 * Renderiza todos os cards nas colunas corretas do Kanban.
 */
function renderizarQuadroKanban() {
  const colunas = {
    "A Fazer": document.querySelector("#coluna-a-fazer .cards-container"),
    "Em Andamento": document.querySelector(
      "#coluna-em-andamento .cards-container"
    ),
    Atrasado: document.querySelector("#coluna-atrasado .cards-container"),
    Concluído: document.querySelector("#coluna-concluido .cards-container"),
  };
  Object.values(colunas).forEach((col) => {
    if (col) col.innerHTML = "";
  });

  todasAsTarefas.forEach((item) => {
    const status = item.status || "A Fazer";
    if (colunas[status]) {
      colunas[status].innerHTML += criarCardHtml(item);
    }
  });
}

/**
 * Cria o HTML para um único card do Kanban.
 */
function criarCardHtml(item) {
  const responsavel = item.responsavel || item.nomeEncaminhado;
  const prazo = item.prazo
    ? new Date(item.prazo + "T00:00:00").toLocaleDateString("pt-BR")
    : "N/A";

  let detailsHtml = `<p>${item.descricao || item.motivo}</p>`;
  if (item.type === "encaminhamento") {
    detailsHtml = `<p><strong>Para (Depto):</strong> ${
      item.departamentoIndicado || "N/A"
    }</p><p><strong>Motivo:</strong> ${item.motivo}</p>`;
  }

  const itemIdentifier = `${item.ataId}|${
    item.type === "atividade" ? "planoDeAcao" : "encaminhamentos"
  }|${item.itemId}`;

  return `
        <div class="kanban-card card-${
          item.type
        }" data-identifier="${itemIdentifier}">
            <p><strong>Responsável:</strong> ${responsavel}</p>
            <p><strong>Prazo:</strong> ${prazo}</p>
            <div class="card-details">
                ${detailsHtml}
                <small>Origem: ${item.origem}</small>
                <div class="card-actions">
                    ${criarBotoesDeAcao(item)}
                </div>
            </div>
        </div>`;
}

/**
 * Cria os botões de ação (Mover, Concluir, etc.) para um card.
 */
function criarBotoesDeAcao(item) {
  const status = item.status || "A Fazer";
  const btnAtualizar =
    status !== "A Fazer"
      ? `<button class="action-button update-btn">Ver/Atualizar</button>`
      : "";
  let statusButtons = "";

  if (status === "A Fazer")
    statusButtons = `<button class="action-button move-btn" data-new-status="Em Andamento">Iniciar ▶</button>`;
  if (status === "Em Andamento")
    statusButtons = `<button class="action-button move-btn" data-new-status="A Fazer">◀ Voltar</button><button class="action-button move-btn" data-new-status="Concluído">✔ Concluir</button>`;
  if (status === "Atrasado")
    statusButtons = `<button class="action-button move-btn" data-new-status="Em Andamento">Retomar ▶</button><button class="action-button move-btn" data-new-status="Concluído">✔ Concluir</button>`;
  if (status === "Concluído")
    statusButtons = `<button class="action-button move-btn" data-new-status="Em Andamento">◀ Reabrir</button>`;

  return `${btnAtualizar}<div class="status-buttons">${statusButtons}</div>`;
}

/**
 * Abre o modal de atualização, preenchendo-o com os dados do item selecionado.
 */
function abrirModalAtualizacao(item, novoStatus = null) {
  const modal = document.getElementById("update-modal");
  if (!item) return;

  modal.dataset.identifier = `${item.ataId}|${
    item.type === "atividade" ? "planoDeAcao" : "encaminhamentos"
  }|${item.itemId}`;
  modal.dataset.novoStatus = novoStatus || "";

  document.getElementById("modal-title").textContent =
    "Atualizar " + (item.type === "atividade" ? "Atividade" : "Encaminhamento");
  document.getElementById(
    "modal-origem"
  ).textContent = `Origem: ${item.origem}`;

  renderizarHistorico(item.historicoAtualizacoes);

  document.getElementById("modal-nova-atualizacao").value = "";
  document.getElementById("modal-necessita-encaminhar").checked = false;
  document.getElementById("encaminhamento-vinculado-form").style.display =
    "none";

  const gestorSelect = document.getElementById("modal-enc-gestor");
  gestorSelect.innerHTML =
    '<option value="">Selecione...</option>' +
    gestoresCache
      .map((g) => `<option value="${g.nome}">${g.nome}</option>`)
      .join("");

  const deptoSelect = document.getElementById("modal-enc-departamento");
  deptoSelect.innerHTML =
    '<option value="">Selecione...</option>' +
    departamentosCache
      .map((d) => `<option value="${d}">${d}</option>`)
      .join("");

  modal.style.display = "flex";
}

/**
 * Renderiza o histórico de atualizações dentro do modal.
 */
function renderizarHistorico(historico) {
  const container = document.getElementById("historico-atualizacoes");
  if (historico) {
    container.innerHTML = Object.values(historico)
      .reverse()
      .map(
        (entrada) => `
            <div class="entrada-historico">
                <p>${entrada.texto}</p>
                <small>Por: ${entrada.responsavel} em ${new Date(
          entrada.data
        ).toLocaleString("pt-BR")}</small>
            </div>`
      )
      .join("");
  } else {
    container.innerHTML =
      '<p style="text-align:center; color:#888;">Nenhuma atualização registrada.</p>';
  }
}

/**
 * Configura todos os event listeners da página.
 */
function setupEventListeners() {
  const board = document.querySelector(".kanban-board");
  if (board) {
    board.addEventListener("click", (e) => {
      const card = e.target.closest(".kanban-card");
      if (!card) return;

      // Lógica para expandir/recolher card
      if (!e.target.closest(".card-actions")) {
        card.classList.toggle("expanded");
        return;
      }

      const identifier = card.dataset.identifier;
      const item = todasAsTarefas.find(
        (t) =>
          `${t.ataId}|${
            t.type === "atividade" ? "planoDeAcao" : "encaminhamentos"
          }|${t.itemId}` === identifier
      );

      if (e.target.classList.contains("update-btn")) {
        abrirModalAtualizacao(item);
      }
      if (e.target.classList.contains("move-btn")) {
        abrirModalAtualizacao(item, e.target.dataset.newStatus);
      }
    });
  }

  const modal = document.getElementById("update-modal");
  if (modal) {
    document.getElementById("btn-salvar-nova-atualizacao").onclick =
      handleSalvarAtualizacao;
    document.getElementById("btn-save-encaminhamento").onclick =
      handleSalvarEncaminhamento;
    document.getElementById("btn-cancel-update").onclick = () =>
      (modal.style.display = "none");

    document.getElementById("modal-necessita-encaminhar").onchange = (e) => {
      document.getElementById("encaminhamento-vinculado-form").style.display = e
        .target.checked
        ? "block"
        : "none";
    };

    document.getElementById("modal-enc-gestor").onchange = (e) => {
      const gestor = gestoresCache.find((g) => g.nome === e.target.value);
      document.getElementById("modal-enc-departamento").value =
        gestor?.departamento || "";
    };
  }
}

/**
 * Salva uma nova atualização de texto (e opcionalmente muda o status).
 */
async function handleSalvarAtualizacao() {
  const modal = document.getElementById("update-modal");
  const [ataId, itemType, itemId] = modal.dataset.identifier.split("|");
  const novoStatus = modal.dataset.novoStatus;
  const textoAtualizacao = document.getElementById(
    "modal-nova-atualizacao"
  ).value;

  if (!textoAtualizacao.trim()) {
    alert("Por favor, descreva a atualização para mover o card.");
    return;
  }

  const rtDb = getDatabase();
  const basePath = `gestao/atas/${ataId}/${itemType}/${itemId}`;
  const updates = {};

  const novaAtualizacao = {
    texto: textoAtualizacao,
    data: new Date().toISOString(),
    responsavel: currentUser?.nome || "Usuário Desconhecido",
  };

  const newUpdateRef = push(ref(rtDb, `${basePath}/historicoAtualizacoes`));
  updates[`${basePath}/historicoAtualizacoes/${newUpdateRef.key}`] =
    novaAtualizacao;

  if (novoStatus) {
    updates[`${basePath}/status`] = novoStatus;
  }

  try {
    await update(ref(rtDb), updates);
    modal.style.display = "none";
    await carregarDadosIniciais(); // Recarrega os dados para refletir as mudanças
  } catch (error) {
    console.error("Erro ao salvar atualização:", error);
    alert("Ocorreu um erro ao salvar.");
  }
}

/**
 * Salva um novo encaminhamento vinculado a partir do modal.
 */
async function handleSalvarEncaminhamento() {
  const modal = document.getElementById("update-modal");
  const [ataId] = modal.dataset.identifier.split("|");

  const novoEncaminhamento = {
    nomeEncaminhado: document.getElementById("modal-enc-gestor").value,
    departamentoIndicado: document.getElementById("modal-enc-departamento")
      .value,
    motivo: document.getElementById("modal-enc-motivo").value,
    prazo: document.getElementById("modal-enc-prazo").value,
    status: "A Fazer",
  };

  if (Object.values(novoEncaminhamento).some((v) => !v)) {
    alert("Preencha todos os campos do encaminhamento.");
    return;
  }

  try {
    const rtDb = getDatabase();
    const encaminhamentosRef = ref(
      rtDb,
      `gestao/atas/${ataId}/encaminhamentos`
    );
    await push(encaminhamentosRef, novoEncaminhamento);

    alert("Novo encaminhamento salvo!");
    document.getElementById("encaminhamento-vinculado-form").style.display =
      "none";
    document.getElementById("modal-necessita-encaminhar").checked = false;

    await carregarDadosIniciais(); // Recarrega para mostrar o novo card
  } catch (error) {
    console.error("Erro ao salvar encaminhamento:", error);
    alert("Ocorreu um erro ao salvar o encaminhamento.");
  }
}
