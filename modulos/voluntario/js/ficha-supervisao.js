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
    const debouncedSave = debounce(autoSalvarFicha, 2000);
    form.addEventListener('input', debouncedSave);
    form.addEventListener('change', debouncedSave);
}

function verificarCamposObrigatorios() {
    const campos = document.querySelectorAll('.required-for-autosave');
    for (const campo of campos) {
        if (!campo.value.trim()) { // .trim() para não aceitar só espaços
            return false;
        }
    }
    return true;
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

// ===== FUNÇÃO DE SALVAMENTO AUTOMÁTICO ATUALIZADA =====
async function autoSalvarFicha() {
    const statusEl = document.getElementById('autosave-status');
    if (!statusEl) return;

    // Se os campos obrigatórios não estiverem preenchidos, não faz nada.
    // O aviso agora é estático (asteriscos e texto no parágrafo).
    if (!verificarCamposObrigatorios()) {
        statusEl.textContent = ''; // Limpa qualquer status anterior
        return;
    }

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = '#31708f'; // Azul
    
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
        fase1: { data: document.getElementById('fase1-data').value, foco: document.getElementById('fase1-foco').value, objetivos: document.getElementById('fase1-objetivos').value, hipoteses: document.getElementById('fase1-hipoteses').value },
        fase2: { data: document.getElementById('fase2-data').value, reavaliacao: document.getElementById('fase2-reavaliacao').value, progresso: document.getElementById('fase2-progresso').value },
        fase3: { data: document.getElementById('fase3-data').value, avaliacao: document.getElementById('fase3-avaliacao').value, mudancas: document.getElementById('fase3-mudancas').value },
        observacoesFinais: { desfecho: document.getElementById('desfecho').value, dataDesfecho: document.getElementById('data-desfecho').value, observacoes: document.getElementById('obs-finais').value },
        supervisorFields: { fase1_obs: "", fase2_obs: "", fase3_obs: "", finais_obs: "", assinatura: "" }
    };

    try {
        if (docId) {
            await db.collection("fichas-supervisao-casos").doc(docId).set(formData, { merge: true });
        } else {
            const newDocRef = await db.collection("fichas-supervisao-casos").add(formData);
            document.getElementById('document-id').value = newDocRef.id;
        }
        statusEl.textContent = 'Salvo ✓';
        statusEl.style.color = '#3c763d'; // Verde
    } catch (error) {
        console.error("Erro no salvamento automático:", error);
        statusEl.textContent = 'Erro ao salvar!';
        statusEl.style.color = '#a94442'; // Vermelho
    } finally {
        // Limpa a mensagem de status após alguns segundos
        setTimeout(() => {
            if (statusEl.textContent !== 'Salvando...') {
                statusEl.textContent = '';
            }
        }, 3000);
    }
}