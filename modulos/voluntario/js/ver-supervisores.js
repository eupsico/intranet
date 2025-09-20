// Arquivo: /modulos/voluntario/js/ver-supervisores.js
// Versão: 3.0 (Refatorado com permissões e Firebase v9)
// Descrição: Carrega, exibe e gerencia perfis de supervisor com base na função do usuário.

import { db, collection, query, where, getDocs, doc, getDoc, updateDoc } from '../../../assets/js/firebase-init.js';

export function init(user, userData) {
    const gridContainer = document.getElementById('supervisor-cards-grid');
    const viewHeader = document.querySelector('.view-header-band h1');
    const editModal = document.getElementById('edit-profile-modal');
    const form = document.getElementById('edit-profile-form');
    const horariosContainer = document.getElementById('horarios-editor-container');
    const addHorarioBtn = document.getElementById('add-horario-btn');

    if (!gridContainer || !editModal || !form) {
        console.error("Elementos essenciais para a view de supervisores não foram encontrados.");
        return;
    }

    let aEditingSupervisorData = null; // Armazena os dados do supervisor sendo editado

    // --- LÓGICA DE RENDERIZAÇÃO ---

    const createSupervisorCard = (supervisor, showEditButton) => {
        const photoPath = supervisor.fotoUrl ? `../../../${supervisor.fotoUrl}` : '../../../assets/img/avatar-padrao.png';
        const editButtonHtml = showEditButton ? `<button class="edit-supervisor-btn" data-uid="${supervisor.uid}">Editar Perfil</button>` : '';
        const card = document.createElement('div');
        card.className = 'supervisor-card-item'; // Nova classe para evitar conflitos
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
            card.querySelector('.edit-supervisor-btn').addEventListener('click', () => {
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

    // --- LÓGICA DO MODAL DE EDIÇÃO ---

    const createHorarioRow = (horario = {}) => {
        const diasDaSemana = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
        const row = document.createElement('div');
        row.className = 'horario-row';
        const diaOptions = diasDaSemana.map(dia => `<option value="${dia}" ${horario.dia === dia ? 'selected' : ''}>${dia}</option>`).join('');
        row.innerHTML = `
            <select name="horario_dia">${diaOptions}</select>
            <input type="time" name="horario_inicio" value="${horario.inicio || '19:00'}">
            <input type="time" name="horario_fim" value="${horario.fim || '20:00'}">
            <button type="button" class="remove-horario-btn">&times;</button>`;
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

    const closeEditModal = () => {
        editModal.style.display = 'none';
        form.reset();
        horariosContainer.innerHTML = '';
    };

    const saveProfileChanges = async (e) => {
        e.preventDefault();
        const uid = form.elements['editing-uid'].value;
        if (!uid) return;
        
        const fromText = (text) => text.split('\n').map(s => s.trim()).filter(Boolean);
        const novosHorarios = Array.from(horariosContainer.querySelectorAll('.horario-row')).map(row => ({
            dia: row.querySelector('[name="horario_dia"]').value,
            inicio: row.querySelector('[name="horario_inicio"]').value,
            fim: row.querySelector('[name="horario_fim"]').value
        }));

        const dataToUpdate = {
            titulo: form.elements['edit-titulo'].value,
            fotoUrl: form.elements['edit-fotoUrl'].value,
            crp: form.elements['edit-crp'].value,
            telefone: form.elements['edit-telefone'].value,
            email: form.elements['edit-email'].value,
            abordagem: form.elements['edit-abordagem'].value,
            formacao: fromText(form.elements['edit-formacao'].value),
            especializacao: fromText(form.elements['edit-especializacao'].value),
            atuacao: fromText(form.elements['edit-atuacao'].value),
            supervisaoInfo: fromText(form.elements['edit-supervisaoInfo'].value),
            diasHorarios: novosHorarios,
        };

        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.disabled = true;

        try {
            const userDocRef = doc(db, 'usuarios', uid);
            await updateDoc(userDocRef, dataToUpdate);
            window.showToast('Perfil salvo com sucesso!', 'success');
            closeEditModal();
            loadBasedOnRole(); // Recarrega a view
        } catch (error) {
            console.error("Erro ao salvar o perfil:", error);
            window.showToast("Erro ao salvar: " + error.message, 'error');
        } finally {
            saveBtn.disabled = false;
        }
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
                renderProfiles(supervisors, true);
            } else if (isSupervisor) {
                if (viewHeader) viewHeader.textContent = 'Meu Perfil de Supervisor';
                const docRef = doc(db, 'usuarios', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) supervisors.push({ uid: docSnap.id, ...docSnap.data() });
                renderProfiles(supervisors, true);
            } else {
                if (viewHeader) viewHeader.textContent = 'Conheça nossos Supervisores';
                const q = query(collection(db, 'usuarios'), where('funcoes', 'array-contains', 'supervisor'));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => supervisors.push({ uid: doc.id, ...doc.data() }));
                renderProfiles(supervisors, false);
            }
        } catch (error) {
            console.error("Erro ao carregar perfis:", error);
            gridContainer.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao carregar os perfis.</p>';
        }
    }

    // --- SETUP INICIAL ---
    
    addHorarioBtn.addEventListener('click', () => horariosContainer.appendChild(createHorarioRow()));
    horariosContainer.addEventListener('click', e => {
        if (e.target.classList.contains('remove-horario-btn')) e.target.closest('.horario-row').remove();
    });
    form.addEventListener('submit', saveProfileChanges);
    editModal.querySelector('.close-modal-btn').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);

    loadBasedOnRole();
}