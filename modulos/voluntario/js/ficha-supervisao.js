let db, user, userData;

// Função Debounce para evitar salvamentos excessivos
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
            console.error("Formulário #form-supervisao não encontrado.");
            return;
        }
        setupInitialData();
        setupAutoSave();
        loadSupervisores();
    }, 0);
}

function setupInitialData() {
    document.getElementById('psicologo-nome').value = userData.nome || '';
    document.getElementById('fase1-data').valueAsDate = new Date();
    document.getElementById('data-supervisao').valueAsDate = new Date();
}

function setupAutoSave() {
    const form = document.getElementById('form-supervisao');
    const debouncedSave = debounce(autoSalvarFicha, 2000); // Salva 2 segundos após a última alteração
    form.addEventListener('input', debouncedSave);
    form.addEventListener('change', debouncedSave); // Para selects e datas
}

function verificarCamposObrigatorios() {
    const campos = document.querySelectorAll('.required-for-autosave');
    for (const campo of campos) {
        if (!campo.value) {
            return false; // Se qualquer campo obrigatório estiver vazio, retorna falso
        }
    }
    return true; // Todos os campos obrigatórios estão preenchidos
}

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

async function autoSalvarFicha() {
    const statusEl = document.getElementById('autosave-status');
    if (!verificarCamposObrigatorios()) {
        statusEl.className = 'status-message required-fields-notice';
        statusEl.textContent = 'Preencha todos os campos de Identificação para iniciar o salvamento automático.';
        return;
    }

    statusEl.className = 'status-message autosave-saving';
    statusEl.textContent = 'Salvando...';
    
    const supervisorSelect = document.getElementById('supervisor-nome');
    const selectedSupervisorOption = supervisorSelect.options[supervisorSelect.selectedIndex];
    const abordagem = document.getElementById('abordagem-teorica').value;
    const abordagemTexto = abordagem === 'Outra' ? document.getElementById('outra-abordagem-texto').value : abordagem;
    const docId = document.getElementById('document-id').value;

    const formData = {
        lastUpdated: new Date(),
        psicologoUid: user.uid,
        psicologoNome: document.getElementById('psicologo-nome').value,
        identificacaoGeral: {
            supervisorUid: selectedSupervisorOption.value,
            supervisorNome: selectedSupervisorOption.dataset.nome,
            dataSupervisao: document.getElementById('data-supervisao').value,
            dataInicioTerapia: document.getElementById('data-inicio-terapia').value,
        },
        identificacaoPsicologo: {
            periodo: document.getElementById('psicologo-periodo').value,
            abordagem: abordagemTexto,
        },
        identificacaoCaso: {
            iniciais: document.getElementById('paciente-iniciais').value.toUpperCase(),
            idade: document.getElementById('paciente-idade').value,
            genero: document.getElementById('paciente-genero').value,
            numSessoes: document.getElementById('paciente-sessoes').value,
            queixa: document.getElementById('queixa-demanda').value,
        },
        fase1: {
            data: document.getElementById('fase1-data').value,
            foco: document.getElementById('fase1-foco').value,
            objetivos: document.getElementById('fase1-objetivos').value,
            hipoteses: document.getElementById('fase1-hipoteses').value,
        },
        fase2: {
            data: document.getElementById('fase2-data').value,
            reavaliacao: document.getElementById('fase2-reavaliacao').value,
            progresso: document.getElementById('fase2-progresso').value,
        },
        fase3: {
            data: document.getElementById('fase3-data').value,
            avaliacao: document.getElementById('fase3-avaliacao').value,
            mudancas: document.getElementById('fase3-mudancas').value,
        },
        observacoesFinais: {
            desfecho: document.getElementById('desfecho').value,
            dataDesfecho: document.getElementById('data-desfecho').value,
            observacoes: document.getElementById('obs-finais').value,
        },
        supervisorFields: {
            fase1_obs: "", fase2_obs: "", fase3_obs: "",
            finais_obs: "", assinatura: ""
        }
    };

    try {
        if (docId) {
            // Se já existe um ID, atualiza o documento existente
            await db.collection("fichas-supervisao-casos").doc(docId).set(formData, { merge: true });
        } else {
            // Se não existe ID, cria um novo documento
            const newDocRef = await db.collection("fichas-supervisao-casos").add(formData);
            document.getElementById('document-id').value = newDocRef.id; // Armazena o novo ID
        }
        statusEl.className = 'status-message autosave-success';
        statusEl.textContent = 'Salvo ✓';
    } catch (error) {
        console.error("Erro no salvamento automático:", error);
        statusEl.className = 'status-message required-fields-notice';
        statusEl.textContent = 'Erro ao salvar!';
    }
}