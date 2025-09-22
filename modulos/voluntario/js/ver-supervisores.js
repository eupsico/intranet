// Arquivo: /modulos/voluntario/js/ver-supervisores.js (CORRIGIDO)
import { agendamentoController } from './agendamento.js';

let db, user, userData;

export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;

    console.log("Módulo Ver Supervisores inicializado.");
    loadSupervisores();

    const closeModalBtn = document.getElementById('close-supervisor-modal');
    const modalOverlay = document.getElementById('supervisor-modal');
    if (closeModalBtn && modalOverlay) {
        closeModalBtn.addEventListener('click', () => modalOverlay.style.display = 'none');
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                modalOverlay.style.display = 'none';
            }
        });
    }
}

async function loadSupervisores() {
    const grid = document.getElementById('supervisor-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const q = db.collection("usuarios")
            .where("funcoes", "array-contains", "supervisor")
            .where("inativo", "==", false);

        const querySnapshot = await q.get();
        const supervisores = [];
        querySnapshot.forEach(doc => supervisores.push({ id: doc.id, uid: doc.id, ...doc.data() }));
        
        supervisores.sort((a, b) => a.nome.localeCompare(b.nome));
        grid.innerHTML = ''; 

        if (supervisores.length === 0) {
            grid.innerHTML = '<p>Nenhum supervisor encontrado.</p>';
            return;
        }

        supervisores.forEach(supervisor => {
            const card = document.createElement('div');
            card.className = 'supervisor-card';
            card.dataset.id = supervisor.id;
            const fotoUrl = supervisor.fotoUrl || '../../../assets/img/avatar-padrao.png';
            card.innerHTML = `
                <div class="supervisor-card-header">
                    <div class="supervisor-photo-container">
                        <img src="${fotoUrl}" alt="Foto de ${supervisor.nome}" class="supervisor-photo" onerror="this.onerror=null;this.src='../../../assets/img/avatar-padrao.png';">
                    </div>
                    <h3>${supervisor.nome || 'Nome não informado'}</h3>
                    <p>${supervisor.titulo || 'Supervisor(a) Clínico(a)'}</p>
                </div>
                <div class="supervisor-card-body">
                    <h4>Áreas de Atuação</h4>
                    <ul>${(supervisor.atuacao && supervisor.atuacao.length > 0) ? supervisor.atuacao.map(item => `<li>${item}</li>`).join('') : '<li>Não informado</li>'}</ul>
                </div>
            `;
            card.addEventListener('click', () => openSupervisorModal(supervisor));
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Erro ao carregar supervisores:", error);
        grid.innerHTML = '<p class="alert alert-error">Não foi possível carregar a lista de supervisores.</p>';
    }
}

// --- FUNÇÃO CORRIGIDA ---
function openSupervisorModal(supervisor) {
    const modal = document.getElementById('supervisor-modal');
    const modalBody = document.getElementById('supervisor-modal-body');
    
    // Helper para criar listas
    const toList = (data) => {
        if (!data || data.length === 0) return '<ul><li>Não informado</li></ul>';
        const items = Array.isArray(data) ? data : [data];
        return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
    };

    // Helper para formatar os horários
    let horariosHtml = '<ul><li>Nenhum horário cadastrado.</li></ul>';
    if (supervisor.diasHorarios && Array.isArray(supervisor.diasHorarios) && supervisor.diasHorarios.length > 0) {
        horariosHtml = '<ul>';
        supervisor.diasHorarios.forEach(horario => {
            if(horario.dia && horario.inicio && horario.fim) {
                horariosHtml += `<li>${horario.dia}: das ${horario.inicio} às ${horario.fim}</li>`;
            }
        });
        horariosHtml += '</ul>';
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
            <p>${supervisor.abordagem || 'Não informada'}</p>
        </div>
        <div class="profile-section">
            <h4>Informações de Contato</h4>
            <p><strong>Email:</strong> ${supervisor.email || 'Não informado'}</p>
            <p><strong>Telefone:</strong> ${supervisor.telefone || 'Não informado'}</p>
        </div>
        <div class="profile-section">
            <h4>Informações de Supervisão</h4>
            <p>${supervisor.supervisaoInfo || 'Não informado.'}</p>
        </div>
        <div class="profile-section">
            <h4>Dias e Horários para Supervisão</h4>
            ${horariosHtml}
        </div>
    `;

    const agendarBtn = modal.querySelector('#agendar-supervisao-btn');
    if (agendarBtn) {
        agendarBtn.onclick = () => {
            modal.style.display = 'none';
            agendamentoController.open(db, user, userData, supervisor);
        };
    }

    modal.style.display = 'flex';
}