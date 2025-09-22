// eupsico/intranet/modulos/voluntario/js/ficha-supervisao.js

let db, user, userData;

/**
 * Função Principal (INIT): Chamada ao abrir a aba "Ficha de Supervisão".
 * Prepara um formulário limpo para um NOVO acompanhamento.
 */
export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;

    setTimeout(() => {
        const form = document.getElementById('form-supervisao');
        if (!form) {
            console.error("Erro Crítico: O formulário #form-supervisao não foi encontrado na página.");
            return;
        }
        setupNovaFicha();
        setupEventListeners();
    }, 0);
}

/**
 * Prepara o formulário para uma nova entrada de dados.
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

    // Limpa mensagens de erro/sucesso anteriores
    mostrarMensagemErro('', false);
    mostrarMensagemSucesso('', false);
    
    loadSupervisores();
}

/**
 * Adiciona os listeners de eventos ao formulário.
 */
function setupEventListeners() {
    const saveButton = document.getElementById('btn-salvar-inicial');
    if (saveButton) {
        saveButton.addEventListener('click', handleFinalSave);
    }
}

/**
 * Verifica se os campos mínimos para a criação da ficha foram preenchidos.
 * @returns {boolean}
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
 * Carrega a lista de supervisores do Firestore e popula o select.
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
 * @returns {object}
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
        fase1: {}, fase2: {}, fase3: {}, observacoesFinais: {}, // Campos para preenchimento futuro
    };
}

/**
 * Lida com o clique final do botão de salvar.
 */
async function handleFinalSave() {
    // 1. Limpa mensagens antigas
    mostrarMensagemErro('', false);
    mostrarMensagemSucesso('', false);

    // 2. Valida os campos obrigatórios
    if (!verificarCamposObrigatorios()) {
        mostrarMensagemErro('Por favor, preencha todos os campos com asterisco (*).');
        return;
    }

    const saveButton = document.getElementById('btn-salvar-inicial');
    saveButton.disabled = true;
    saveButton.textContent = 'Salvando...';

    const formData = coletarDadosIniciais();
    const dadosIniciais = { ...formData, criadoEm: new Date(), lastUpdated: new Date() };

    try {
        // 3. Salva os dados no banco de dados
        const newDocRef = await db.collection("fichas-supervisao-casos").add(dadosIniciais);
        console.log("Ficha criada com o ID: ", newDocRef.id);

        // 4. Mostra a mensagem de sucesso e limpa o formulário
        mostrarMensagemSucesso('Ficha salva! Para editar, acesse a aba "Meus Acompanhamentos".');
        setTimeout(setupNovaFicha, 3000); // Limpa o formulário após 3 segundos

    } catch (error) {
        console.error("Erro ao salvar a ficha:", error);
        mostrarMensagemErro('Ocorreu um erro ao salvar a ficha. Tente novamente.');
    } finally {
        // 5. Reabilita o botão
        saveButton.disabled = false;
        saveButton.textContent = 'Salvar Etapa Inicial';
    }
}

/**
 * Mostra ou esconde a mensagem de sucesso.
 * @param {string} text - O texto a ser exibido.
 * @param {boolean} [show=true] - Se deve mostrar ou esconder.
 */
function mostrarMensagemSucesso(text, show = true) {
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
        successMessage.textContent = text;
        successMessage.style.display = show ? 'block' : 'none';
    }
}

/**
 * Mostra ou esconde a mensagem de erro.
 * @param {string} text - O texto a ser exibido.
 * @param {boolean} [show=true] - Se deve mostrar ou esconder.
 */
function mostrarMensagemErro(text, show = true) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = text;
        errorMessage.style.display = show ? 'block' : 'none';
    }
}