import {
  db,
  getDocs,
  collection,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "../../../assets/js/firebase-init.js";

// Lista completa de status para o dropdown de mover paciente
const ALL_STATUS = {
  inscricao_documentos: "Inscrição e Documentos",
  triagem_agendada: "Triagem Agendada",
  encaminhar_para_plantao: "Encaminhar para Plantão",
  em_atendimento_plantao: "Em Atendimento (Plantão)",
  agendamento_confirmado_plantao: "Agendamento Confirmado (Plantão)",
  encaminhar_para_pb: "Encaminhar para PB",
  aguardando_info_horarios: "Aguardando Info Horários",
  cadastrar_horario_psicomanager: "Cadastrar Horário Psicomanager",
  em_atendimento_pb: "Em Atendimento (PB)",
  pacientes_parcerias: "Pacientes Parcerias",
  grupos: "Grupos",
  desistencia: "Desistência",
  alta: "Alta",
};

export function init(user, userData) {
  console.log("🚀 Módulo de Gestão de Pacientes v2.0 iniciado.");

  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("status-filter");
  const listContainer = document.getElementById("pacientes-list-container");
  const modal = document.getElementById("edit-paciente-modal");
  const modalBody = document.getElementById("modal-body-content");
  const modalTitle = document.getElementById("modal-title");
  const closeModalBtn = document.querySelector(".close-modal-btn");
  const cancelModalBtn = document.getElementById("modal-cancel-btn");
  const saveModalBtn = document.getElementById("modal-save-btn");

  let allPacientes = [];
  let currentEditingId = null;
  let currentUserData = userData; // Armazena os dados do admin logado

  // --- CARREGAMENTO E RENDERIZAÇÃO DA LISTA ---
  async function carregarPacientes() {
    listContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const q = query(
        collection(db, "trilhaPaciente"),
        orderBy("nomeCompleto")
      );
      const querySnapshot = await getDocs(q);
      allPacientes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      popularFiltroStatus();
      renderizarLista();
    } catch (error) {
      console.error("Erro ao carregar pacientes: ", error);
      listContainer.innerHTML =
        "<p class='error-text'>Não foi possível carregar os pacientes.</p>";
    }
  }

  function renderizarLista() {
    const searchTerm = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    const filteredPacientes = allPacientes.filter((p) => {
      const matchSearch =
        searchTerm === "" ||
        (p.nomeCompleto && p.nomeCompleto.toLowerCase().includes(searchTerm)) ||
        (p.cpf && p.cpf.includes(searchTerm));
      const matchStatus = status === "" || p.status === status;
      return matchSearch && matchStatus;
    });
    if (filteredPacientes.length === 0) {
      listContainer.innerHTML =
        "<p>Nenhum paciente encontrado com os filtros aplicados.</p>";
      return;
    }
    let html = '<div class="pacientes-list">';
    filteredPacientes.forEach((p) => {
      html += `
                <div class="paciente-card">
                    <div class="paciente-info">
                        <h4>${p.nomeCompleto}</h4>
                        <p><strong>CPF:</strong> ${p.cpf || "Não informado"}</p>
                        <p><strong>Status:</strong> <span class="status-badge status-${
                          p.status || "default"
                        }">${
        ALL_STATUS[p.status] || p.status || "Não definido"
      }</span></p>
                    </div>
                    <div class="paciente-actions">
                        <button class="action-button secondary btn-edit" data-id="${
                          p.id
                        }">Editar</button>
                        <button class="action-button danger btn-delete" data-id="${
                          p.id
                        }">Excluir</button>
                    </div>
                </div>`;
    });
    html += "</div>";
    listContainer.innerHTML = html;
    addEventListenersAcoes();
  }

  function popularFiltroStatus() {
    const statuses = [
      ...new Set(allPacientes.map((p) => p.status).filter(Boolean)),
    ];
    statuses.sort();
    statusFilter.innerHTML = '<option value="">Todos os Status</option>';
    statuses.forEach((s) => {
      statusFilter.innerHTML += `<option value="${s}">${
        ALL_STATUS[s] || s
      }</option>`;
    });
  }

  // --- EVENTOS ---
  searchInput.addEventListener("input", renderizarLista);
  statusFilter.addEventListener("change", renderizarLista);

  function addEventListenersAcoes() {
    document.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => abrirModalEdicao(btn.dataset.id));
    });
    document.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", () =>
        deletarPaciente(
          btn.dataset.id,
          btn.closest(".paciente-card").querySelector("h4").textContent
        )
      );
    });
  }

  // --- LÓGICA DO MODAL DE EDIÇÃO ---
  const closeModalFunction = () => (modal.style.display = "none");
  closeModalBtn.addEventListener("click", closeModalFunction);
  cancelModalBtn.addEventListener("click", closeModalFunction);

  async function abrirModalEdicao(pacienteId) {
    currentEditingId = pacienteId;
    modalTitle.textContent = "Carregando dados do paciente...";
    modalBody.innerHTML = '<div class="loading-spinner"></div>';
    modal.style.display = "flex";
    try {
      const docRef = doc(db, "trilhaPaciente", pacienteId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error("Paciente não encontrado.");
      const paciente = docSnap.data();
      modalTitle.textContent = `Editando: ${paciente.nomeCompleto}`;
      gerarFormularioEdicao(paciente);
    } catch (error) {
      console.error("Erro ao buscar dados para edição:", error);
      modalBody.innerHTML = `<p class="error-text">Erro ao carregar dados do paciente.</p>`;
    }
  }

  // NOVA FUNÇÃO PARA GERAR O FORMULÁRIO ESTRUTURADO
  function gerarFormularioEdicao(paciente) {
    // Função auxiliar para pegar valores aninhados de forma segura
    const p = (path, defaultValue = "") => {
      return (
        path.split(".").reduce((acc, part) => acc && acc[part], paciente) ||
        defaultValue
      );
    };

    let statusOptions = "";
    for (const key in ALL_STATUS) {
      statusOptions += `<option value="${key}" ${
        p("status") === key ? "selected" : ""
      }>${ALL_STATUS[key]}</option>`;
    }

    modalBody.innerHTML = `
            <form id="edit-paciente-form" class="edit-form">
                <div class="form-section">
                    <h3>Status e Movimentação</h3>
                    <div class="form-group form-group-full">
                        <label for="edit-status">Status (Mover Paciente)</label>
                        <select id="edit-status" class="form-control">${statusOptions}</select>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Dados Pessoais</h3>
                    <div class="form-group"><label>Nome Completo</label><input type="text" id="edit-nomeCompleto" class="form-control" value="${p(
                      "nomeCompleto"
                    )}"></div>
                    <div class="form-group"><label>CPF</label><input type="text" id="edit-cpf" class="form-control" value="${p(
                      "cpf"
                    )}"></div>
                    <div class="form-group"><label>Data de Nascimento</label><input type="date" id="edit-dataNascimento" class="form-control" value="${p(
                      "dataNascimento"
                    )}"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="edit-email" class="form-control" value="${p(
                      "email"
                    )}"></div>
                    <div class="form-group"><label>Telefone</label><input type="tel" id="edit-telefoneCelular" class="form-control" value="${p(
                      "telefoneCelular"
                    )}"></div>
                </div>

                <div class="form-section">
                    <h3>Endereço</h3>
                    <div class="form-group"><label>Rua</label><input type="text" id="edit-rua" class="form-control" value="${p(
                      "rua"
                    )}"></div>
                    <div class="form-group"><label>Número</label><input type="text" id="edit-numeroCasa" class="form-control" value="${p(
                      "numeroCasa"
                    )}"></div>
                    <div class="form-group"><label>Bairro</label><input type="text" id="edit-bairro" class="form-control" value="${p(
                      "bairro"
                    )}"></div>
                    <div class="form-group"><label>Cidade</label><input type="text" id="edit-cidade" class="form-control" value="${p(
                      "cidade"
                    )}"></div>
                    <div class="form-group"><label>CEP</label><input type="text" id="edit-cep" class="form-control" value="${p(
                      "cep"
                    )}"></div>
                </div>
                
                <div class="form-section">
                    <h3>Triagem e Plantão</h3>
                    <div class="form-group"><label>Valor Contribuição</label><input type="text" id="edit-valorContribuicao" class="form-control" value="${p(
                      "valorContribuicao"
                    )}"></div>
                    <div class="form-group"><label>Nome Assistente Social (Triagem)</label><input type="text" id="edit-assistenteSocialTriagemNome" class="form-control" value="${p(
                      "assistenteSocialTriagem.nome"
                    )}"></div>
                    <div class="form-group"><label>Data Agendamento Plantão</label><input type="date" id="edit-plantaoData" class="form-control" value="${p(
                      "plantaoInfo.data"
                    )}"></div>
                    <div class="form-group"><label>Hora Agendamento Plantão</label><input type="time" id="edit-plantaoHora" class="form-control" value="${p(
                      "plantaoInfo.hora"
                    )}"></div>
                    <div class="form-group form-group-full"><label>Profissional do Plantão</label><input type="text" id="edit-plantaoProfissional" class="form-control" value="${p(
                      "plantaoInfo.profissionalNome"
                    )}"></div>
                </div>

                <div class="form-section">
                    <h3>Atendimentos (PB) - Edição Avançada</h3>
                    <div class="form-group form-group-full">
                        <label>Atendimentos (JSON)</label>
                        <textarea id="edit-atendimentosPB" class="form-control" rows="6">${JSON.stringify(
                          p("atendimentosPB", []),
                          null,
                          2
                        )}</textarea>
                        <small>Edite aqui para adicionar ou remover atendimentos. Cuidado com a formatação.</small>
                    </div>
                </div>
            </form>
        `;
  }

  // NOVA LÓGICA DE SALVAMENTO
  saveModalBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    // Mapeamento dos campos aninhados
    const updatedData = {
      nomeCompleto: document.getElementById("edit-nomeCompleto").value,
      cpf: document.getElementById("edit-cpf").value,
      dataNascimento: document.getElementById("edit-dataNascimento").value,
      email: document.getElementById("edit-email").value,
      telefoneCelular: document.getElementById("edit-telefoneCelular").value,
      rua: document.getElementById("edit-rua").value,
      numeroCasa: document.getElementById("edit-numeroCasa").value,
      bairro: document.getElementById("edit-bairro").value,
      cidade: document.getElementById("edit-cidade").value,
      cep: document.getElementById("edit-cep").value,
      valorContribuicao: document.getElementById("edit-valorContribuicao")
        .value,
      status: document.getElementById("edit-status").value,

      // Campos aninhados (nested objects)
      assistenteSocialTriagem: {
        nome:
          document.getElementById("edit-assistenteSocialTriagemNome").value ||
          null,
      },
      plantaoInfo: {
        data: document.getElementById("edit-plantaoData").value || null,
        hora: document.getElementById("edit-plantaoHora").value || null,
        profissionalNome:
          document.getElementById("edit-plantaoProfissional").value || null,
      },

      lastUpdate: serverTimestamp(),
      lastUpdatedBy: currentUserData.nome || "Admin",
    };

    // Processa os campos JSON separadamente com segurança
    try {
      const atendimentosPBText = document.getElementById(
        "edit-atendimentosPB"
      ).value;
      updatedData.atendimentosPB = JSON.parse(atendimentosPBText);
    } catch (err) {
      alert(
        `Erro de formatação no campo 'Atendimentos PB (JSON)'. Verifique a estrutura dos dados (chaves, vírgulas, aspas).`
      );
      return;
    }

    saveModalBtn.disabled = true;
    saveModalBtn.textContent = "Salvando...";

    try {
      const docRef = doc(db, "trilhaPaciente", currentEditingId);
      await updateDoc(docRef, updatedData);

      // Para garantir consistência, recarregamos o paciente do banco
      const updatedDoc = await getDoc(docRef);
      if (updatedDoc.exists()) {
        const index = allPacientes.findIndex((p) => p.id === currentEditingId);
        if (index > -1) {
          allPacientes[index] = { id: updatedDoc.id, ...updatedDoc.data() };
        }
      }

      renderizarLista();
      closeModalFunction();
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      alert("Falha ao salvar. Verifique o console para mais detalhes.");
    } finally {
      saveModalBtn.disabled = false;
      saveModalBtn.textContent = "Salvar Alterações";
    }
  });

  async function deletarPaciente(pacienteId, nome) {
    if (
      confirm(
        `Tem certeza que deseja excluir permanentemente o paciente "${nome}"?\nEsta ação não pode ser desfeita.`
      )
    ) {
      try {
        await deleteDoc(doc(db, "trilhaPaciente", pacienteId));
        allPacientes = allPacientes.filter((p) => p.id !== pacienteId);
        renderizarLista();
        alert("Paciente excluído com sucesso.");
      } catch (error) {
        console.error("Erro ao excluir paciente:", error);
        alert("Falha ao excluir o paciente.");
      }
    }
  }

  // --- INICIALIZAÇÃO ---
  carregarPacientes();
}
