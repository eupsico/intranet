// Arquivo: /modulos/voluntario/js/ver-supervisores.js
// Versão: 3.2 (Simplificado para a visão do voluntário)
// Descrição: Carrega e exibe os perfis de supervisores para agendamento.

import { db, collection, query, where, getDocs } from '../../../assets/js/firebase-init.js';
import { agendamentoController } from './agendamento.js';

export function init(db, user, userData) {
    const gridContainer = document.getElementById('supervisor-cards-container');
    const detailsModal = document.getElementById('supervisor-details-modal');

    if (!gridContainer || !detailsModal) {
        console.error("Elementos essenciais para a view de supervisores não foram encontrados.");
        return;
    }

    let fetchedSupervisors = [];

    const createSupervisorCard = (supervisor) => {
        const photoPath = supervisor.fotoUrl ? `../../../${supervisor.fotoUrl}` : '../../../assets/img/avatar-padrao.png';
        const cardLink = document.createElement('a');
        cardLink.href = '#';
        cardLink.className = 'module-card';
        cardLink.setAttribute('data-uid', supervisor.uid);
        cardLink.innerHTML = `
            <div class="card-icon">
                <img src="${photoPath}" alt="Foto de ${supervisor.nome}" class="supervisor-photo-small" onerror="this.onerror=null;this.src='../../../assets/img/avatar-padrao.png';">
                <h3>${supervisor.nome || 'Nome Indisponível'}</h3>
            </div>
            <div class="card-content">
                <p>${supervisor.titulo || 'Supervisor(a)'}</p>
            </div>
        `;
        return cardLink;
    };

    const renderProfiles = (supervisors) => {
        gridContainer.innerHTML = '';
        if (supervisors.length === 0) {
            gridContainer.innerHTML = '<p class="info-card">Nenhum perfil de supervisor encontrado.</p>';
            return;
        }
        supervisors.forEach(supervisor => {
            gridContainer.appendChild(createSupervisorCard(supervisor));
        });
    };
    
    const openDetailsModal = (supervisorData) => {
        document.getElementById('details-photo').src = supervisorData.fotoUrl ? `../../../${supervisorData.fotoUrl}` : '../../../assets/img/avatar-padrao.png';
        document.getElementById('details-nome').textContent = supervisorData.nome || 'Não informado';
        document.getElementById('details-titulo').textContent = supervisorData.titulo || 'Supervisor(a)';
        
        const toList = (data) => Array.isArray(data) && data.length > 0
            ? data.map(item => `<li>${item}</li>`).join('')
            : '<li>Não informado</li>';

        document.getElementById('details-formacao').innerHTML = toList(supervisorData.formacao);
        document.getElementById('details-especializacao').innerHTML = toList(supervisorData.especializacao);
        document.getElementById('details-atuacao').innerHTML = toList(supervisorData.atuacao);
        
        const agendarBtn = document.getElementById('btn-agendar-supervisao');
        agendarBtn.onclick = () => {
            agendamentoController.open(db, user, userData, supervisorData);
            detailsModal.style.display = 'none';
        };
        detailsModal.style.display = 'flex';
    };

    async function loadSupervisors() {
        gridContainer.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const supervisors = [];
            const q = query(collection(db, 'usuarios'), where('funcoes', 'array-contains', 'supervisor'));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => supervisors.push({ uid: doc.id, ...doc.data() }));
            
            fetchedSupervisors = supervisors;
            renderProfiles(supervisors);
        } catch (error) {
            console.error("Erro ao carregar perfis:", error);
            gridContainer.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar os perfis.</div>`;
        }
    }

    // Event Listeners
    detailsModal.querySelector('.close-modal-btn').addEventListener('click', () => detailsModal.style.display = 'none');
    
    gridContainer.addEventListener('click', (e) => {
        e.preventDefault();
        const card = e.target.closest('.module-card');
        if (card) {
            const supervisorUid = card.getAttribute('data-uid');
            const supervisorData = fetchedSupervisors.find(s => s.uid === supervisorUid);
            if (supervisorData) {
                openDetailsModal(supervisorData);
            }
        }
    });

    loadSupervisors();
}