// Arquivo: /modulos/voluntario/js/fichas-preenchidas.js
// Versão 2.0 (Atualizado para a sintaxe modular do Firebase v9)

import {
  db,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "../../../assets/js/firebase-init.js";

let currentUser;
let currentUserData;
let todasAsFichas = []; // Cache local das fichas para filtragem

/**
 * Função Principal (INIT): Ponto de entrada do módulo.
 */
export function init(user, userData) {
  // Usar setTimeout para garantir que o DOM da view foi carregado
  setTimeout(() => {
    currentUser = user;
    currentUserData = userData;
    carregarFichas();
  }, 0);
}

/**
 * Controla qual tela é exibida: a lista de fichas ou o formulário de edição.
 * @param {'lista' | 'form'} mostrar - A visão a ser exibida.
 */
function alternarVisao(mostrar) {
  const listaView = document.getElementById("lista-view-container");
  const formView = document.getElementById("form-view-container");
  if (!listaView || !formView) return;

  if (mostrar === "lista") {
    listaView.style.display = "block";
    formView.style.display = "none";
    formView.innerHTML = ""; // Limpa o formulário ao voltar para a lista
  } else {
    listaView.style.display = "none";
    formView.style.display = "block";
  }
}

/**
 * Busca as fichas de supervisão do usuário logado no Firestore.
 */
async function carregarFichas() {
  alternarVisao("lista");
  const container = document.getElementById("lista-fichas-container");
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    // SINTAXE V9: Criação da consulta
    const q = query(
      collection(db, "fichas-supervisao-casos"),
      where("psicologoUid", "==", currentUser.uid)
    );

    const querySnapshot = await getDocs(q); // SINTAXE V9

    todasAsFichas = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (todasAsFichas.length > 0) {
      // Ordena as fichas pela data de criação, da mais recente para a mais antiga
      todasAsFichas.sort(
        (a, b) => (b.criadoEm?.toDate() || 0) - (a.criadoEm?.toDate() || 0)
      );
    }

    renderizarLista(todasAsFichas);
    popularFiltroPacientes(todasAsFichas);

    // Recria o event listener para evitar duplicação
    const filtroPaciente = document.getElementById("filtro-paciente");
    const newFiltro = filtroPaciente.cloneNode(true);
    filtroPaciente.parentNode.replaceChild(newFiltro, filtroPaciente);
    newFiltro.addEventListener("change", aplicarFiltro);
  } catch (error) {
    console.error("Erro ao carregar fichas:", error);
    container.innerHTML =
      '<p class="alert alert-error">Ocorreu um erro ao buscar seus acompanhamentos.</p>';
  }
}

/**
 * Renderiza a lista de fichas na tela.
 * @param {Array} fichas - A lista de fichas a serem exibidas.
 */
function renderizarLista(fichas) {
  const container = document.getElementById("lista-fichas-container");
  container.innerHTML = "";
  if (fichas.length === 0) {
    container.innerHTML =
      '<p class="no-fichas-message">Nenhum acompanhamento encontrado.</p>';
    return;
  }
  fichas.forEach((ficha) => {
    const dataSupervisao = ficha.identificacaoGeral?.dataSupervisao;
    const dataFormatada = dataSupervisao
      ? new Date(dataSupervisao + "T03:00:00").toLocaleDateString("pt-BR")
      : "N/D";

    const itemEl = document.createElement("div");
    itemEl.className = "ficha-item";
    itemEl.innerHTML = `
            <div class="ficha-item-col"><p class="label">Paciente</p><p class="value paciente">${
              ficha.identificacaoCaso?.iniciais || "N/A"
            }</p></div>
            <div class="ficha-item-col"><p class="label">Supervisor(a)</p><p class="value">${
              ficha.identificacaoGeral?.supervisorNome || "N/A"
            }</p></div>
            <div class="ficha-item-col"><p class="label">Data da Supervisão</p><p class="value">${dataFormatada}</p></div>
        `;
    itemEl.addEventListener("click", () => abrirFormularioParaEdicao(ficha.id));
    container.appendChild(itemEl);
  });
}

/**
 * Carrega o HTML do formulário de edição e inicia o preenchimento.
 * @param {string} docId - O ID da ficha a ser editada.
 */
