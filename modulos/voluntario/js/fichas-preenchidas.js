// eupsico/intranet/modulos/voluntario/js/fichas-preenchidas.js

let db, user, userData;
let todasAsFichas = [];

export function init(dbRef, userRef, userDataRef) {
    setTimeout(() => {
        db = dbRef;
        user = userRef;
        userData = userDataRef;
        carregarFichas();
    }, 0);
}

function alternarVisao(mostrar) {
    const listaView = document.getElementById('lista-view-container');
    const formView = document.getElementById('form-view-container');
    if (!listaView || !formView) return;

    if (mostrar === 'lista') {
        listaView.style.display = 'block';
        formView.style.display = 'none';
        formView.innerHTML = ''; // Limpa o container do formulário ao voltar para a lista
    } else {
        listaView.style.display = 'none';
        formView.style.display = 'block';
    }
}

async function carregarFichas() {
    alternarVisao('lista');
    const container = document.getElementById('lista-fichas-container');
    container.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const q = db.collection("fichas-supervisao-casos").where("psicologoUid", "==", user.uid);
        const querySnapshot = await q.get();
        todasAsFichas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (todasAsFichas.length > 0) {
            todasAsFichas.sort((a, b) => (b.criadoEm?.toDate() || 0) - (a.criadoEm?.toDate() || 0));
        }
        renderizarLista(todasAsFichas);
        popularFiltroPacientes(todasAsFichas);
        document.getElementById('filtro-paciente').addEventListener('change', aplicarFiltro);
    } catch (error) {
        console.error("Erro ao carregar fichas:", error);
        container.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao buscar seus acompanhamentos.</p>';
    }
}

function renderizarLista(fichas) {
    const container = document.getElementById('lista-fichas-container');
    container.innerHTML = '';
    if (fichas.length === 0) {
        container.innerHTML = '<p class="no-fichas-message">Nenhum acompanhamento encontrado.</p>';
        return;
    }
    fichas.forEach(ficha => {
        const dataFormatada = ficha.identificacaoGeral.dataSupervisao ? new Date(ficha.identificacaoGeral.dataSupervisao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
        const itemEl = document.createElement('div');
        itemEl.className = 'ficha-item';
        itemEl.innerHTML = `
            <div class="ficha-item-col"><p class="label">Paciente</p><p class="value paciente">${ficha.identificacaoCaso.iniciais || 'N/A'}</p></div>
            <div class="ficha-item-col"><p class="label">Supervisor(a)</p><p class="value">${ficha.identificacaoGeral.supervisorNome || 'N/A'}</p></div>
            <div class="ficha-item-col"><p class="label">Data da Supervisão</p><p class="value">${dataFormatada}</p></div>
        `;
        itemEl.addEventListener('click', () => abrirFormularioParaEdicao(ficha.id));
        container.appendChild(itemEl);
    });
}

async function abrirFormularioParaEdicao(docId) {
    alternarVisao('form');
    const formContainer = document.getElementById('form-view-container');
    formContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch('../page/editar-ficha.html');
        if (!response.ok) throw new Error('Falha ao carregar o HTML do formulário de edição.');
        formContainer.innerHTML = await response.text();
        
        console.log('[FICHAS-PREENCHIDAS] HTML do formulário de edição carregado.');
        
        await preencherEConfigurarFormularioDeEdicao(docId);

        const backButton = document.getElementById('btn-voltar-para-lista');
        if (backButton) { 
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                alternarVisao('lista');
            });
        }

    } catch (error) {
        console.error("Erro ao abrir formulário para edição:", error);
        formContainer.innerHTML = '<p class="alert alert-error">Não foi possível carregar o formulário de edição.</p>';
    }
}

