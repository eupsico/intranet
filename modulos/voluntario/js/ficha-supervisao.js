// eupsico/intranet/modulos/voluntario/js/ficha-supervisao.js

let db, user, userData;

/**
 * Função Principal (INIT): Ponto de entrada do módulo.
 */
export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;

    setTimeout(() => {
        const form = document.getElementById('form-supervisao');
        if (!form) {
            console.error("Erro Crítico: O formulário #form-supervisao não foi encontrado.");
            return;
        }
        setupNovaFicha();
        setupEventListeners();
    }, 0);
}

/**
 * Prepara o formulário para uma nova entrada.
 */
function setupNovaFicha() {
    const form = document.getElementById('form-supervisao');
    if (form) form.reset();

    const nomePsicologo = document.getElementById('psicologo-nome');
    if (nomePsicologo) nomePsicologo.value = userData.nome || '';

    const documentIdInput = document.getElementById('document-id');
    if (documentIdInput) documentIdInput.value = '';

    const outraContainer = document.getElementById('outra-abordagem-container');
    if (outraContainer) outraContainer.style.display = 'none';

    const saveButton = document.getElementById('btn-salvar-inicial');
    if(saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Salvar Etapa Inicial';
    }
    
    loadSupervisores();
}

/**
 * Adiciona os listeners de eventos.
 */
function setupEventListeners() {
    const saveButton = document.getElementById('btn-salvar-inicial');
    if (saveButton) {
        saveButton.addEventListener('click', handleFinalSave);
    }
}

/**
 * Verifica se os campos obrigatórios estão preenchidos.
 */
function verificarCamposObrigatorios() {
    const camposObrigatorios = document.querySelectorAll('.required-for-autosave');
    for (const campo of camposObrigatorios) {
        if (!campo.value.trim()) {
            return false;
        }
    }
    return true;
}

/**
 * Carrega a lista de supervisores do Firestore.
 */
async function loadSupervisores() {
    const select = document.getElementById('supervisor-nome');
    if (!select) return;
    select.innerHTML = '<option value="">Carregando...</option>';
    try {
        const supervisoresQuery = db.collection('usuarios')
            .where('funcoes', 'array-contains', 'supervisor')
            .where('inativo', '==', false);
        const querySnapshot = await supervisoresQuery.get();

        if (querySnapshot.empty) {
            select.innerHTML = '<option value="">Nenhum supervisor encontrado</option>';
            return;
        }

        let options = '<option value="">Selecione um supervisor</option>';
        const supervisores = [];
        querySnapshot.forEach(doc => supervisores.push(doc.data()));
        supervisores.sort((a, b) => a.nome.localeCompare(b.nome));

        supervisores.forEach(supervisor => {
            options += `<option value="${supervisor.uid}" data-nome="${supervisor.nome}">${supervisor.nome}</option>`;
        });
        select.innerHTML = options;
    } catch (error) {
        console.error("Erro ao carregar supervisores:", error);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

/**
 * Coleta os dados dos campos do formulário.
 */
function coletarDadosIniciais() {
    const supervisorSelect = document.getElementById('supervisor-nome');
    const selectedSupervisorOption = supervisorSelect.options[supervisorSelect.selectedIndex];
    const abordagem = document.getElementById('abordagem-teorica').value;
    const abordagemTexto = abordagem === 'Outra' ? document.getElementById('outra-abordagem-texto').value : abordagem;

    return {
        psicologoUid: user.uid,
        psicologoNome: document.getElementById('psicologo-nome').value,
        identificacaoGeral: { supervisorUid: selectedSupervisorOption.value, supervisorNome: selectedSupervisorOption.dataset.nome || '', dataSupervisao: document.getElementById('data-supervisao').value, dataInicioTerapia: document.getElementById('data-inicio-terapia').value, },
        identificacaoPsicologo: { periodo: document.getElementById('psicologo-periodo').value, abordagem: abordagemTexto, },
        identificacaoCaso: { iniciais: document.getElementById('paciente-iniciais').value.toUpperCase(), idade: document.getElementById('paciente-idade').value, genero: document.getElementById('paciente-genero').value, numSessoes: document.getElementById('paciente-sessoes').value, queixa: document.getElementById('queixa-demanda').value, },
        fase1: {}, fase2: {}, fase3: {}, observacoesFinais: {},
    };
}

/**
 * Lida com o clique do botão de salvar.
 */
async function handleFinalSave() {
    if (!verificarCamposObrigatorios()) {
        showLocalModal('Por favor, preencha todos os campos com asterisco (*).', 'error');
        return;
    }

    const saveButton = document.getElementById('btn-salvar-inicial');
    saveButton.disabled = true;
    saveButton.textContent = 'Salvando...';

    const formData = coletarDadosIniciais();
    const dadosIniciais = { ...formData, criadoEm: new Date(), lastUpdated: new Date() };

    try {
        const newDocRef = await db.collection("fichas-supervisao-casos").add(dadosIniciais);
        console.log("Ficha criada com o ID: ", newDocRef.id);

        showLocalModal(
            'Ficha salva com sucesso! Para editar, acesse a aba "Meus Acompanhamentos".',
            'success',
            () => { setupNovaFicha(); } // Esta função será executada quando o usuário clicar em "OK"
        );

    } catch (error) {
        console.error("Erro ao salvar a ficha:", error);
        showLocalModal(
            'Ocorreu um erro ao salvar a ficha. Tente novamente.',
            'error',
            () => { // Reabilita o botão para permitir nova tentativa
                saveButton.disabled = false;
                saveButton.textContent = 'Salvar Etapa Inicial';
            }
        );
    }
}

// --- INÍCIO DA ALTERAÇÃO ---
/**
 * Exibe um modal de notificação local.
 * @param {string} message - A mensagem a ser exibida no modal.
 * @param {'success' | 'error'} type - O tipo de modal ('success' ou 'error').
 * @param {function} [onCloseCallback] - Função a ser executada quando o modal for fechado.
 */
function showLocalModal(message, type = 'success', onCloseCallback) {
    const existingModal = document.getElementById('local-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'local-modal';
    modalOverlay.className = 'local-modal-overlay';

    const modalBox = document.createElement('div');
    modalBox.className = 'local-modal-box';
    modalBox.classList.add(type);

    const modalContent = document.createElement('div');
    modalContent.className = 'local-modal-content';
    modalContent.textContent = message;

    const modalActions = document.createElement('div');
    modalActions.className = 'local-modal-actions';

    const okButton = document.createElement('button');
    // Reutiliza a classe 'action-button' que já existe no design system
    okButton.className = 'action-button';
    okButton.textContent = 'OK';

    modalActions.appendChild(okButton);
    modalBox.appendChild(modalContent);
    modalBox.appendChild(modalActions);
    modalOverlay.appendChild(modalBox);

    document.body.appendChild(modalOverlay);

    const closeModal = () => {
        modalOverlay.remove();
        if (typeof onCloseCallback === 'function') {
            onCloseCallback();
        }
    };

    okButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
}