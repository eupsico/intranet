// Arquivo: /modulos/voluntario/js/ver-supervisores.js
// Versão: 4.0 (Migrado para a sintaxe modular do Firebase v9)

// 1. Importa as funções necessárias do Firestore v9
import {
  db, // A instância do DB já vem do firebase-init
  collection,
  query,
  where,
  getDocs,
} from "../../../assets/js/firebase-init.js";
import { agendamentoController } from "./agendamento.js";

// Variáveis de escopo do módulo
let user, userData;

export function init(dbRef, userRef, userDataRef) {
  // As referências dbRef não são mais necessárias com a importação modular,
  // mas mantemos a assinatura da função para compatibilidade com o chamador (supervisao.js)
  user = userRef;
  userData = userDataRef;

  console.log("Módulo Ver Supervisores inicializado.");
  loadSupervisores();

  const closeModalBtn = document.getElementById("close-supervisor-modal");
  const modalOverlay = document.getElementById("supervisor-modal");
  if (closeModalBtn && modalOverlay) {
    closeModalBtn.addEventListener(
      "click",
      () => (modalOverlay.style.display = "none")
    );
    modalOverlay.addEventListener("click", (event) => {
      if (event.target === modalOverlay) {
        modalOverlay.style.display = "none";
      }
    });
  }
}

async function loadSupervisores() {
  const grid = document.getElementById("supervisor-grid");
  if (!grid) return;

  grid.innerHTML = '<div class="loading-spinner"></div>';

  try {
    // 2. Cria a referência da coleção
    const supervisoresRef = collection(db, "usuarios");

    // 3. Constrói a query com a sintaxe v9
    const q = query(
      supervisoresRef,
      where("funcoes", "array-contains", "supervisor"),
      where("inativo", "==", false)
    );

    // 4. Executa a query com getDocs
    const querySnapshot = await getDocs(q);
    const supervisores = [];
    querySnapshot.forEach((doc) =>
      supervisores.push({ id: doc.id, uid: doc.id, ...doc.data() })
    );

    supervisores.sort((a, b) => a.nome.localeCompare(b.nome));
    grid.innerHTML = "";

    if (supervisores.length === 0) {
      grid.innerHTML = "<p>Nenhum supervisor encontrado.</p>";
      return;
    }

    supervisores.forEach((supervisor) => {
      const card = document.createElement("div");
      card.className = "supervisor-card";
      card.dataset.id = supervisor.id;

      let fotoSupervisor = "../../../assets/img/avatar-padrao.png";
      if (supervisor.fotoSupervisor) {
        const cleanPath = supervisor.fotoSupervisor.replace(
          "assets/img/supervisores/",
          ""
        );
        fotoSupervisor = `../../../assets/img/supervisores/${cleanPath}`;
      }

      card.innerHTML = `
                <div class="supervisor-card-header">
                    <div class="supervisor-identity">
                        <div class="supervisor-photo-container">
                            <img src="${fotoSupervisor}" alt="Foto de ${
        supervisor.nome
      }" class="supervisor-photo" onerror="this.onerror=null;this.src='../../../assets/img/avatar-padrao.png';">
                        </div>
                        <h3>${supervisor.nome || "Nome não informado"}</h3>
                    </div>
                    <div class="title-banner">${
                      supervisor.titulo || "Supervisor(a) Clínico(a)"
                    }</div>
                </div>
                <div class="supervisor-card-body">
                    <div class="supervisor-contact">
                        <p><strong>Telefone:</strong> ${
                          supervisor.telefone || "Não informado"
                        }</p>
                        <p><strong>E-mail:</strong> ${
                          supervisor.email || "Não informado"
                        }</p>
                        <p><strong>www.eupsico.org.br</strong></p>
                        <h3><p><strong>Clique para consultar o currículo.</strong></p></h3>
                    </div>
                    <div class="logo-container">
                        <img src="../../../assets/img/logo-branca.png" alt="Logo EuPsico">
                    </div>
                </div>
            `;

      card.addEventListener("click", () => openSupervisorModal(supervisor));
      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Erro ao carregar supervisores:", error);
    grid.innerHTML =
      '<p class="alert alert-error">Não foi possível carregar la lista de supervisores.</p>';
  }
}

function openSupervisorModal(supervisor) {
  const modal = document.getElementById("supervisor-modal");
  const modalBody = document.getElementById("supervisor-modal-body");

  const toList = (data) => {
    if (!data || data.length === 0) return "<ul><li>Não informado</li></ul>";
    const items = Array.isArray(data) ? data : [data];
    return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  };

  let horariosHtml = "<ul><li>Nenhum horário cadastrado.</li></ul>";
  if (
    supervisor.diasHorarios &&
    Array.isArray(supervisor.diasHorarios) &&
    supervisor.diasHorarios.length > 0
  ) {
    horariosHtml = "<ul>";
    supervisor.diasHorarios.forEach((horario) => {
      if (horario.dia && horario.inicio && horario.fim) {
        horariosHtml += `<li>${horario.dia}: das ${horario.inicio} às ${horario.fim}</li>`;
      }
    });
    horariosHtml += "</ul>";
  }

  modalBody.innerHTML = `
        <div class="profile-section">
            <h4>Formação</h4>
            ${toList(supervisor.formacao)}
        </div>
        <div class="profile-section">
            <h4>Especialização</h4>
            ${toList(supervisor.especializacao)}
        </div>
        <div class="profile-section">
            <h4>Áreas de Atuação</h4>
            ${toList(supervisor.atuacao)}
        </div>
        <div class="profile-section">
            <h4>Abordagem Teórica</h4>
            <p>${supervisor.abordagem || "Não informada"}</p>
        </div>
        <div class="profile-section">
            <h4>Informações de Contato</h4>
            <p><strong>Email:</strong> ${
              supervisor.email || "Não informado"
            }</p>
            <p><strong>Telefone:</strong> ${
              supervisor.telefone || "Não informado"
            }</p>
        </div>
        <div class="profile-section">
            <h4>Informações de Supervisão</h4>
            <p>${supervisor.supervisaoInfo || "Não informado."}</p>
        </div>
        <div class="profile-section">
            <h4>Dias e Horários para Supervisão</h4>
            ${horariosHtml}
        </div>
    `;

  const agendarBtn = modal.querySelector("#agendar-supervisao-btn");
  if (agendarBtn) {
    agendarBtn.onclick = () => {
      modal.style.display = "none";
      agendamentoController.open(db, user, userData, supervisor);
    };
  }

  modal.style.display = "flex";
}
