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
  console.log(
    "🚀 Módulo de Gestão de Pacientes v3.0 (Formulário Completo) iniciado."
  );

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
  let currentUserData = userData;

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
                        <h4>${p.nomeCompleto || "Paciente sem nome"}</h4>
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

  searchInput.addEventListener("input", renderizarLista);
  statusFilter.addEventListener("change", renderizarLista);

  function addEventListenersAcoes() {
    document
      .querySelectorAll(".btn-edit")
      .forEach((btn) =>
        btn.addEventListener("click", () => abrirModalEdicao(btn.dataset.id))
      );
    document
      .querySelectorAll(".btn-delete")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          deletarPaciente(
            btn.dataset.id,
            btn.closest(".paciente-card").querySelector("h4").textContent
          )
        )
      );
  }

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

  function gerarFormularioEdicao(paciente) {
    const p = (path, defaultValue = "") =>
      path.split(".").reduce((acc, part) => acc && acc[part], paciente) ||
      defaultValue;
    const ativoPB =
      paciente.atendimentosPB?.find((at) => at.statusAtendimento === "ativo") ||
      {};

    let statusOptions = Object.keys(ALL_STATUS)
      .map(
        (key) =>
          `<option value="${key}" ${p("status") === key ? "selected" : ""}>${
            ALL_STATUS[key]
          }</option>`
      )
      .join("");

    modalBody.innerHTML = `
            <form id="edit-paciente-form" class="edit-form">
                <div class="form-section">
                    <h3>Status e Movimentação</h3>
                    <div class="form-group form-group-full"><label for="edit-status">Status (Mover Paciente)</label><select id="edit-status" class="form-control">${statusOptions}</select></div>
                </div>

                <div class="form-section">
                    <h3>Dados de Inscrição</h3>
                    <div class="form-group"><label>Nome Completo</label><input type="text" id="edit-nomeCompleto" value="${p(
                      "nomeCompleto"
                    )}"></div>
                    <div class="form-group"><label>CPF</label><input type="text" id="edit-cpf" value="${p(
                      "cpf"
                    )}"></div>
                    <div class="form-group"><label>Data de Nasc.</label><input type="date" id="edit-dataNascimento" value="${p(
                      "dataNascimento"
                    )}"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="edit-email" value="${p(
                      "email"
                    )}"></div>
                    <div class="form-group"><label>Telefone</label><input type="tel" id="edit-telefoneCelular" value="${p(
                      "telefoneCelular"
                    )}"></div>
                    <div class="form-group"><label>Como Conheceu</label><input type="text" id="edit-comoConheceu" value="${p(
                      "comoConheceu"
                    )}"></div>
                    <div class="form-group form-group-full"><label>Motivo da Busca</label><textarea id="edit-motivoBusca" rows="3">${p(
                      "motivoBusca"
                    )}</textarea></div>
                </div>

                <div class="form-section">
                    <h3>Dados da Triagem</h3>
                    <div class="form-group"><label>Queixa Principal</label><input type="text" id="edit-queixaPrincipal" value="${p(
                      "queixaPrincipal"
                    )}"></div>
                    <div class="form-group"><label>Valor Contribuição</label><input type="text" id="edit-valorContribuicao" value="${p(
                      "valorContribuicao"
                    )}"></div>
                    <div class="form-group"><label>Critérios do Valor</label><textarea id="edit-criteriosValor" rows="2">${p(
                      "criteriosValor"
                    )}</textarea></div>
                    <div class="form-group"><label>Assistente Social</label><input type="text" id="edit-assistenteSocialTriagemNome" value="${p(
                      "assistenteSocialTriagem.nome"
                    )}"></div>
                    <div class="form-group"><label>Modalidade</label><input type="text" id="edit-modalidadeAtendimento" value="${p(
                      "modalidadeAtendimento"
                    )}"></div>
                    <div class="form-group"><label>Preferência Gênero</label><input type="text" id="edit-preferenciaAtendimento" value="${p(
                      "preferenciaAtendimento"
                    )}"></div>
                </div>

                <div class="form-section">
                    <h3>Informações do Plantão</h3>
                    <div class="form-group"><label>Profissional</label><input type="text" id="edit-plantaoProfissionalNome" value="${p(
                      "plantaoInfo.profissionalNome"
                    )}"></div>
                    <div class="form-group"><label>Data 1ª Sessão</label><input type="date" id="edit-plantaoDataSessao" value="${p(
                      "plantaoInfo.dataPrimeiraSessao"
                    )}"></div>
                    <div class="form-group"><label>Hora 1ª Sessão</label><input type="time" id="edit-plantaoHoraSessao" value="${p(
                      "plantaoInfo.horaPrimeiraSessao"
                    )}"></div>
                </div>

                <div class="form-section">
                    <h3>Atendimento Ativo (PB)</h3>
                    <div class="form-group"><label>Profissional</label><input type="text" id="edit-pb-profissionalNome" value="${
                      ativoPB.profissionalNome || ""
                    }"></div>
                    <div class="form-group"><label>Dia da Semana</label><input type="text" id="edit-pb-diaSemana" value="${p(
                      "horarioSessao.diaSemana",
                      "",
                      ativoPB
                    )}"></div>
                    <div class="form-group"><label>Horário</label><input type="time" id="edit-pb-horario" value="${p(
                      "horarioSessao.horario",
                      "",
                      ativoPB
                    )}"></div>
                    <div class="form-group"><label>Data de Início</label><input type="date" id="edit-pb-dataInicio" value="${p(
                      "horarioSessao.dataInicio",
                      "",
                      ativoPB
                    )}"></div>
                    <div class="form-group form-group-full">
                        <label>Atendimentos (JSON - Edição Avançada)</label>
                        <textarea id="edit-atendimentosPB" rows="6">${JSON.stringify(
                          p("atendimentosPB", []),
                          null,
                          2
                        )}</textarea>
                        <small>Para adicionar um novo atendimento ou editar múltiplos, modifique o texto JSON acima com cuidado.</small>
                    </div>
                </div>
            </form>
        `;
  }

  // LÓGICA DE SALVAMENTO ATUALIZADA
  saveModalBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    saveModalBtn.disabled = true;
    saveModalBtn.textContent = "Salvando...";

    try {
      const get = (id) => document.getElementById(id).value;

      const updatedData = {
        nomeCompleto: get("edit-nomeCompleto"),
        cpf: get("edit-cpf"),
        dataNascimento: get("edit-dataNascimento"),
        email: get("edit-email"),
        telefoneCelular: get("edit-telefoneCelular"),
        comoConheceu: get("edit-comoConheceu"),
        motivoBusca: get("edit-motivoBusca"),
        rua: get("edit-rua"),
        numeroCasa: get("edit-numeroCasa"),
        bairro: get("edit-bairro"),
        cidade: get("edit-cidade"),
        cep: get("edit-cep"),
        queixaPrincipal: get("edit-queixaPrincipal"),
        valorContribuicao: get("edit-valorContribuicao"),
        criteriosValor: get("edit-criteriosValor"),
        modalidadeAtendimento: get("edit-modalidadeAtendimento"),
        preferenciaAtendimento: get("edit-preferenciaAtendimento"),
        status: get("edit-status"),
        lastUpdate: serverTimestamp(),
        lastUpdatedBy: currentUserData.nome || "Admin",
      };

      // Campos aninhados
      updatedData["assistenteSocialTriagem.nome"] = get(
        "edit-assistenteSocialTriagemNome"
      );
      updatedData["plantaoInfo.profissionalNome"] = get(
        "edit-plantaoProfissionalNome"
      );
      updatedData["plantaoInfo.dataPrimeiraSessao"] = get(
        "edit-plantaoDataSessao"
      );
      updatedData["plantaoInfo.horaPrimeiraSessao"] = get(
        "edit-plantaoHoraSessao"
      );

      // Atualização do Atendimento PB Ativo
      const docRef = doc(db, "trilhaPaciente", currentEditingId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        let currentAtendimentos = docSnap.data().atendimentosPB || [];
        const ativoIndex = currentAtendimentos.findIndex(
          (at) => at.statusAtendimento === "ativo"
        );

        if (ativoIndex > -1) {
          currentAtendimentos[ativoIndex] = {
            ...currentAtendimentos[ativoIndex],
            profissionalNome: get("edit-pb-profissionalNome"),
            horarioSessao: {
              ...(currentAtendimentos[ativoIndex].horarioSessao || {}),
              diaSemana: get("edit-pb-diaSemana"),
              horario: get("edit-pb-horario"),
              dataInicio: get("edit-pb-dataInicio"),
            },
          };
          updatedData.atendimentosPB = currentAtendimentos;
        } else {
          // Se não houver atendimento ativo, tenta ler do campo JSON avançado
          updatedData.atendimentosPB = JSON.parse(
            document.getElementById("edit-atendimentosPB").value
          );
        }
      }

      await updateDoc(docRef, updatedData);

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
      alert(
        `Falha ao salvar. Verifique o console para mais detalhes. Erro: ${error.message}`
      );
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

  carregarPacientes();
}
