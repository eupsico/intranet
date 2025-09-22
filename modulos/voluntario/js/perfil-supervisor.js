// Arquivo: /modulos/voluntario/js/perfil-supervisor.js (CORRIGIDO)
// Versão: 2.3 (Corrige caminho da foto e exibe todas as informações no card)
// Descrição: Controla a visualização e edição de perfis de supervisor.

import { db, collection, query, where, getDocs, doc, updateDoc } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData) {
    const container = document.getElementById('meu-perfil');
    const editModal = document.getElementById('edit-supervisor-profile-modal'); 
    const form = document.getElementById('edit-supervisor-profile-form');

    if (!container || !editModal || !form) {
        console.error("Componentes essenciais para o perfil do supervisor não foram encontrados.");
        if (container) container.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Erro de configuração: Componentes ausentes.</div>`;
        return;
    }

    let fetchedSupervisors = [];
    const isAdmin = (userData.funcoes || []).includes('admin');

    const createSupervisorCard = (supervisor) => {
        const card = document.createElement('div');
        card.className = 'supervisor-card'; 
        
        // --- CORREÇÃO DO CAMINHO DA FOTO ---
        const photoPath = supervisor.fotoUrl 
            ? `../../../assets/img/supervisores/${supervisor.fotoUrl}` 
            : '../../../assets/img/avatar-padrao.png';

        // --- CORREÇÃO E ADIÇÃO DAS INFORMAÇÕES FALTANTES ---
        const toList = (data) => {
            if (!data || data.length === 0) return '<ul><li>Não informado</li></ul>';
            const items = Array.isArray(data) ? data : [data];
            return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
        };

        card.innerHTML = `
            <div class="supervisor-card-left">
                <div class="photo-container">
                    <img src="${photoPath}" alt="Foto de ${supervisor.nome}" class="supervisor-photo" onerror="this.onerror=null;this.src='../../../assets/img/avatar-padrao.png';">
                </div>
                <div class="supervisor-identity">
                    <h2>${supervisor.nome || 'Nome não informado'}</h2>
                    <div class="title-box">${supervisor.titulo || 'SUPERVISOR(A)'}</div>
                </div>
                <div class="supervisor-contact">
                    <p><strong>CRP:</strong> ${supervisor.crp || 'Não informado'}</p>
                    <p><strong>Email:</strong> ${supervisor.email || 'Não informado'}</p>
                    <p><strong>Telefone:</strong> ${supervisor.telefone || 'Não informado'}</p>
                </div>
            </div>
            <div class="supervisor-card-right">
                <button class="action-button edit-btn" data-uid="${supervisor.uid}" style="position: absolute; top: 15px; right: 15px;">Editar Perfil</button>
                <div class="profile-header">
                    <h3>PERFIL PROFISSIONAL</h3>
                </div>
                <div class="profile-section">
                    <h4>Abordagem</h4>
                    <p>${supervisor.abordagem || 'Não informada'}</p>
                </div>
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
            </div>
        `;
        
        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            const uid = e.target.dataset.uid;
            const supervisorData = fetchedSupervisors.find(s => s.uid === uid);
            if(supervisorData) openEditModal(supervisorData);
        });
        return card;
    };

    const renderProfiles = (supervisors) => {
        container.innerHTML = '';
        supervisors.forEach(supervisor => {
            container.appendChild(createSupervisorCard(supervisor));
        });
    };

    const openEditModal = (data) => {
        form.elements['uid'].value = data.uid;
        form.elements['fotoUrl'].value = data.fotoUrl || '';
        form.elements['titulo'].value = data.titulo || '';
        form.elements['crp'].value = data.crp || '';
        form.elements['telefone'].value = data.telefone || '';
        form.elements['email'].value = data.email || '';
        form.elements['abordagem'].value = data.abordagem || '';
        
        const toText = (arr) => Array.isArray(arr) ? arr.join('\n') : (arr || '');
        form.elements['formacao'].value = toText(data.formacao);
        form.elements['especializacao'].value = toText(data.especializacao);
        form.elements['atuacao'].value = toText(data.atuacao);
        form.elements['supervisaoInfo'].value = toText(data.supervisaoInfo);

        const horariosContainer = document.getElementById('horarios-editor-container');
        horariosContainer.innerHTML = '';
        if (data.diasHorarios && Array.isArray(data.diasHorarios)) {
            data.diasHorarios.forEach(h => horariosContainer.appendChild(createHorarioRow(h)));
        }

        editModal.style.display = 'flex';
    };
    
    const createHorarioRow = (horario = {}) => {
        const dias = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
        const row = document.createElement('div');
        row.className = 'form-row';
        const diaOptions = dias.map(dia => `<option value="${dia}" ${horario.dia === dia ? 'selected' : ''}>${dia}</option>`).join('');
        row.innerHTML = `
            <div class="form-group"><label>Dia</label><select name="horario_dia" class="form-control">${diaOptions}</select></div>
            <div class="form-group"><label>Início</label><input type="time" name="horario_inicio" class="form-control" value="${horario.inicio || ''}"></div>
            <div class="form-group"><label>Fim</label><input type="time" name="horario_fim" class="form-control" value="${horario.fim || ''}"></div>
            <button type="button" class="btn btn-danger remove-horario-btn" style="align-self: flex-end; margin-bottom: 20px;">&times;</button>
        `;
        return row;
    };

    async function saveProfileChanges(e) {
        e.preventDefault();
        const uid = form.elements['uid'].value;
        if (!uid) return;

        const fromText = (text) => text.split('\n').map(s => s.trim()).filter(Boolean);
        const horarios = Array.from(document.querySelectorAll('#horarios-editor-container .form-row')).map(row => ({
            dia: row.querySelector('[name="horario_dia"]').value,
            inicio: row.querySelector('[name="horario_inicio"]').value,
            fim: row.querySelector('[name="horario_fim"]').value
        }));

        const dataToUpdate = {
            fotoUrl: form.elements['fotoUrl'].value,
            titulo: form.elements['titulo'].value,
            crp: form.elements['crp'].value,
            telefone: form.elements['telefone'].value,
            email: form.elements['email'].value,
            abordagem: form.elements['abordagem'].value,
            formacao: fromText(form.elements['formacao'].value),
            especializacao: fromText(form.elements['especializacao'].value),
            atuacao: fromText(form.elements['atuacao'].value),
            supervisaoInfo: fromText(form.elements['supervisaoInfo'].value),
            diasHorarios: horarios
        };

        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.disabled = true;
        try {
            const userDocRef = doc(db, 'usuarios', uid);
            await updateDoc(userDocRef, dataToUpdate);
            alert("Perfil salvo com sucesso!");
            editModal.style.display = 'none';
            loadProfiles();
        } catch (error) {
            console.error("Erro ao salvar o perfil:", error);
            alert("Erro ao salvar: " + error.message);
        } finally {
            saveBtn.disabled = false;
        }
    }

    async function loadProfiles() {
        container.innerHTML = '<div class="loading-spinner"></div>';
        try {
            let supervisorsQuery;
            if (isAdmin) {
                supervisorsQuery = query(collection(db, 'usuarios'), where('funcoes', 'array-contains', 'supervisor'));
            } else {
                supervisorsQuery = query(collection(db, 'usuarios'), where('__name__', '==', user.uid));
            }
            
            const querySnapshot = await getDocs(supervisorsQuery);
            fetchedSupervisors = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            
            if (fetchedSupervisors.length > 0) {
                renderProfiles(fetchedSupervisors);
            } else {
                container.innerHTML = '<p class="info-card">Nenhum perfil de supervisor encontrado.</p>';
            }
        } catch (error) {
            console.error("Erro ao carregar perfis de supervisor:", error);
            container.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar os perfis.</div>`;
        }
    }

    const closeModalButtons = document.querySelectorAll('.close-modal-btn');
    const addHorarioButton = document.getElementById('add-horario-btn');
    
    closeModalButtons.forEach(btn => btn.addEventListener('click', () => editModal.style.display = 'none'));
    addHorarioButton.addEventListener('click', () => document.getElementById('horarios-editor-container').appendChild(createHorarioRow()));
    form.addEventListener('submit', saveProfileChanges);
    
    loadProfiles();
}