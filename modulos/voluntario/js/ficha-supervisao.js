// eupsico/intranet/modulos/voluntario/js/ficha-supervisao.js

let db, user, userData;

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;

    setTimeout(() => {
        const form = document.getElementById('form-supervisao');
        if (!form) {
            console.error("Erro Crítico: Formulário #form-supervisao não foi encontrado.");
            return;
        }
        setupNovaFicha();
        setupEventListeners();
    }, 0);
}

function setupNovaFicha() {
    const form = document.getElementById('form-supervisao');
    if(form) form.reset();

    document.getElementById('psicologo-nome').value = userData.nome || '';
    document.getElementById('data-supervisao').valueAsDate = new Date();
    document.getElementById('document-id').value = '';
    
    const outraContainer = document.getElementById('outra-abordagem-container');
    if (outraContainer) outraContainer.style.display = 'none';

    // Garante que o botão de salvar esteja visível
    const saveButton = document.getElementById('btn-salvar-inicial');
    if(saveButton) saveButton.disabled = false;

    loadSupervisores();
}

function setupEventListeners() {
    const form = document.getElementById('form-supervisao');
    const abordagemSelect = document.getElementById('abordagem-teorica');
    const saveButton = document.getElementById('btn-salvar-inicial');

    const debouncedAutoSave = debounce(autoSalvarFichaInicial, 1500);

    form.addEventListener('input', debouncedAutoSave);
    form.addEventListener('change', debouncedAutoSave);
    
    if (abordagemSelect) {
        abordagemSelect.addEventListener('change', (event) => {
            const outraContainer = document.getElementById('outra-abordagem-container');
            if (outraContainer) outraContainer.style.display = (event.target.value === 'Outra') ? 'block' : 'none';
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', handleFinalSave);
    }
}

function verificarCamposObrigatorios() {
    const camposObrigatorios = document.querySelectorAll('.required-for-autosave');
    for (const campo of camposObrigatorios) {
        if (!campo.value.trim()) return false;
    }
    return true;
}

async function loadSupervisores(selectedSupervisorId = null) {
    const select = document.getElementById('supervisor-nome');
    select.innerHTML = '<option value="">Carregando...</option>';
    try {
        const querySnapshot = await db.collection('usuarios')
            .where('funcoes', 'array-contains', 'supervisor')
            .where('inativo', '==', false)
            .get();

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
        if (selectedSupervisorId) select.value = selectedSupervisorId;
    } catch (error) {
        console.error("Erro ao carregar supervisores:", error);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

// Função que coleta apenas os dados da parte inicial do formulário
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
        // As fases futuras são inicializadas como vazias para garantir que os campos existam no DB
        fase1: {}, fase2: {}, fase3: {}, observacoesFinais: {},
    };
}


async function autoSalvarFichaInicial() {
    if (!verificarCamposObrigatorios()) return;

    const statusEl = document.getElementById('autosave-status');
    statusEl.textContent = 'Salvando...';
    
    const docId = document.getElementById('document-id').value;
    const formData = coletarDadosIniciais();

    try {
        if (docId) {
            // Se já tem ID, atualiza (merge para não apagar as fases futuras)
            await db.collection("fichas-supervisao-casos").doc(docId).set({ ...formData, lastUpdated: new Date() }, { merge: true });
        } else {
            // Se não tem ID, cria um novo documento
            const dadosIniciais = { ...formData, criadoEm: new Date(), lastUpdated: new Date() };
            const newDocRef = await db.collection("fichas-supervisao-casos").add(dadosIniciais);
            document.getElementById('document-id').value = newDocRef.id;
        }
        statusEl.textContent = 'Rascunho salvo ✓';
    } catch (error) {
        console.error("Erro no salvamento automático:", error);
        statusEl.textContent = 'Erro ao salvar!';
    }
}

async function handleFinalSave() {
    if (!verificarCamposObrigatorios()) {
        alert("Por favor, preencha os campos obrigatórios (Supervisor e Iniciais do Paciente).");
        return;
    }

    const saveButton = document.getElementById('btn-salvar-inicial');
    saveButton.disabled = true; // Desabilita o botão para evitar cliques duplos

    await autoSalvarFichaInicial(); // Garante que a última versão foi salva

    // Exibe a mensagem de sucesso
    alert("A ficha foi salva em Meus Acompanhamentos. Acesse essa aba para completar o preenchimento.");

    // Reseta o formulário para uma nova ficha
    setupNovaFicha();
}