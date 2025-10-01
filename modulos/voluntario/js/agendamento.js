// Arquivo: /modulos/voluntario/js/agendamento.js

// --- FUNÇÕES AUXILIARES ---

/**
 * Formata um valor numérico para o padrão de moeda BRL.
 * @param {HTMLInputElement} input O campo de input.
 */
function formatarMoeda(input) {
  let value = input.value.replace(/\D/g, "");
  if (value === "") {
    input.value = "";
    return;
  }
  value = (parseInt(value) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  input.value = value;
}

/**
 * Converte uma string de moeda BRL para um número.
 * @param {string} currencyString A string no formato "R$ 1.234,56".
 * @returns {number} O valor numérico.
 */
function parseCurrency(currencyString) {
  if (!currencyString) return 0;
  const numericString = currencyString
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  return parseFloat(numericString) || 0;
}

/**
 * Calcula a capacidade de agendamentos em slots de 30 minutos.
 * @param {string} inicio Hora de início (HH:mm).
 * @param {string} fim Hora de fim (HH:mm).
 * @returns {number} A quantidade de slots.
 */
function calculateCapacity(inicio, fim) {
  try {
    const [startH, startM] = inicio.split(":").map(Number);
    const [endH, endM] = fim.split(":").map(Number);
    return Math.floor((endH * 60 + endM - (startH * 60 + startM)) / 30);
  } catch (e) {
    return 0;
  }
}

let dbInstance, currentUser, currentUserData;
const modal = document.getElementById("agendamento-modal");

/**
 * Atualiza o cálculo do custo da supervisão na tela.
 */
function updateSupervisionCost() {
  if (!modal.querySelector("#numero-pacientes")) return;

  const numeroPacientes =
    parseInt(modal.querySelector("#numero-pacientes").value, 10) || 0;
  let valorTotalContribuicao = 0;

  for (let i = 1; i <= numeroPacientes; i++) {
    const contribuicaoInput = modal.querySelector(
      `#paciente-contribuicao-${i}`
    );
    if (contribuicaoInput) {
      valorTotalContribuicao += parseCurrency(contribuicaoInput.value);
    }
  }

  const valorSupervisao = valorTotalContribuicao * 0.2;

  const totalEl = modal.querySelector("#total-contribuicoes-valor");
  const supervisaoEl = modal.querySelector("#valor-supervisao-calculado");
  if (totalEl)
    totalEl.textContent = valorTotalContribuicao.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  if (supervisaoEl)
    supervisaoEl.textContent = valorSupervisao.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
}

/**
 * Renderiza os campos de input para cada paciente.
 * @param {number} count O número de pacientes.
 */
function renderPatientInputs(count) {
  const container = modal.querySelector("#pacientes-container");
  container.innerHTML = "";
  if (isNaN(count) || count < 1) {
    updateSupervisionCost();
    return;
  }

  for (let i = 1; i <= count; i++) {
    container.innerHTML += `
            <div class="form-row" style="gap: 15px; align-items: flex-end; border-left: 3px solid var(--cor-fundo); padding-left: 15px; margin-bottom: 10px;">
                <div class="form-group" style="flex-grow: 2;">
                    <label for="paciente-iniciais-${i}">Iniciais do Paciente ${i}</label>
                    <input type="text" id="paciente-iniciais-${i}" class="form-control" placeholder="Ex: A.B.C.">
                </div>
                <div class="form-group" style="flex-grow: 1;">
                    <label for="paciente-contribuicao-${i}">Valor Contribuição</label>
                    <input type="text" id="paciente-contribuicao-${i}" class="form-control" placeholder="R$ 0,00">
                </div>
            </div>
        `;
  }

  container
    .querySelectorAll('input[id^="paciente-contribuicao-"]')
    .forEach((input) => {
      input.addEventListener("input", () => {
        formatarMoeda(input);
        updateSupervisionCost();
      });
    });

  updateSupervisionCost();
}

/**
 * Renderiza os horários disponíveis.
 * @param {Array} horariosDisponiveis Lista de horários.
 */
function renderDates(horariosDisponiveis) {
  const datasContainer = modal.querySelector("#datas-disponiveis-container");
  const confirmBtn = modal.querySelector("#agendamento-confirm-btn");
  datasContainer.innerHTML = "";

  const availableSlots = horariosDisponiveis.filter(
    (slot) => slot.capacity - slot.booked > 0
  );
  if (availableSlots.length === 0) {
    datasContainer.innerHTML = `<p>Não há vagas disponíveis no momento.</p>`;
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }

  availableSlots.forEach((slot, index) => {
    const formattedDate = slot.date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const horarioInfo = `${slot.horario.dia} - ${slot.horario.inicio}`;
    const vagasRestantes = slot.capacity - slot.booked;
    const radioId = `date-${index}`;
    datasContainer.innerHTML += `
            <div class="date-option">
                <input type="radio" id="${radioId}" name="data_agendamento" value="${slot.date.toISOString()}">
                <label for="${radioId}">
                    <strong>${formattedDate}</strong> (${horarioInfo}) <span>Vagas restantes: ${vagasRestantes}</span>
                </label>
            </div>`;
  });
  if (confirmBtn) confirmBtn.disabled = false;
}

/**
 * Lida com a confirmação do agendamento.
 * @param {object} db A instância do Firestore.
 * @param {object} currentSupervisorData Os dados do supervisor.
 */
async function handleConfirmAgendamento(db, currentSupervisorData) {
  const nome = modal.querySelector("#agendamento-profissional-nome").value;
  const email = modal.querySelector("#agendamento-profissional-email").value;
  const telefone = modal.querySelector(
    "#agendamento-profissional-telefone"
  ).value;
  const selectedRadio = modal.querySelector(
    'input[name="data_agendamento"]:checked'
  );

  if (!selectedRadio) {
    alert("Por favor, selecione uma data.");
    return;
  }
  if (!nome) {
    alert("Seus dados não foram encontrados.");
    return;
  }

  const confirmBtn = modal.querySelector("#agendamento-confirm-btn");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Aguarde...";

  const numeroPacientes = parseInt(
    modal.querySelector("#numero-pacientes").value,
    10
  );
  const pacientes = [];
  let valorTotalContribuicao = 0;

  for (let i = 1; i <= numeroPacientes; i++) {
    const iniciais = modal.querySelector(`#paciente-iniciais-${i}`).value;
    const contribuicaoString = modal.querySelector(
      `#paciente-contribuicao-${i}`
    ).value;
    if (iniciais) {
      pacientes.push({ iniciais, contribuicao: contribuicaoString });
      valorTotalContribuicao += parseCurrency(contribuicaoString);
    }
  }
  const valorSupervisao = valorTotalContribuicao * 0.2;

  const agendamentoData = {
    supervisorUid: currentSupervisorData.uid,
    supervisorNome: currentSupervisorData.nome,
    dataAgendamento: firebase.firestore.Timestamp.fromDate(
      new Date(selectedRadio.value)
    ),
    profissionalUid: currentUser.uid,
    profissionalNome: nome,
    profissionalEmail: email,
    profissionalTelefone: telefone,
    pacientes: pacientes,
    valorTotalContribuicao: valorTotalContribuicao,
    valorSupervisao: valorSupervisao,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection("agendamentos").add(agendamentoData);

    modal.querySelector("#agendamento-step-1").style.display = "none";
    modal.querySelector("#agendamento-step-2").style.display = "block";
    modal.querySelector("#footer-step-1").style.display = "none";
    modal.querySelector("#footer-step-2").style.display = "block";
  } catch (error) {
    console.error("Erro ao agendar:", error);
    alert(
      "Não foi possível realizar o agendamento. Verifique o console para mais detalhes."
    );
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirmar Agendamento";
  }
}

/**
 * Abre e inicializa o modal de agendamento.
 */
async function open(db, user, userData, supervisorData) {
  if (!modal) return;

  dbInstance = db;
  currentUser = user;
  currentUserData = userData;

  modal.querySelector("#agendamento-step-1").style.display = "block";
  modal.querySelector("#agendamento-step-2").style.display = "none";
  modal.querySelector("#footer-step-1").style.display = "flex";
  modal.querySelector("#footer-step-2").style.display = "none";

  modal.querySelector("#agendamento-supervisor-nome").textContent =
    supervisorData.nome;
  modal.querySelector("#agendamento-profissional-nome").value =
    userData.nome || "";
  modal.querySelector("#agendamento-profissional-email").value =
    user.email || "";
  modal.querySelector("#agendamento-profissional-telefone").value =
    userData.contato || "";

  const numeroPacientesInput = modal.querySelector("#numero-pacientes");
  if (numeroPacientesInput) {
    const newNumeroPacientesInput = numeroPacientesInput.cloneNode(true);
    numeroPacientesInput.parentNode.replaceChild(
      newNumeroPacientesInput,
      numeroPacientesInput
    );

    newNumeroPacientesInput.addEventListener("input", (e) => {
      const count = parseInt(e.target.value, 10);
      renderPatientInputs(count);
    });
    renderPatientInputs(parseInt(newNumeroPacientesInput.value, 10));
  }

  modal.style.display = "flex";

  const confirmBtn = modal.querySelector("#agendamento-confirm-btn");
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  newConfirmBtn.addEventListener("click", () =>
    handleConfirmAgendamento(db, supervisorData)
  );

  const datasContainer = modal.querySelector("#datas-disponiveis-container");
  datasContainer.innerHTML = '<div class="loading-spinner"></div>';

  try {
    let potentialSlots = [];
    if (
      supervisorData.diasHorarios &&
      Array.isArray(supervisorData.diasHorarios)
    ) {
      const diasDaSemana = [
        "domingo",
        "segunda-feira",
        "terça-feira",
        "quarta-feira",
        "quinta-feira",
        "sexta-feira",
        "sábado",
      ];
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      for (let i = 0; i < 15; i++) {
        const diaAtual = new Date(hoje);
        diaAtual.setDate(hoje.getDate() + i);

        const nomeDiaSemana = diasDaSemana[diaAtual.getDay()];

        supervisorData.diasHorarios.forEach((horario) => {
          if (horario.dia && horario.dia.toLowerCase() === nomeDiaSemana) {
            const [h, m] = horario.inicio.split(":");
            const slotDate = new Date(diaAtual);
            slotDate.setHours(h, m, 0, 0);

            if (slotDate > new Date()) {
              potentialSlots.push({ date: slotDate, horario });
            }
          }
        });
      }
    }

    const agendamentosRef = db.collection("agendamentos");
    const slotChecks = potentialSlots.map(async (slot) => {
      const q = agendamentosRef
        .where("supervisorUid", "==", supervisorData.uid)
        .where(
          "dataAgendamento",
          "==",
          firebase.firestore.Timestamp.fromDate(slot.date)
        );

      const querySnapshot = await q.get();
      slot.booked = querySnapshot.size;
      slot.capacity = calculateCapacity(slot.horario.inicio, slot.horario.fim);
      return slot;
    });

    const finalSlots = await Promise.all(slotChecks);
    renderDates(finalSlots);
  } catch (error) {
    console.error("Erro ao calcular datas:", error);
    datasContainer.innerHTML = `<p class="alert alert-error">Ocorreu um erro ao buscar os horários.</p>`;
  }
}
if (modal) {
  modal
    .querySelector(".close-modal-btn")
    .addEventListener("click", () => (modal.style.display = "none"));
  modal
    .querySelector("#agendamento-cancel-btn")
    .addEventListener("click", () => (modal.style.display = "none"));
  modal
    .querySelector("#agendamento-ok-btn")
    .addEventListener("click", () => (modal.style.display = "none"));
}
export const agendamentoController = {
  open,
};
