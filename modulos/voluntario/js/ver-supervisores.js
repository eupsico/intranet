// Arquivo: /modulos/voluntario/js/ver-supervisores.js
// Versão: 3.1 (Restaura o painel para supervisores e adiciona modal de detalhes/agendamento)
// Descrição: Carrega, exibe e gerencia perfis de supervisor com base na função do usuário.

import { db, collection, query, where, getDocs, doc, getDoc, updateDoc } from '../../../assets/js/firebase-init.js';
import { agendamentoController } from './agendamento.js';

export function init(user, userData) {
    const gridContainer = document.getElementById('supervisor-cards-grid');
    const viewHeader = document.querySelector('.view-header-band h1');
    const editModal = document.getElementById('edit-profile-modal');
    // MODIFICAÇÃO: Adiciona referência ao novo modal de detalhes
    const detailsModal = document.getElementById('supervisor-details-modal');
    const form = document.getElementById('edit-profile-form');
    const horariosContainer = document.getElementById('horarios-editor-container');
    const addHorarioBtn = document.getElementById('add-horario-btn');

    if (!gridContainer || !editModal || !form || !detailsModal) {
        console.error("Elementos essenciais para a view de supervisores não foram encontrados.");
        return;
    }

    let aEditingSupervisorData = null;
    let fetchedSupervisors = []; // Cache para os dados dos supervisores

    // --- LÓGICA DE RENDERIZAÇÃO ---

    const createSupervisorCard = (supervisor, showEditButton) => {
        // ... (código do card permanece o mesmo da versão anterior)
        const photoPath = supervisor.fotoUrl ? `../../../${supervisor.fotoUrl}` : '../../../assets/img/avatar-padrao.png';
        const editButtonHtml = showEditButton ? `<button class="edit-supervisor-btn" data-uid="${supervisor.uid}">Editar Perfil</button>` : '';
        const card = document.createElement('div');
        // Adiciona um data attribute para facilitar a busca de dados no clique
        card.setAttribute('data-uid', supervisor.uid);
        card.className = 'supervisor-card-item';
        card.innerHTML = `
            <div class="card-header">
                <img src="${photoPath}" alt="Foto de ${supervisor.nome}" class="supervisor-photo" onerror="this.onerror=null;this.src='../../../assets/img/avatar-padrao.png';">
                <div class="supervisor-identity">
                    <h2>${supervisor.nome || 'Nome Indisponível'}</h2>
                    <p>${supervisor.titulo || 'Supervisor(a)'}</p>
                </div>
            </div>
            <div class="card-body">
                <p><strong>CRP:</strong> ${supervisor.crp || 'N/A'}</p>
                <p><strong>Telefone:</strong> ${supervisor.telefone || 'N/A'}</p>
                <p><strong>Email:</strong> ${supervisor.email || 'N/A'}</p>
            </div>
            <div class="card-footer">
                ${editButtonHtml}
            </div>
        `;
        if (showEditButton) {
            card.querySelector('.edit-supervisor-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Impede que o modal de detalhes abra também
                aEditingSupervisorData = supervisor;
                openEditModal(supervisor);
            });
        }
        return card;
    };

    const renderProfiles = (supervisors, showEditButton) => {
        gridContainer.innerHTML = '';
        if (supervisors.length === 0) {
            gridContainer.innerHTML = '<p>Nenhum perfil de supervisor encontrado.</p>';
            return;
        }
        supervisors.forEach(supervisor => {
            gridContainer.appendChild(createSupervisorCard(supervisor, showEditButton));
        });
    };

    // --- LÓGICA DOS MODAIS (EDIÇÃO E DETALHES) ---
    // (As funções openEditModal, closeEditModal, saveProfileChanges e createHorarioRow permanecem as mesmas da versão anterior)
    const createHorarioRow = (horario = {}) => {
        const diasDaSemana = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
        const row = document.createElement('div');
        row.className = 'horario-row';
        const diaOptions = diasDaSemana.map(dia => `<option value="${dia}" ${horario.dia === dia ? 'selected' : ''}>${dia}</option>`).join('');
        row.innerHTML = `<select name="horario_dia">${diaOptions}</select><input type="time" name="horario_inicio" value="${horario.inicio || '19:00'}"><input type="time" name="horario_fim" value="${horario.fim || '20:00'}"><button type="button" class="remove-horario-btn">&times;</button>`;
        return row;
    };
    const openEditModal = (data) => {
        form.elements['editing-uid'].value = data.uid;
        form.elements['edit-titulo'].value = data.titulo || '';
        form.elements['edit-fotoUrl'].value = data.fotoUrl || '';
        form.elements['edit-abordagem'].value = data.abordagem || '';
        form.elements['edit-crp'].value = data.crp || '';
        form.elements['edit-email'].value = data.email || '';
        form.elements['edit-telefone'].value = data.telefone || '';
        const toText = (arr) => Array.isArray(arr) ? arr.join('\n') : (arr || '');
        form.elements['edit-formacao'].value = toText(data.formacao);
        form.elements['edit-especializacao'].value = toText(data.especializacao);
        form.elements['edit-atuacao'].value = toText(data.atuacao);
        form.elements['edit-supervisaoInfo'].value = toText(data.supervisaoInfo);
        horariosContainer.innerHTML = '';
        if (data.diasHorarios && Array.isArray(data.diasHorarios)) {
            data.diasHorarios.forEach(h => horariosContainer.appendChild(createHorarioRow(h)));
        }
        document.getElementById('profile-photo-preview').src = data.fotoUrl ? `../../../${data.fotoUrl}` : '../../../assets/img/avatar-padrao.png';
        editModal.style.display = 'flex';
    };
    const closeEditModal = () => { editModal.style.display = 'none'; form.reset(); horariosContainer.innerHTML = ''; };
    const saveProfileChanges = async (e) => {
        e.preventDefault();
        const uid = form.elements['editing-uid'].value;
        if (!uid) return;
        const fromText = (text) => text.split('\n').map(s => s.trim()).filter(Boolean);
        const novosHorarios = Array.from(horariosContainer.querySelectorAll('.horario-row')).map(row => ({ dia: row.querySelector('[name="horario_dia"]').value, inicio: row.querySelector('[name="horario_inicio"]').value, fim: row.querySelector('[name="horario_fim"]').value }));
        const dataToUpdate = { titulo: form.elements['edit-titulo'].value, fotoUrl: form.elements['edit-fotoUrl'].value, crp: form.elements['edit-crp'].value, telefone: form.elements['edit-telefone'].value, email: form.elements['edit-email'].value, abordagem: form.elements['edit-abordagem'].value, formacao: fromText(form.elements['edit-formacao'].value), especializacao: fromText(form.elements['edit-especializacao'].value), atuacao: fromText(form.elements['edit-atuacao'].value), supervisaoInfo: fromText(form.elements['edit-supervisaoInfo'].value), diasHorarios: novosHorarios, };
        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.disabled = true;
        try {
            const userDocRef = doc(db, 'usuarios', uid);
            await updateDoc(userDocRef, dataToUpdate);
            window.showToast('Perfil salvo com sucesso!', 'success');
            closeEditModal();
            loadBasedOnRole();
        } catch (error) {
            console.error("Erro ao salvar o perfil:", error);
            window.showToast("Erro ao salvar: " + error.message, 'error');
        } finally {
            saveBtn.disabled = false;
        }
    };

    const openDetailsModal = (supervisorData) => {
        document.getElementById('details-photo').src = supervisorData.fotoUrl ? `../../../${supervisorData.fotoUrl}` : '../../../assets/img/avatar-padrao.png';
        document.getElementById('details-nome').textContent = supervisorData.nome || 'Não informado';
        document.getElementById('details-titulo').textContent = supervisorData.titulo || 'Supervisor(a)';
        const toList = (data) => !data || data.length === 0 ? '<li>Não informado</li>' : data.map(item => `<li>${item}</li>`).join('');
        document.getElementById('details-formacao').innerHTML = toList(supervisorData.formacao);
        document.getElementById('details-especializacao').innerHTML = toList(supervisorData.especializacao);
        document.getElementById('details-atuacao').innerHTML = toList(supervisorData.atuacao);

        const agendarBtn = document.getElementById('btn-agendar-supervisao');
        agendarBtn.onclick = () => {
            agendamentoController.open(db, user, userData, supervisorData);
            detailsModal.style.display = 'none'; // Fecha o modal de detalhes
        };

        detailsModal.style.display = 'flex';
    };

    // --- LÓGICA PRINCIPAL E DE PERMISSÕES ---

    async function loadBasedOnRole() {
        gridContainer.innerHTML = '<div class="loading-spinner"></div>';
        const funcoes = userData.funcoes || [];
        const isAdmin = funcoes.includes('admin');
        const isSupervisor = funcoes.includes('supervisor');

        try {
            let supervisors = [];
            if (isAdmin) {
                if (viewHeader) viewHeader.textContent = 'Gerenciar Supervisores';
                const q = query(collection(db, 'usuarios'), where('funcoes', 'array-contains', 'supervisor'));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => supervisors.push({ uid: doc.id, ...doc.data() }));
                fetchedSupervisors = supervisors;
                renderProfiles(supervisors, true);
            } else if (isSupervisor) {
                // MODIFICAÇÃO: Se for supervisor, renderiza o painel de navegação
                if (viewHeader) viewHeader.textContent = 'Painel do Supervisor';
                gridContainer.innerHTML = `
                    <a href="#view-meu-perfil" class="module-card">
                        <div class="card-content"><h3>Meu Perfil e Edição</h3><p>Visualize e edite suas informações de perfil.</p></div>
                    </a>
                    <a href="#view-meus-supervisionados" class="module-card">
                        <div class="card-content"><h3>Meus Supervisionados</h3><p>Visualize os acompanhamentos que você supervisiona.</p></div>
                    </a>
                    <a href="#view-meus-agendamentos" class="module-card">
                        <div class="card-content"><h3>Meus Agendamentos</h3><p>Visualize os profissionais que agendaram supervisão com você.</p></div>
                    </a>
                `;
            } else {
                if (viewHeader) viewHeader.textContent = 'Conheça nossos Supervisores';
                const q = query(collection(db, 'usuarios'), where('funcoes', 'array-contains', 'supervisor'));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => supervisors.push({ uid: doc.id, ...doc.data() }));
                fetchedSupervisors = supervisors;
                renderProfiles(supervisors, false);
            }
        } catch (error) {
            console.error("Erro ao carregar perfis:", error);
            gridContainer.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao carregar os perfis.</p>';
        }
    }

    // --- SETUP INICIAL ---
    addHorarioBtn.addEventListener('click', () => horariosContainer.appendChild(createHorarioRow()));
    horariosContainer.addEventListener('click', e => { if (e.target.classList.contains('remove-horario-btn')) e.target.closest('.horario-row').remove(); });
    form.addEventListener('submit', saveProfileChanges);
    editModal.querySelector('.close-modal-btn').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
    
    // MODIFICAÇÃO: Listeners para o novo modal de detalhes
    detailsModal.querySelector('.close-modal-btn').addEventListener('click', () => detailsModal.style.display = 'none');
    
    gridContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.supervisor-card-item');
        if (card) {
            const funcoes = userData.funcoes || [];
            const isAdmin = funcoes.includes('admin');
            const isSupervisor = funcoes.includes('supervisor');
            // Só abre o modal de detalhes se não for admin ou supervisor (que já têm botões de edição ou outro painel)
            if (!isAdmin && !isSupervisor) {
                const supervisorUid = card.getAttribute('data-uid');
                const supervisorData = fetchedSupervisors.find(s => s.uid === supervisorUid);
                if (supervisorData) {
                    openDetailsModal(supervisorData);
                }
            }
        }
    });

    loadBasedOnRole();
}