async function abrirFormularioParaEdicao(docId) {
  alternarVisao("form");
  const formContainer = document.getElementById("form-view-container");
  formContainer.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const response = await fetch("../page/editar-ficha.html");
    if (!response.ok)
      throw new Error("Falha ao carregar o HTML do formulário de edição.");
    formContainer.innerHTML = await response.text();

    await preencherEConfigurarFormularioDeEdicao(docId);

    const backButton = document.getElementById("btn-voltar-para-lista");
    if (backButton) {
      backButton.addEventListener("click", (e) => {
        e.preventDefault();
        carregarFichas(); // Recarrega a lista para garantir que os dados estejam atualizados
      });
    }
  } catch (error) {
    console.error("Erro ao abrir formulário para edição:", error);
    formContainer.innerHTML =
      '<p class="alert alert-error">Não foi possível carregar o formulário de edição.</p>';
  }
}

/**
 * Busca os dados da ficha no Firestore e preenche o formulário de edição.
 * @param {string} docId - O ID da ficha a ser preenchida.
 */
async function preencherEConfigurarFormularioDeEdicao(docId) {
  const docRef = doc(db, "fichas-supervisao-casos", docId); // SINTAXE V9
  const docSnap = await getDoc(docRef); // SINTAXE V9

  if (!docSnap.exists()) {
    throw new Error("Documento da ficha não encontrado no Firestore.");
  }
  const data = docSnap.data();

  const loadSupervisores = async () => {
    const select = document.getElementById("supervisor-nome");
    if (!select) return;
    select.innerHTML = '<option value="">Carregando...</option>';
    try {
      const q = query(
        collection(db, "usuarios"),
        where("funcoes", "array-contains", "supervisor"),
        where("inativo", "==", false)
      );
      const querySnapshot = await getDocs(q);

      const supervisores = [];
      querySnapshot.forEach((doc) =>
        supervisores.push({ uid: doc.id, ...doc.data() })
      );
      supervisores.sort((a, b) => a.nome.localeCompare(b.nome));

      select.innerHTML = '<option value="">Selecione um supervisor</option>';
      supervisores.forEach((supervisor) => {
        select.innerHTML += `<option value="${supervisor.uid}" data-nome="${supervisor.nome}">${supervisor.nome}</option>`;
      });
    } catch (error) {
      console.error("Erro ao carregar supervisores:", error);
      select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
  };

  const setFieldValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  await loadSupervisores();

  // Preenchimento dos campos com base na estrutura de dados
  setFieldValue("supervisor-nome", data.identificacaoGeral?.supervisorUid);
  setFieldValue("data-supervisao", data.identificacaoGeral?.dataSupervisao);
  setFieldValue(
    "data-inicio-terapia",
    data.identificacaoGeral?.dataInicioTerapia
  );
  setFieldValue("psicologo-nome", data.psicologoNome);
  setFieldValue("psicologo-periodo", data.identificacaoPsicologo?.periodo);
  setFieldValue("abordagem-teorica", data.identificacaoPsicologo?.abordagem);
  setFieldValue("paciente-iniciais", data.identificacaoCaso?.iniciais);
  setFieldValue("paciente-idade", data.identificacaoCaso?.idade);
  setFieldValue("paciente-genero", data.identificacaoCaso?.genero);
  setFieldValue("paciente-sessoes", data.identificacaoCaso?.numSessoes);
  setFieldValue("queixa-demanda", data.identificacaoCaso?.queixa);

  // Preenchimento das Fases
  for (let i = 1; i <= 3; i++) {
    setFieldValue(`fase${i}-data`, data[`fase${i}`]?.data);
    setFieldValue(`fase${i}-foco`, data[`fase${i}`]?.foco);
    setFieldValue(`fase${i}-objetivos`, data[`fase${i}`]?.objetivos);
    setFieldValue(`fase${i}-hipoteses`, data[`fase${i}`]?.hipoteses);
    setFieldValue(`fase${i}-reavaliacao`, data[`fase${i}`]?.reavaliacao);
    setFieldValue(`fase${i}-progresso`, data[`fase${i}`]?.progresso);
    setFieldValue(`fase${i}-avaliacao`, data[`fase${i}`]?.avaliacao);
    setFieldValue(`fase${i}-mudancas`, data[`fase${i}`]?.mudancas);
    setFieldValue(`fase${i}-obs-supervisor`, data[`fase${i}`]?.obsSupervisor);
  }

  setFieldValue("desfecho", data.observacoesFinais?.desfecho);
  setFieldValue("data-desfecho", data.observacoesFinais?.dataDesfecho);
  setFieldValue("obs-finais", data.observacoesFinais?.obsFinais);
  setFieldValue("obs-finais-supervisor", data.observacoesFinais?.obsSupervisor);
  setFieldValue(
    "assinatura-supervisor",
    data.observacoesFinais?.assinaturaSupervisor
  );

  setupAutoSave(docRef);
}

/**
 * Configura o salvamento automático para o formulário de edição.
 * @param {DocumentReference} docRef - A referência do documento no Firestore.
 */
function setupAutoSave(docRef) {
  const form = document.getElementById("form-supervisao");
  const statusEl = document.getElementById("autosave-status");
  let saveTimeout;

  const getFormData = () => {
    const supervisorSelect = document.getElementById("supervisor-nome");
    const selectedOption =
      supervisorSelect.options[supervisorSelect.selectedIndex];

    return {
      lastUpdated: serverTimestamp(), // SINTAXE V9
      identificacaoGeral: {
        supervisorUid: document.getElementById("supervisor-nome").value,
        supervisorNome: selectedOption.dataset.nome || "",
        dataSupervisao: document.getElementById("data-supervisao").value,
        dataInicioTerapia: document.getElementById("data-inicio-terapia").value,
      },
      identificacaoPsicologo: {
        periodo: document.getElementById("psicologo-periodo").value,
        abordagem: document.getElementById("abordagem-teorica").value,
      },
      identificacaoCaso: {
        iniciais: document
          .getElementById("paciente-iniciais")
          .value.toUpperCase(),
        idade: document.getElementById("paciente-idade").value,
        genero: document.getElementById("paciente-genero").value,
        numSessoes: document.getElementById("paciente-sessoes").value,
        queixa: document.getElementById("queixa-demanda").value,
      },
      fase1: {
        data: document.getElementById("fase1-data").value,
        foco: document.getElementById("fase1-foco").value,
        objetivos: document.getElementById("fase1-objetivos").value,
        hipoteses: document.getElementById("fase1-hipoteses").value,
      },
      fase2: {
        data: document.getElementById("fase2-data").value,
        reavaliacao: document.getElementById("fase2-reavaliacao").value,
        progresso: document.getElementById("fase2-progresso").value,
      },
      fase3: {
        data: document.getElementById("fase3-data").value,
        avaliacao: document.getElementById("fase3-avaliacao").value,
        mudancas: document.getElementById("fase3-mudancas").value,
      },
      observacoesFinais: {
        desfecho: document.getElementById("desfecho").value,
        dataDesfecho: document.getElementById("data-desfecho").value,
        obsFinais: document.getElementById("obs-finais").value,
      },
    };
  };

  const handleFormChange = () => {
    clearTimeout(saveTimeout);
    statusEl.textContent = "Salvando...";
    statusEl.className = "status-saving";

    saveTimeout = setTimeout(async () => {
      const dataToSave = getFormData();
      try {
        await updateDoc(docRef, dataToSave); // SINTAXE V9
        statusEl.textContent = "Salvo!";
        statusEl.className = "status-success";
      } catch (error) {
        console.error("Erro no salvamento automático:", error);
        statusEl.textContent = "Erro ao salvar.";
        statusEl.className = "status-error";
      }
    }, 1500);
  };

  form.addEventListener("input", handleFormChange);
}

/**
 * Popula o filtro de pacientes com base nas fichas carregadas.
 */
function popularFiltroPacientes(fichas) {
  const filtroSelect = document.getElementById("filtro-paciente");
  // Cria um conjunto de iniciais únicas, filtra valores vazios e ordena
  const iniciais = [
    ...new Set(fichas.map((f) => f.identificacaoCaso?.iniciais)),
  ]
    .filter(Boolean)
    .sort();

  filtroSelect.innerHTML = '<option value="todos">Todos os Pacientes</option>';
  iniciais.forEach((i) => {
    filtroSelect.innerHTML += `<option value="${i}">${i}</option>`;
  });
}

/**
 * Filtra a lista de fichas com base no paciente selecionado.
 */
function aplicarFiltro() {
  const valor = document.getElementById("filtro-paciente").value;
  const fichasFiltradas =
    valor === "todos"
      ? todasAsFichas
      : todasAsFichas.filter((f) => f.identificacaoCaso?.iniciais === valor);
  renderizarLista(fichasFiltradas);
}
