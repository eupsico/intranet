import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Importa o controller de agendamento (que vamos criar a seguir)
import { agendamentoController } from './agendamento.js';

export function init(db, user, userData) {
    const gridContainer = document.getElementById('supervisor-grid-container');
    const detailsModal = document.getElementById('details-profile-modal');
    
    if (!gridContainer || !detailsModal) return;

    let fetchedSupervisors = [];

    // Função para abrir o modal de detalhes
    function openDetailsModal(supervisorUid) {
        const supervisorData = fetchedSupervisors.find(s => s.uid === supervisorUid);
        if (!supervisorData) return;

        detailsModal.querySelector('#details-modal-title').textContent = `Perfil de ${supervisorData.nome}`;
        
        const toList = (data) => {
            if (!data || data.length === 0) return '<ul><li>Não informado</li></ul>';
            const items = Array.isArray(data) ? data : [data];
            return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
        };

        let horariosHtml = '<ul><li>Nenhum horário informado</li></ul>';
        if (supervisorData.diasHorarios && supervisorData.diasHorarios.length > 0) {
            horariosHtml = '<ul>' + supervisorData.diasHorarios.map(h => `<li>${h.dia}: ${h.inicio} - ${h.fim}</li>`).join('') + '</ul>';
        }

        detailsModal.querySelector('#details-modal-body').innerHTML = `
            <div class="profile-section"><h4>Formação</h4>${toList(supervisorData.formacao)}</div>
            <div class="profile-section"><h4>Especialização</h4>${toList(supervisorData.especializacao)}</div>
            <div class="profile-section"><h4>Áreas de Atuação</h4>${toList(supervisorData.atuacao)}</div>
            <div class="profile-section"><h4>Informações de Supervisão</h4>${toList(supervisorData.supervisaoInfo)}</div>
            <div class="profile-section"><h4>Dias e Horários</h4>${horariosHtml}</div>
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn btn-primary" id="agendar-supervisao-btn" data-supervisor-uid="${supervisorUid}">Agendar Supervisão</button>
            </div>
        `;
        detailsModal.style.display = 'flex';
    }

    // Gerencia os cliques dentro do modal de detalhes
    detailsModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal-btn')) {
            detailsModal.style.display = 'none';
        }
        if (e.target.id === 'agendar-supervisao-btn') {
            const supervisorUid = e.target.dataset.supervisorUid;
            const supervisorData = fetchedSupervisors.find(s => s.uid === supervisorUid);
            if (supervisorData) {
                detailsModal.style.display = 'none';
                agendamentoController.open(db, user, userData, supervisorData);
            }
        }
    });

    // Gerencia o clique no card do supervisor
    gridContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.supervisor-card');
        if (card) {
            openDetailsModal(card.dataset.uid);
        }
    });

    // Função principal que carrega os perfis
    async function loadProfiles() {
        gridContainer.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const q = query(
                collection(db, 'usuarios'),
                where('funcoes', 'array-contains', 'supervisor'),
                orderBy('nome')
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                gridContainer.innerHTML = '<p>Nenhum supervisor encontrado.</p>';
                return;
            }

            fetchedSupervisors = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            
            gridContainer.innerHTML = ''; // Limpa o spinner
            fetchedSupervisors.forEach(supervisor => {
                const card = document.createElement('div');
                card.className = 'supervisor-card';
                card.dataset.uid = supervisor.uid;

                const fotoUrl = (supervisor.fotoUrl && supervisor.fotoUrl.startsWith('http'))
                    ? supervisor.fotoUrl
                    : '../../../assets/img/avatar-padrao.png';

                card.innerHTML = `
                    <div class="photo-container">
                        <img src="${fotoUrl}" alt="Foto de ${supervisor.nome}" class="supervisor-photo" onerror="this.src='../../../assets/img/avatar-padrao.png';">
                    </div>
                    <div class="supervisor-identity">
                        <h2>${supervisor.nome || 'Nome Indisponível'}</h2>
                        <div class="title-box">${supervisor.titulo || 'SUPERVISOR(A)'}</div>
                    </div>
                    <div class="supervisor-contact">
                        <p><strong>CRP:</strong> ${supervisor.crp || 'N/A'}</p>
                    </div>
                `;
                gridContainer.appendChild(card);
            });

        } catch (error) {
            console.error("Erro ao carregar perfis:", error);
            gridContainer.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao carregar os perfis.</p>';
        }
    }

    loadProfiles();
}