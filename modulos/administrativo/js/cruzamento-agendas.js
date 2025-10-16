import {
  db,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  addDoc,
} from "../../../assets/js/firebase-init.js";

let allProfessionals = [];
let unsubscribeTentativas;

export function init(dbInstance, user, userData) {
  const profissionalSelect = document.getElementById("profissional-select");
  const spinner = document.getElementById("loading-spinner");
  const resultadosDiv = document.getElementById("resultados-compatibilidade");
  const compatibilidadeBody = document.getElementById("compatibilidade-tbody");
  const tentativasBody = document.getElementById("tentativas-tbody");
  const nenhumCompativelMsg = document.getElementById(
    "nenhum-paciente-compativel"
  );
  const nenhumaTentativaMsg = document.getElementById("nenhuma-tentativa");

  const tabsContainer = document.getElementById("cruzamento-tabs");
  tabsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("tab-link")) {
      const tabId = e.target.dataset.tab;
      document
        .querySelectorAll(".tab-link")
        .forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));
      e.target.classList.add("active");
      document.getElementById(tabId).classList.add("active");
    }
  });

  async function loadProfessionals() {
    profissionalSelect.innerHTML =
      '<option value="">Carregando profissionais...</option>';
    try {
      const q = query(
        collection(db, "usuarios"),
        where("fazAtendimento", "==", true)
      );
      const querySnapshot = await getDocs(q);
      allProfessionals = [];
      querySnapshot.forEach((doc) => {
        allProfessionals.push({ id: doc.id, ...doc.data() });
      });

      allProfessionals.sort((a, b) => a.nome.localeCompare(b.nome));

      let optionsHtml = '<option value="">Selecione um profissional</option>';
      allProfessionals.forEach((prof) => {
        if (prof.horarios && prof.horarios.length > 0) {
          optionsHtml += `<option value="${prof.id}">${prof.nome}</option>`;
        }
      });
      profissionalSelect.innerHTML = optionsHtml;
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
      profissionalSelect.innerHTML =
        '<option value="">Erro ao carregar</option>';
    }
  }

  async function findCompatiblePatients() {
    const professionalId = profissionalSelect.value;
    if (!professionalId) {
      resultadosDiv.style.display = "none";
      return;
    }

    spinner.style.display = "block";
    resultadosDiv.style.display = "none";
    compatibilidadeBody.innerHTML = "";
    nenhumCompativelMsg.style.display = "none";

    try {
      const professional = allProfessionals.find(
        (p) => p.id === professionalId
      );
      const professionalAvailability = professional.horarios || [];

      const q = query(
        collection(db, "trilhaPaciente"),
        where("status", "in", ["encaminhar_para_plantao", "encaminhar_para_pb"])
      );
      const patientsSnapshot = await getDocs(q);
      const compatiblePatients = [];

      patientsSnapshot.forEach((doc) => {
        const patient = { id: doc.id, ...doc.data() };
        const patientAvailability = patient.disponibilidadeEspecifica || [];
        const patientModalidade = patient.modalidadeAtendimento || "Qualquer";

        const isCompatible = professionalAvailability.some((profSlot) => {
          if (profSlot.status !== "disponivel") return false;

          const modalityMatch =
            patientModalidade === "Qualquer" ||
            profSlot.modalidade === "ambas" ||
            profSlot.modalidade.toLowerCase() ===
              patientModalidade.toLowerCase();
          if (!modalityMatch) return false;

          return patientAvailability.some((patientSlot) => {
            const [periodo, hora] = patientSlot.split("_");
            const horaNum = parseInt(hora.split(":")[0], 10);
            return (
              profSlot.horario === horaNum &&
              checkPeriodMatch(periodo, profSlot.dia)
            );
          });
        });

        if (isCompatible) {
          compatiblePatients.push(patient);
        }
      });

      renderCompatibilityTable(compatiblePatients);
    } catch (error) {
      console.error("Erro ao buscar pacientes compatíveis:", error);
      window.showToast("Erro ao buscar pacientes.", "error");
    } finally {
      spinner.style.display = "none";
      resultadosDiv.style.display = "block";
    }
  }

  function checkPeriodMatch(periodo, diaSemana) {
    const isWeekend =
      diaSemana.toLowerCase() === "sabado" ||
      diaSemana.toLowerCase() === "domingo";
    switch (periodo) {
      case "manha-semana":
        return !isWeekend;
      case "tarde-semana":
        return !isWeekend;
      case "noite-semana":
        return !isWeekend;
      case "manha-sabado":
        return isWeekend;
      default:
        return false;
    }
  }

  function renderCompatibilityTable(patients) {
    if (patients.length === 0) {
      nenhumCompativelMsg.style.display = "block";
      compatibilidadeBody.innerHTML = "";
      return;
    }

    let rowsHtml = "";
    patients.forEach((patient) => {
      const fila =
        patient.status === "encaminhar_para_plantao" ? "Plantão" : "PB";
      rowsHtml += `
                <tr data-patient-id="${patient.id}">
                    <td>${patient.nomeCompleto}</td>
                    <td>${patient.telefoneCelular || "N/A"}</td>
                    <td>${fila}</td>
                    <td>
                        <button class="action-button btn-iniciar-tentativa">Iniciar Tentativa</button>
                    </td>
                </tr>
            `;
    });
    compatibilidadeBody.innerHTML = rowsHtml;
  }

  function listenToSchedulingAttempts() {
    const q = query(collection(db, "agendamentoTentativas"));

    if (unsubscribeTentativas) unsubscribeTentativas();

    unsubscribeTentativas = onSnapshot(q, (snapshot) => {
      const tentativas = [];
      snapshot.forEach((doc) => {
        tentativas.push({ id: doc.id, ...doc.data() });
      });
      renderTentativasTable(tentativas);
    });
  }

  function renderTentativasTable(tentativas) {
    if (tentativas.length === 0) {
      nenhumaTentativaMsg.style.display = "block";
      tentativasBody.innerHTML = "";
      return;
    }

    nenhumaTentativaMsg.style.display = "none";
    tentativas.sort((a, b) =>
      (a.pacienteNome || "").localeCompare(b.pacienteNome)
    );

    let rowsHtml = "";
    const statusOptions = [
      "Primeiro Contato",
      "Segundo Contato",
      "Terceiro Contato",
      "Aguardando Confirmação",
      "Aguardando Pagamento",
      "Agendado",
    ];
    tentativas.forEach((item) => {
      const options = statusOptions
        .map(
          (opt) =>
            `<option value="${opt}" ${
              item.status === opt ? "selected" : ""
            }>${opt}</option>`
        )
        .join("");
      rowsHtml += `
                <tr data-tentativa-id="${item.id}">
                    <td>${item.pacienteNome}</td>
                    <td>${item.profissionalNome}</td>
                    <td>${item.pacienteTelefone}</td>
                    <td>
                        <select class="form-select status-select">${options}</select>
                    </td>
                </tr>
            `;
    });
    tentativasBody.innerHTML = rowsHtml;
  }

  async function handleStartAttempt(e) {
    const button = e.target;
    const row = button.closest("tr");
    const patientId = row.dataset.patientId;
    const professionalId = profissionalSelect.value;

    button.disabled = true;
    button.textContent = "Iniciando...";

    try {
      const patientDocRef = doc(db, "trilhaPaciente", patientId);
      const [patientDocSnap, professionalDocSnap] = await Promise.all([
        getDoc(patientDocRef),
        getDoc(doc(db, "usuarios", professionalId)),
      ]);

      if (!patientDocSnap.exists() || !professionalDocSnap.exists()) {
        throw new Error("Paciente ou profissional não encontrado.");
      }

      const patientData = patientDocSnap.data();
      const professionalData = professionalDocSnap.data();

      const tentativaData = {
        pacienteId: patientId,
        pacienteNome: patientData.nomeCompleto,
        pacienteTelefone: patientData.telefoneCelular,
        profissionalId: professionalId,
        profissionalNome: professionalData.nome,
        status: "Primeiro Contato",
        criadoEm: serverTimestamp(),
      };

      await addDoc(collection(db, "agendamentoTentativas"), tentativaData);

      window.showToast("Tentativa de agendamento iniciada!", "success");
      row.remove();
    } catch (error) {
      console.error("Erro ao iniciar tentativa:", error);
      window.showToast("Erro ao iniciar tentativa.", "error");
      button.disabled = false;
      button.textContent = "Iniciar Tentativa";
    }
  }

  async function handleStatusChange(e) {
    const select = e.target;
    const tentativaId = select.closest("tr").dataset.tentativaId;
    const newStatus = select.value;

    select.disabled = true;
    try {
      const tentativaRef = doc(db, "agendamentoTentativas", tentativaId);
      await updateDoc(tentativaRef, { status: newStatus });
      window.showToast("Status atualizado!", "success");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      window.showToast("Erro ao atualizar status.", "error");
    } finally {
      select.disabled = false;
    }
  }

  profissionalSelect.addEventListener("change", findCompatiblePatients);
  compatibilidadeBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-iniciar-tentativa")) {
      handleStartAttempt(e);
    }
  });
  tentativasBody.addEventListener("change", (e) => {
    if (e.target.classList.contains("status-select")) {
      handleStatusChange(e);
    }
  });

  loadProfessionals();
  listenToSchedulingAttempts();
}
