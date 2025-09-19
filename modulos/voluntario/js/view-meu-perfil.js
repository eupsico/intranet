// Arquivo: /modulos/voluntario/js/view-meu-perfil.js
// Versão: MODERNA e COMPLETA - Com funcionalidade de edição.

export function init(db, user) {
    const profileContainer = document.getElementById('supervisor-profile-container');
    
    // O modal de edição e seus elementos estão no 'ver-supervisores.html', mas são acessíveis globalmente pelo ID.
    const editModal = document.getElementById('edit-profile-modal');
    const form = document.getElementById('edit-profile-form');
    const horariosContainer = document.getElementById('horarios-editor-container');
    const addHorarioBtn = document.getElementById('add-horario-btn');

    if (!profileContainer || !editModal || !form) {
        console.error("Elementos essenciais (container de perfil, modal ou formulário de edição) não foram encontrados.");
        return;
    }

    let supervisorData = null; // Armazena os dados do supervisor localmente

    /**
     * Cria o card HTML com as informações do supervisor.
     */
    function createSupervisorCard(supervisor) {
        const card = document.createElement('div');
        card.className = 'supervisor-card';
        card.dataset.uid = supervisor.uid;
        const toList = (data) => {
            if (!data || (Array.isArray(data) && data.length === 0)) return '<li>Não informado</li>';
            const items = Array.isArray(data) ? data : [data];
            return items.map(item => `<li>${item}</li>`).join('');
        };
        const photoPath = supervisor.fotoUrl ? `../../../${supervisor.fotoUrl}` : '../../../assets/img/avatar-padrao.png';
        const crpHtml = supervisor.crp ? `<p><strong>CRP:</strong> ${supervisor.crp}</p>` : '';
        const titleText = supervisor.titulo ? supervisor.titulo.toUpperCase() : 'SUPERVISOR(A)';
        card.innerHTML = `
            <div class="supervisor-card-left">
                <div class="photo-container"><img src="${photoPath}" alt="Foto de ${supervisor.nome}" class="supervisor-photo" onerror="this.onerror=null;this.src='../../../assets/img/avatar-padrao.png';"></div>
                <div class="supervisor-identity"><h2>${supervisor.nome || 'Nome Indisponível'}</h2><div class="title-box">${titleText}</div></div>
                <div class="supervisor-contact">${crpHtml}<p><strong>Telefone:</strong> ${supervisor.telefone || 'N/A'}</p><p><strong>Email:</strong> ${supervisor.email || 'N/A'}</p></div>
                <div class="logo-container"><img src="../../../assets/img/logo-branca.png" alt="Logo EuPsico"></div>
            </div>
            <div class="supervisor-card-right">
                <button class="edit-supervisor-btn" data-uid="${supervisor.uid}">Editar Perfil <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                <div class="profile-header"><h3>PERFIL PROFISSIONAL</h3></div>
                <div id="card-details-content">
                    <div class="profile-section"><h4>Formação</h4><ul>${toList(supervisor.formacao)}</ul></div>
                    <div class="profile-section"><h4>Especialização</h4><ul>${toList(supervisor.especializacao)}</ul></div>
                    <div class="profile-section"><h4>Áreas de Atuação</h4><ul>${toList(supervisor.atuacao)}</ul></div>
                </div>
            </div>`;
        return card;
    }

    /**
     * Carrega as informações do supervisor logado do Firestore.
     */
    async function loadProfile() {
        profileContainer.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const docRef = db.collection('usuarios').doc(user.uid);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                supervisorData = { uid: docSnap.id, ...docSnap.data() };
                profileContainer.innerHTML = '';
                const cardElement = createSupervisorCard(supervisorData);
                profileContainer.appendChild(cardElement);
            } else {
                profileContainer.innerHTML = '<p>Seu perfil de supervisor não foi encontrado.</p>';
            }
        } catch (error) {
            console.error("Erro ao carregar perfil do supervisor:", error);
            profileContainer.innerHTML = '<p class="text-danger">Ocorreu um erro ao carregar seu perfil.</p>';
        }
    }

    // --- LÓGICA COMPLETA PARA O MODAL DE EDIÇÃO ---

    const diasDaSemana = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
    
    const createHorarioRow = (horario = {}) => {
        const row = document.createElement('div');
        row.className = 'horario-row';
        const diaOptions = diasDaSemana.map(dia => `<option value="${dia}" ${horario.dia === dia ? 'selected' : ''}>${dia}</option>`).join('');
        row.innerHTML = `
            <div class="form-group"><label>Dia</label><select name="horario_dia">${diaOptions}</select></div>
            <div class="form-group"><label>Início</label><input type="time" name="horario_inicio" value="${horario.inicio || '19:00'}"></div>
            <div class="form-group"><label>Fim</label><input type="time" name="horario_fim" value="${horario.fim || '20:00'}"></div>
            <button type="button" class="remove-horario-btn">X</button>`;
        return row;
    };

    function openEditModal(data) {
        if (!data) return;
        form.elements['editing-uid'].value = data.uid;
        form.elements['edit-titulo'].value = data.titulo || '';
        form.elements['edit-fotoUrl'].value = data.fotoUrl || '';
        form.elements['edit-abordagem'].value = data.abordagem || '';
        form.elements['edit-crp'].value = data.crp || '';
        form.elements['edit-email'].value = data.email || '';
        form.elements['edit-telefone'].value = data.telefone || '';
        form.elements['edit-formacao'].value = Array.isArray(data.formacao) ? data.formacao.join('\\n') : data.formacao || '';
        form.elements['edit-especializacao'].value = Array.isArray(data.especializacao) ? data.especializacao.join('\\n') : '';
        form.elements['edit-atuacao'].value = Array.isArray(data.atuacao) ? data.atuacao.join('\\n') : '';
        form.elements['edit-supervisaoInfo'].value = Array.isArray(data.supervisaoInfo) ? data.supervisaoInfo.join('\\n') : '';
        
        horariosContainer.innerHTML = '';
        if (data.diasHorarios && Array.isArray(data.diasHorarios)) {
            data.diasHorarios.forEach(horario => horariosContainer.appendChild(createHorarioRow(horario)));
        }
        
        editModal.style.display = 'flex';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        form.reset();
        horariosContainer.innerHTML = '';
    }

    async function saveProfileChanges(e) {
        e.preventDefault();
        const uid = form.elements['editing-uid'].value;
        if (!uid) return;

        const novosHorarios = [];
        horariosContainer.querySelectorAll('.horario-row').forEach(row => {
            const dia = row.querySelector('[name="horario_dia"]').value;
            const inicio = row.querySelector('[name="horario_inicio"]').value;
            const fim = row.querySelector('[name="horario_fim"]').value;
            if (dia && inicio && fim) novosHorarios.push({ dia, inicio, fim });
        });

        const dataToUpdate = {
            titulo: form.elements['edit-titulo'].value.trim(),
            fotoUrl: form.elements['edit-fotoUrl'].value.trim(),
            abordagem: form.elements['edit-abordagem'].value.trim(),
            crp: form.elements['edit-crp'].value.trim(),
            email: form.elements['edit-email'].value.trim(),
            telefone: form.elements['edit-telefone'].value.trim(),
            formacao: form.elements['edit-formacao'].value.split('\\n').filter(Boolean),
            especializacao: form.elements['edit-especializacao'].value.split('\\n').filter(Boolean),
            atuacao: form.elements['edit-atuacao'].value.split('\\n').filter(Boolean),
            supervisaoInfo: form.elements['edit-supervisaoInfo'].value.split('\\n').filter(Boolean),
            diasHorarios: novosHorarios,
        };

        try {
            await db.collection('usuarios').doc(uid).update(dataToUpdate);
            closeEditModal();
            loadProfile();
        } catch (error) {
            console.error("Erro ao salvar o perfil:", error);
            alert("Ocorreu um erro ao salvar as alterações.");
        }
    }

    // Adiciona os Event Listeners
    profileContainer.addEventListener('click', (e) => {
        const editButton = e.target.closest('.edit-supervisor-btn');
        if (editButton) {
            openEditModal(supervisorData);
        }
    });

    addHorarioBtn.addEventListener('click', () => horariosContainer.appendChild(createHorarioRow()));
    horariosContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-horario-btn')) {
            e.target.closest('.horario-row').remove();
        }
    });
    
    form.addEventListener('submit', saveProfileChanges);
    editModal.querySelector('.close-modal-btn').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);

    // Inicia o carregamento do perfil
    loadProfile();
}