async function preencherEConfigurarFormularioDeEdicao(docId) {
    const docRef = db.collection('fichas-supervisao-casos').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        throw new Error("Documento da ficha não encontrado no Firestore.");
    }
    const data = docSnap.data();

    // Funções auxiliares
    const loadSupervisores = async () => {
        const select = document.getElementById('supervisor-nome');
        if (!select) return;
        select.innerHTML = '<option value="">Carregando...</option>';
        try {
            const supervisoresQuery = db.collection('usuarios').where('funcoes', 'array-contains', 'supervisor').where('inativo', '==', false);
            const querySnapshot = await supervisoresQuery.get();
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
    };

    const setFieldValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

    // Preenchimento dos campos
    await loadSupervisores();
    
    setFieldValue('supervisor-nome', data.identificacaoGeral?.supervisorUid);
    setFieldValue('data-supervisao', data.identificacaoGeral?.dataSupervisao);
    setFieldValue('data-inicio-terapia', data.identificacaoGeral?.dataInicioTerapia);
    setFieldValue('psicologo-nome', data.psicologoNome);
    setFieldValue('psicologo-periodo', data.identificacaoPsicologo?.periodo);
    setFieldValue('abordagem-teorica', data.identificacaoPsicologo?.abordagem);
    setFieldValue('paciente-iniciais', data.identificacaoCaso?.iniciais);
    setFieldValue('paciente-idade', data.identificacaoCaso?.idade);
    setFieldValue('paciente-genero', data.identificacaoCaso?.genero);
    setFieldValue('paciente-sessoes', data.identificacaoCaso?.numSessoes);
    setFieldValue('queixa-demanda', data.identificacaoCaso?.queixa);
    setFieldValue('fase1-data', data.fase1?.data);
    setFieldValue('fase1-foco', data.fase1?.foco);
    setFieldValue('fase1-objetivos', data.fase1?.objetivos);
    setFieldValue('fase1-hipoteses', data.fase1?.hipoteses);
    setFieldValue('fase1-obs-supervisor', data.fase1?.obsSupervisor);
    setFieldValue('fase2-data', data.fase2?.data);
    setFieldValue('fase2-reavaliacao', data.fase2?.reavaliacao);
    setFieldValue('fase2-progresso', data.fase2?.progresso);
    setFieldValue('fase2-obs-supervisor', data.fase2?.obsSupervisor);
    setFieldValue('fase3-data', data.fase3?.data);
    setFieldValue('fase3-avaliacao', data.fase3?.avaliacao);
    setFieldValue('fase3-mudancas', data.fase3?.mudancas);
    setFieldValue('fase3-obs-supervisor', data.fase3?.obsSupervisor);
    setFieldValue('desfecho', data.observacoesFinais?.desfecho);
    setFieldValue('data-desfecho', data.observacoesFinais?.dataDesfecho);
    setFieldValue('obs-finais', data.observacoesFinais?.obsFinais);
    setFieldValue('obs-finais-supervisor', data.observacoesFinais?.obsSupervisor);
    setFieldValue('assinatura-supervisor', data.observacoesFinais?.assinaturaSupervisor);
    
    console.log("Formulário preenchido com sucesso.");

    // --- INÍCIO DA ALTERAÇÃO (PASSO 3) ---
    setupAutoSave(docRef); 
    // --- FIM DA ALTERAÇÃO (PASSO 3) ---
}

// --- INÍCIO DAS NOVAS FUNÇÕES (PASSO 3) ---
function setupAutoSave(docRef) {
    const form = document.getElementById('form-supervisao');
    const statusEl = document.getElementById('autosave-status');
    let saveTimeout;

    const getFormData = () => {
        const supervisorSelect = document.getElementById('supervisor-nome');
        const selectedOption = supervisorSelect.options[supervisorSelect.selectedIndex];
        
        return {
            lastUpdated: new Date(),
            identificacaoGeral: {
                supervisorUid: document.getElementById('supervisor-nome').value,
                supervisorNome: selectedOption.dataset.nome || '',
                dataSupervisao: document.getElementById('data-supervisao').value,
                dataInicioTerapia: document.getElementById('data-inicio-terapia').value,
            },
            identificacaoPsicologo: {
                periodo: document.getElementById('psicologo-periodo').value,
                abordagem: document.getElementById('abordagem-teorica').value,
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
                obsFinais: document.getElementById('obs-finais').value,
            }
        };
    };

    const handleFormChange = () => {
        clearTimeout(saveTimeout);
        statusEl.textContent = 'Salvando...';
        statusEl.style.color = '#007bff';

        saveTimeout = setTimeout(async () => {
            const dataToSave = getFormData();
            try {
                await docRef.update(dataToSave);
                statusEl.textContent = 'Salvo!';
                statusEl.style.color = '#28a745';
            } catch (error) {
                console.error("Erro no salvamento automático:", error);
                statusEl.textContent = 'Erro ao salvar.';
                statusEl.style.color = '#dc3545';
            }
        }, 1500); // Aguarda 1.5 segundos após a última alteração para salvar
    };

    form.addEventListener('change', handleFormChange);
    form.addEventListener('keyup', handleFormChange);
}
// --- FIM DAS NOVAS FUNÇÕES (PASSO 3) ---

function popularFiltroPacientes(fichas) {
    const filtroSelect = document.getElementById('filtro-paciente');
    const iniciais = [...new Set(fichas.map(f => f.identificacaoCaso.iniciais))].sort();
    filtroSelect.innerHTML = '<option value="todos">Todos os Pacientes</option>';
    iniciais.forEach(i => {
        if (i) filtroSelect.innerHTML += `<option value="${i}">${i}</option>`;
    });
}

function aplicarFiltro() {
    const valor = document.getElementById('filtro-paciente').value;
    const fichasFiltradas = (valor === 'todos') ? todasAsFichas : todasAsFichas.filter(f => f.identificacaoCaso.iniciais === valor);
    renderizarLista(fichasFiltradas);
}