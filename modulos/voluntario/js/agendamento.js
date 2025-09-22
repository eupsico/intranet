// Arquivo: /modulos/voluntario/js/agendamento.js (CORRIGIDO)

const modal = document.getElementById('agendamento-modal');
let currentSupervisorData = null;
let dbInstance, currentUser, currentUserData;

// Funções de ajuda (cálculo de datas e capacidade)
function getNextDates(diaDaSemana, quantidade) {
    const weekMap = { "domingo": 0, "segunda-feira": 1, "terça-feira": 2, "quarta-feira": 3, "quinta-feira": 4, "sexta-feira": 5, "sábado": 6 };
    const targetDay = weekMap[diaDaSemana.toLowerCase()];
    if (typeof targetDay === 'undefined') return [];
    
    let results = [];
    let date = new Date();
    date.setHours(0, 0, 0, 0);
    while (date.getDay() !== targetDay) { date.setDate(date.getDate() + 1); }
    
    for (let i = 0; i < quantidade; i++) {
        results.push(new Date(date));
        date.setDate(date.getDate() + 14); // Agendamentos quinzenais
    }
    return results;
}

function calculateCapacity(inicio, fim) {
    try {
        const [startH, startM] = inicio.split(':').map(Number);
        const [endH, endM] = fim.split(':').map(Number);
        return Math.floor(((endH * 60 + endM) - (startH * 60 + startM)) / 30); // Capacidade baseada em slots de 30min
    } catch (e) { return 0; }
}

// Renderiza as datas disponíveis no modal
function renderDates(horariosDisponiveis) {
    const datasContainer = modal.querySelector('#datas-disponiveis-container');
    const confirmBtn = modal.querySelector('#agendamento-confirm-btn');
    datasContainer.innerHTML = '';
    
    const availableSlots = horariosDisponiveis.filter(slot => (slot.capacity - slot.booked) > 0);
    if (availableSlots.length === 0) {
        datasContainer.innerHTML = `<p>Não há vagas disponíveis no momento.</p>`;
        if(confirmBtn) confirmBtn.disabled = true;
        return;
    }
    
    availableSlots.forEach((slot, index) => {
        const formattedDate = slot.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    if(confirmBtn) confirmBtn.disabled = false;
}

// Manipula a confirmação do agendamento
async function handleConfirmAgendamento() {
    const nome = modal.querySelector('#agendamento-profissional-nome').value;
    const email = modal.querySelector('#agendamento-profissional-email').value;
    const telefone = modal.querySelector('#agendamento-profissional-telefone').value;
    const selectedRadio = modal.querySelector('input[name="data_agendamento"]:checked');

    if (!selectedRadio) { alert("Por favor, selecione uma data."); return; }
    if (!nome) { alert("Seus dados não foram encontrados."); return; }

    const confirmBtn = modal.querySelector('#agendamento-confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Aguarde...';

    const agendamentoData = {
        supervisorUid: currentSupervisorData.uid,
        supervisorNome: currentSupervisorData.nome,
        dataAgendamento: selectedRadio.value,
        profissionalUid: currentUser.uid,
        profissionalNome: nome,
        profissionalEmail: email,
        profissionalTelefone: contato,
        criadoEm: new Date().toISOString()
    };

    try {
        await dbInstance.collection('agendamentos').add(agendamentoData);
        modal.querySelector('#agendamento-step-1').style.display = 'none';
        confirmBtn.style.display = 'none';
        modal.querySelector('#agendamento-step-2').style.display = 'block';
    } catch (error) {
        console.error("Erro ao agendar:", error);
        alert("Não foi possível realizar o agendamento.");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirmar Agendamento';
    }
}

// Inicializa e abre o modal
async function open(db, user, userData, supervisorData) {
    if (!modal) return;
    
    dbInstance = db;
    currentUser = user;
    currentUserData = userData;
    currentSupervisorData = supervisorData;

    modal.querySelector('#agendamento-step-1').style.display = 'block';
    modal.querySelector('#agendamento-step-2').style.display = 'none';
    modal.querySelector('#agendamento-confirm-btn').style.display = 'inline-block';
    modal.querySelector('#agendamento-supervisor-nome').textContent = supervisorData.nome;
    
    modal.querySelector('#agendamento-profissional-nome').value = userData.nome || '';
    modal.querySelector('#agendamento-profissional-email').value = user.email || '';
    modal.querySelector('#agendamento-profissional-telefone').value = userData.telefone || '';
    
    modal.style.display = 'flex';
    
    const datasContainer = modal.querySelector('#datas-disponiveis-container');
    datasContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        let potentialSlots = [];
        if (supervisorData.diasHorarios && Array.isArray(supervisorData.diasHorarios)) {
            supervisorData.diasHorarios.forEach(horario => {
                if (horario && horario.dia && horario.inicio && horario.fim) {
                    const dates = getNextDates(horario.dia, 5);
                    dates.forEach(date => {
                        const [h, m] = horario.inicio.split(':');
                        date.setHours(h, m, 0, 0);
                        potentialSlots.push({ date, horario });
                    });
                }
            });
        }

        // --- INÍCIO DA CORREÇÃO ---
        const agendamentosRef = dbInstance.collection('agendamentos');
        const slotChecks = potentialSlots.map(async slot => {
            const q = agendamentosRef
                .where('supervisorUid', '==', supervisorData.uid)
                .where('dataAgendamento', '==', slot.date.toISOString());
            
            const querySnapshot = await q.get();
            slot.booked = querySnapshot.size;
            slot.capacity = calculateCapacity(slot.horario.inicio, slot.horario.fim);
            return slot;
        });
        // --- FIM DA CORREÇÃO ---

        const finalSlots = await Promise.all(slotChecks);
        renderDates(finalSlots);
    } catch (error) {
        console.error("Erro ao calcular datas:", error);
        datasContainer.innerHTML = `<p class="alert alert-error">Ocorreu um erro ao buscar os horários.</p>`;
    }
}

// Adiciona os listeners aos botões do modal uma única vez
if (modal) {
    modal.querySelector('.close-modal-btn').addEventListener('click', () => modal.style.display = 'none');
    modal.querySelector('#agendamento-cancel-btn').addEventListener('click', () => modal.style.display = 'none');
    modal.querySelector('#agendamento-confirm-btn').addEventListener('click', handleConfirmAgendamento);
}

export const agendamentoController = {
    open
};