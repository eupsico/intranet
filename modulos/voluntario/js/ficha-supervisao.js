// eupsico/intranet/modulos/voluntario/js/ficha-supervisao.js

// Declaração das variáveis que serão usadas pelo módulo
let db, user, userData;
let isRedirecting = false; // Flag para controlar o redirecionamento

/**
 * Função de Debounce: Atraso na execução para não sobrecarregar o servidor.
 */
function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Função Principal (INIT): Chamada ao abrir a aba "Ficha de Supervisão".
 * Prepara um formulário limpo para um NOVO acompanhamento.
 */
export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;

    // Garante que o HTML esteja pronto antes de manipular os elementos
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
    isRedirecting = false; // Reseta a flag de redirecionamento
    document.getElementById('form-supervisao').reset();
    document.getElementById('psicologo-nome').value = userData.nome || '';

    document.getElementById('document-id').value = ''; // Limpa o ID de qualquer ficha anterior
    const outraContainer = document.getElementById('outra-abordagem-container');
    if (outraContainer) outraContainer.style.display = 'none';
    loadSupervisores();
}

/**
 * Adiciona os listeners de eventos ao formulário (salvamento automático, etc.).
 */
function setupEventListeners() {
    const form = document.getElementById('form-supervisao');
    const abordagemSelect = document.getElementById('abordagem-teorica');
    // A função de auto-salvar agora só precisa criar a ficha e redirecionar
    const debouncedCreateAndRedirect = debounce(criarFichaERedirecionar, 2000);

    form.addEventListener('input', debouncedCreateAndRedirect);
    form.addEventListener('change', debouncedCreateAndRedirect);
    
    if (abordagemSelect) {
        abordagemSelect.addEventListener('change', (event) => {
            const outraContainer = document.getElementById('outra-abordagem-container');
            if(outraContainer) outraContainer.style.display = (event.target.value === 'Outra') ? 'block' : 'none';
        });
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
 * Cria a ficha no Firestore e redireciona para a página de acompanhamentos.
 */
async function criarFichaERedirecionar() {
    const statusEl = document.getElementById('autosave-status');
    if (!statusEl || isRedirecting) return; // Se já estiver redirecionando, não faz nada

    if (!verificarCamposObrigatorios()) {
        return;
    }

    isRedirecting = true; // Ativa a flag para evitar execuções múltiplas

    
    const supervisorSelect = document.getElementById('supervisor-nome');
    const selectedSupervisorOption = supervisorSelect.options[supervisorSelect.selectedIndex];
    const abordagem = document.getElementById('abordagem-teorica').value;
    const abordagemTexto = abordagem === 'Outra' ? document.getElementById('outra-abordagem-texto').value : abordagem;

    const formData = {
        criadoEm: new Date(),
        lastUpdated: new Date(),
        psicologoUid: user.uid,
        psicologoNome: document.getElementById('psicologo-nome').value,
        identificacaoGeral: { supervisorUid: selectedSupervisorOption.value, supervisorNome: selectedSupervisorOption.dataset.nome, dataSupervisao: document.getElementById('data-supervisao').value, dataInicioTerapia: document.getElementById('data-inicio-terapia').value, },
        identificacaoPsicologo: { periodo: document.getElementById('psicologo-periodo').value, abordagem: abordagemTexto, },
        identificacaoCaso: { iniciais: document.getElementById('paciente-iniciais').value.toUpperCase(), idade: document.getElementById('paciente-idade').value, genero: document.getElementById('paciente-genero').value, numSessoes: document.getElementById('paciente-sessoes').value, queixa: document.getElementById('queixa-demanda').value, },
        fase1: { data: document.getElementById('fase1-data').value, foco: document.getElementById('fase1-foco').value, objetivos: document.getElementById('fase1-objetivos').value, hipoteses: document.getElementById('fase1-hipoteses').value },
        fase2: { data: document.getElementById('fase2-data').value, reavaliacao: document.getElementById('fase2-reavaliacao').value, progresso: document.getElementById('fase2-progresso').value },
        fase3: { data: document.getElementById('fase3-data').value, avaliacao: document.getElementById('fase3-avaliacao').value, mudancas: document.getElementById('fase3-mudancas').value },
        observacoesFinais: { desfecho: document.getElementById('desfecho').value, dataDesfecho: document.getElementById('data-desfecho').value, observacoes: document.getElementById('obs-finais').value },
    };

    try {
        const newDocRef = await db.collection("fichas-supervisao-casos").add(formData);
        console.log("Ficha criada com o ID: ", newDocRef.id);

        // Dispara o evento de navegação customizado que o app.js escuta
        // ATENÇÃO: Verifique se 'fichas-preenchidas' é o ID correto do link no seu HTML
        const event = new CustomEvent('navigateTo', { detail: { pageId: 'fichas-preenchidas' } });
        window.dispatchEvent(event);

    } catch (error) {
        console.error("Erro ao criar a ficha:", error);
        statusEl.textContent = 'Erro ao criar a ficha!';
        statusEl.style.color = '#a94442'; // Vermelho
        isRedirecting = false; // Libera a flag em caso de erro
    }
}