let db, user, userData, navigateToTab;
let todasAsFichas = [];

// A função init agora garante que o HTML esteja pronto antes de executar
export function init(dbRef, userRef, userDataRef, param, navigationFunc) {
    setTimeout(() => {
        db = dbRef;
        user = userRef;
        userData = userDataRef;
        navigateToTab = navigationFunc;

        console.log("Módulo Meus Acompanhamentos inicializado.");
        carregarFichas();
    }, 0); // O timeout de 0ms atrasa a execução o suficiente para o DOM carregar
}

async function carregarFichas() {
    const container = document.getElementById('lista-fichas-container');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const q = db.collection("fichas-supervisao-casos")
            .where("psicologoUid", "==", user.uid);
        
        const querySnapshot = await q.get();
        todasAsFichas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (todasAsFichas.length > 0) {
            todasAsFichas.sort((a, b) => {
                const dateA = a.criadoEm && a.criadoEm.toDate ? a.criadoEm.toDate() : new Date(0);
                const dateB = b.criadoEm && b.criadoEm.toDate ? b.criadoEm.toDate() : new Date(0);
                return dateB - dateA;
            });
        }

        renderizarLista(todasAsFichas);
        popularFiltroPacientes(todasAsFichas);

        const filtroSelect = document.getElementById('filtro-paciente');
        filtroSelect.removeEventListener('change', aplicarFiltro);
        filtroSelect.addEventListener('change', aplicarFiltro);

    } catch (error) {
        console.error("Erro ao carregar fichas:", error);
        container.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao buscar seus acompanhamentos.</p>';
    }
}

function popularFiltroPacientes(fichas) {
    const filtroSelect = document.getElementById('filtro-paciente');
    if (!filtroSelect) return;
    const iniciaisPacientes = [...new Set(fichas.map(ficha => ficha.identificacaoCaso.iniciais))];
    iniciaisPacientes.sort();
    filtroSelect.innerHTML = '<option value="todos">Todos os Pacientes</option>';
    iniciaisPacientes.forEach(iniciais => {
        if (iniciais) {
            const option = document.createElement('option');
            option.value = iniciais;
            option.textContent = iniciais;
            filtroSelect.appendChild(option);
        }
    });
}

function aplicarFiltro() {
    const filtroSelect = document.getElementById('filtro-paciente');
    const valorSelecionado = filtroSelect.value;
    if (valorSelecionado === 'todos') {
        renderizarLista(todasAsFichas);
    } else {
        const fichasFiltradas = todasAsFichas.filter(ficha => ficha.identificacaoCaso.iniciais === valorSelecionado);
        renderizarLista(fichasFiltradas);
    }
}

function renderizarLista(fichas) {
    const container = document.getElementById('lista-fichas-container');
    if (!container) return;
    container.innerHTML = '';
    if (fichas.length === 0) {
        container.innerHTML = '<p class="no-fichas-message">Nenhum acompanhamento encontrado.</p>';
        return;
    }
    fichas.forEach(ficha => {
        const dataSupervisao = ficha.identificacaoGeral.dataSupervisao;
        const dataFormatada = dataSupervisao ? new Date(dataSupervisao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
        const itemEl = document.createElement('div');
        itemEl.className = 'ficha-item';
        itemEl.dataset.id = ficha.id;
        itemEl.innerHTML = `
            <div class="ficha-item-col"><p class="label">Paciente</p><p class="value paciente">${ficha.identificacaoCaso.iniciais || 'N/A'}</p></div>
            <div class="ficha-item-col"><p class="label">Supervisor(a)</p><p class="value">${ficha.identificacaoGeral.supervisorNome || 'N/A'}</p></div>
            <div class="ficha-item-col"><p class="label">Data da Supervisão</p><p class="value">${dataFormatada}</p></div>
        `;
        
        itemEl.addEventListener('click', () => {
            if (navigateToTab) {
                navigateToTab('ficha-supervisao', ficha.id);
            }
        });

        container.appendChild(itemEl);
    });
}