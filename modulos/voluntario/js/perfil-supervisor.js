// Arquivo: /modulos/voluntario/js/perfil-supervisor.js (Novo)
// Versão: 1.0
// Descrição: Controla a visualização e edição de perfis de supervisor.

import { db, collection, query, where, getDocs, doc, updateDoc } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData) {
    const container = document.getElementById('supervisor-profile-container');
    const editModal = document.getElementById('edit-supervisor-profile-modal');
    const form = document.getElementById('edit-supervisor-profile-form');

    if (!container || !editModal || !form) {
        console.error("Elementos essenciais para o perfil do supervisor não foram encontrados.");
        return;
    }

    let fetchedSupervisors = [];
    const userRoles = userData.funcoes || [];
    const isAdmin = userRoles.includes('admin');

    const createSupervisorCard = (supervisor) => {
        const card = document.createElement('div');
        card.className = 'info-card'; // Reutilizando a classe de card para consistência
        
        const toList = (data) => Array.isArray(data) && data.length > 0 ? `<ul>${data.map(item => `<li>${item}</li>`).join('')}</ul>` : '<p>Não informado.</p>';
        const photoPath = supervisor.fotoUrl ? `../../../${supervisor.fotoUrl}` : '../../../assets/img/avatar-padrao.png';

        card.innerHTML = `
            <div class="details-header" style="margin-bottom: 20px;">
                <img src="${photoPath}" alt="Foto de ${supervisor.nome}" onerror="this.onerror=null;this.src='../../../assets/img/avatar-padrao.png';">
                <div class="details-identity">
                    <h3>${supervisor.nome}</h3>
                    <p>${supervisor.titulo || 'Supervisor(a)'}</p>
                </div>
            </div>
            <h4>Contato</h4>
            <ul>
                <li><strong>CRP:</strong> ${supervisor.crp || 'Não informado'}</li>
                <li><strong>Email:</strong> ${supervisor.email || 'Não informado'}</li>
                <li><strong>Telefone:</strong> ${supervisor.telefone || 'Não informado'}</li>
            </ul>
            <h4>Abordagem</h4>
            <p>${supervisor.abordagem || 'Não informada'}</p>
            <div class="form-actions" style="text-align: right; margin-top: 20px;">
                 <button class="btn btn-primary edit-btn" data-uid="${supervisor.uid}">Editar Perfil</button>
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
        row.className = 'form-row'; // Reutilizando a classe
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
                // Admin vê todos os supervisores
                supervisorsQuery = query(collection(db, 'usuarios'), where('funcoes', 'array-contains', 'supervisor'));
            } else {
                // Supervisor vê apenas o próprio perfil
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

    // Event Listeners
    editModal.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', () => editModal.style.display = 'none'));
    form.addEventListener('submit', saveProfileChanges);
    document.getElementById('add-horario-btn').addEventListener('click', () => {
        document.getElementById('horarios-editor-container').appendChild(createHorarioRow());
    });
    document.getElementById('horarios-editor-container').addEventListener('click', e => {
        if (e.target.classList.contains('remove-horario-btn')) {
            e.target.closest('.form-row').remove();
        }
    });

    loadProfiles();
}