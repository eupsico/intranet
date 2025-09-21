let db, user, userData;
let todasAsFichas = []; // Armazena todas as fichas carregadas

export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;

    console.log("Módulo Meus Acompanhamentos inicializado.");
    carregarFichas();
}

async function carregarFichas() {
    const container = document.getElementById('lista-fichas-container');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const q = db.collection("fichas-supervisao-casos")
            .where("psicologoUid", "==", user.uid)
            .orderBy("criadoEm", "desc");
        
        const querySnapshot = await q.get();
        todasAsFichas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        renderizarLista(todasAsFichas);
        popularFiltroPacientes(todasAsFichas);

        // Adiciona o listener para o filtro
        const filtroSelect = document.getElementById('filtro-paciente');
        filtroSelect.addEventListener('change', aplicarFiltro);

    } catch (error) {
        console.error("Erro ao carregar fichas de supervisão:", error);
        container.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao buscar seus acompanhamentos. Tente novamente mais tarde.</p>';
    }
}

function popularFiltroPacientes(fichas) {
    const filtroSelect = document.getElementById('filtro-paciente');
    if (!filtroSelect) return;

    // Extrai as iniciais únicas dos pacientes
    const iniciaisPacientes = [...new Set(fichas.map(ficha => ficha.identificacaoCaso.iniciais))];
    iniciaisPacientes.sort(); // Ordena alfabeticamente

    // Limpa opções antigas (exceto a primeira "Todos")
    filtroSelect.innerHTML = '<option value="todos">Todos os Pacientes</option>';

    iniciaisPacientes.forEach(iniciais => {
        if (iniciais) { // Garante que não adicione opções vazias
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

    container.innerHTML = ''; // Limpa a lista atual

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
            <div class="ficha-item-col">
                <p class="label">Paciente</p>
                <p class="value paciente">${ficha.identificacaoCaso.iniciais || 'N/A'}</p>
            </div>
            <div class="ficha-item-col">
                <p class="label">Supervisor(a)</p>
                <p class="value">${ficha.identificacaoGeral.supervisorNome || 'N/A'}</p>
            </div>
            <div class="ficha-item-col">
                <p class="label">Data da Supervisão</p>
                <p class="value">${dataFormatada}</p>
            </div>
        `;
        
        // Adiciona evento de clique para (futuramente) abrir e editar a ficha
        itemEl.addEventListener('click', () => {
            console.log(`Clicou na ficha com ID: ${ficha.id}`);
            alert(`FUNCIONALIDADE EM DESENVOLVIMENTO:\n\nVocê clicou na ficha do paciente ${ficha.identificacaoCaso.iniciais}.\nID do Documento: ${ficha.id}`);
            // No futuro, podemos fazer isso navegar de volta para a aba da ficha,
            // carregando os dados deste ID.
        });

        container.appendChild(itemEl);
    });
}