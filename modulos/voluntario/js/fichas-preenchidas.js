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
        formView.innerHTML = '';
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

// ===== FUNÇÃO CORRIGIDA =====
async function abrirFormularioParaEdicao(docId) {
    alternarVisao('form');
    const formContainer = document.getElementById('form-view-container');
    formContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch('../page/editar-ficha.html');
        if (!response.ok) throw new Error('Falha ao carregar o HTML do formulário de edição.');
        formContainer.innerHTML = await response.text();

        // A CORREÇÃO ESTÁ AQUI: Envolvemos a manipulação do novo HTML em um setTimeout
        setTimeout(async () => {
            try {
                const formModule = await import('./ficha-supervisao.js');
                if (formModule.preencherFormularioExistente) {
                    await formModule.preencherFormularioExistente(docId, db, user, userData);
                }

                const backButton = document.getElementById('btn-voltar-para-lista');
                if (backButton) {
                    backButton.addEventListener('click', () => {
                        alternarVisao('lista');
                    });
                } else {
                     console.error('Botão "Voltar" não encontrado no HTML carregado.');
                }
            } catch (moduleError) {
                console.error("Erro ao inicializar o módulo do formulário:", moduleError);
                formContainer.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao preparar o formulário.</p>';
            }
        }, 0);

    } catch (error) {
        console.error("Erro ao abrir formulário para edição:", error);
        formContainer.innerHTML = '<p class="alert alert-error">Não foi possível carregar o formulário de edição.</p>';
    }
}

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