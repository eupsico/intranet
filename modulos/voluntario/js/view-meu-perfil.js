// Arquivo: eupsico/intranet/modulos/voluntario/js/view-meu-perfil.js
// Versão: MODERNA - Para a página "Meu Perfil" do supervisor.

// A função 'init' é o ponto de entrada, chamada pelo portal-voluntario.js
export function init(db, user) {
    const profileContainer = document.getElementById('supervisor-profile-container');
    
    // O modal de edição já existe na página ver-supervisores.html, vamos encontrá-lo
    const editModal = document.getElementById('edit-profile-modal'); 

    if (!profileContainer) {
        console.error("Container de perfil não encontrado.");
        return;
    }

    let supervisorData = null; // Armazena os dados do supervisor

    /**
     * Cria o card HTML com as informações do supervisor.
     */
    function createSupervisorCard(supervisor) {
        const card = document.createElement('div');
        card.className = 'supervisor-card'; // reusa o estilo do card
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

    // --- Lógica para o Modal de Edição ---
    if (editModal) {
        // (A lógica de preencher e salvar o modal de edição será adicionada aqui em breve)
        // Por enquanto, apenas garantimos que o botão de editar funcione para abrir o modal.
        profileContainer.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-supervisor-btn');
            if (editButton) {
                // Aqui chamaremos a função para abrir e preencher o modal
                console.log("Abrir modal de edição para o usuário:", supervisorData.uid);
                // openEditModal(supervisorData); // Implementaremos esta função a seguir.
                alert("Funcionalidade de edição em desenvolvimento!");
            }
        });
    }

    // Inicia o carregamento do perfil
    loadProfile();
}