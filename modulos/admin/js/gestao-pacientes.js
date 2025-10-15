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
} from "../../../assets/js/firebase-init.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";

export function init(user, userData) {
  console.log("🚀 Módulo de Gestão de Pacientes iniciado.");

  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("status-filter");
  const listContainer = document.getElementById("pacientes-list-container");
  const modal = document.getElementById("edit-paciente-modal");
  const modalBody = document.getElementById("modal-body-content");
  const modalTitle = document.getElementById("modal-title");
  const closeModalBtn = document.querySelector(".close-modal-btn");
  const cancelModalBtn = document.getElementById("modal-cancel-btn");
  const saveModalBtn = document.getElementById("modal-save-btn");

  let allPacientes = []; // Armazena todos os pacientes para filtrar no cliente
  let currentEditingId = null;

  // --- CARREGAMENTO E RENDERIZAÇÃO ---

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
        p.nomeCompleto.toLowerCase().includes(searchTerm) ||
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
                        }">${p.status || "Não definido"}</span></p>
                    </div>
                    <div class="paciente-actions">
                        <button class="action-button secondary btn-edit" data-id="${
                          p.id
                        }">Editar</button>
                        <button class="action-button danger btn-delete" data-id="${
                          p.id
                        }">Excluir</button>
                    </div>
                </div>
            `;
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
      statusFilter.innerHTML += `<option value="${s}">${s}</option>`;
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

      if (!docSnap.exists()) {
        throw new Error("Paciente não encontrado.");
      }
      const paciente = docSnap.data();
      modalTitle.textContent = `Editando: ${paciente.nomeCompleto}`;
      gerarFormularioEdicao(paciente);
    } catch (error) {
      console.error("Erro ao buscar dados para edição:", error);
      modalBody.innerHTML = `<p class="error-text">Erro ao carregar dados do paciente.</p>`;
    }
  }

  function gerarFormularioEdicao(paciente) {
    let formHtml = `<form id="edit-paciente-form" class="edit-form">`;
    // Itera sobre todas as chaves do objeto do paciente para criar os campos
    for (const key in paciente) {
      if (Object.hasOwnProperty.call(paciente, key)) {
        const value = paciente[key];
        let inputHtml = "";
        // Lida com diferentes tipos de dados
        if (typeof value === "string" || typeof value === "number") {
          inputHtml = `<input type="text" id="edit-${key}" class="form-control" value="${value}">`;
        } else if (typeof value === "boolean") {
          inputHtml = `<select id="edit-${key}" class="form-control"><option value="true" ${
            value ? "selected" : ""
          }>Sim</option><option value="false" ${
            !value ? "selected" : ""
          }>Não</option></select>`;
        } else if (Array.isArray(value)) {
          inputHtml = `<textarea id="edit-${key}" class="form-control" rows="3">${value.join(
            ", "
          )}</textarea>`;
        } else if (
          typeof value === "object" &&
          value !== null &&
          !value.toDate
        ) {
          // Objeto simples (como 'responsavel')
          inputHtml = `<textarea id="edit-${key}" class="form-control" rows="4">${JSON.stringify(
            value,
            null,
            2
          )}</textarea>`;
        } else {
          // Para Timestamps e outros tipos, apenas mostra como texto não editável
          inputHtml = `<input type="text" id="edit-${key}" class="form-control" value="${
            value.toDate ? value.toDate().toLocaleString("pt-BR") : value
          }" disabled>`;
        }

        formHtml += `
                    <div class="form-group">
                        <label for="edit-${key}">${key}</label>
                        ${inputHtml}
                    </div>
                `;
      }
    }
    formHtml += `</form>`;
    modalBody.innerHTML = formHtml;
  }

  saveModalBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const form = document.getElementById("edit-paciente-form");
    if (!form) return;

    const updatedData = {};
    const formElements = form.elements;

    for (const element of formElements) {
      const key = element.id.replace("edit-", "");
      let value = element.value;

      // Tenta converter de volta para os tipos originais
      try {
        if (
          element.tagName === "TEXTAREA" &&
          (key === "atendimentosPB" ||
            key === "plantaoInfo" ||
            key === "responsavel")
        ) {
          value = JSON.parse(value); // Converte JSON de volta para objeto
        } else if (element.tagName === "TEXTAREA") {
          value = value.split(",").map((s) => s.trim()); // Converte texto em array
        }
      } catch (err) {
        alert(
          `Erro de formatação no campo ${key}. Verifique se o JSON é válido.`
        );
        return;
      }
      updatedData[key] = value;
    }

    saveModalBtn.disabled = true;
    saveModalBtn.textContent = "Salvando...";

    try {
      const docRef = doc(db, "trilhaPaciente", currentEditingId);
      await updateDoc(docRef, updatedData);

      // Atualiza a lista local para refletir a mudança
      const index = allPacientes.findIndex((p) => p.id === currentEditingId);
      if (index > -1) {
        allPacientes[index] = { ...allPacientes[index], ...updatedData };
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
        // Remove da lista local e renderiza novamente
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
